# app/api/routes_events.py
from __future__ import annotations
from datetime import datetime
from typing import Optional

from .. import models

from ..core import auth
from fastapi import APIRouter, Depends, HTTPException, Query, Body, Response
from sqlalchemy import select, and_, or_, func
from sqlalchemy.orm import Session

from ..db.database import get_db
from ..db import schemas
from ..models.event import Event, UserEvent
from ..db.schemas import EventOut, EventDetail, RSVPIn, RSVPOut
from ..core.http_client import get_http
from ..services.events_import import (
    import_events_all, import_events_for_university, build_event_ics, discover_sources
)

router = APIRouter(prefix="/events", tags=["events"])

def assign_event_to_universities(title: str, description: str, organizer: str, location: str) -> list[str]:
    """Przypisz wydarzenie książkowe do odpowiednich uczelni na podstawie treści"""
    text = f"{title} {description} {organizer} {location}".lower()
    
    # Słowa kluczowe dla każdej uczelni
    university_keywords = {
        "Akademia Górniczo-Hutnicza": [
            "agh", "górnictwo", "hutnictwo", "inżynieria", "technologia", "matematyka", "fizyka", 
            "informatyka", "automatyka", "energetyka", "materiały", "geologia", "geofizyka"
        ],
        "Uniwersytet Jagielloński": [
            "uj", "jagielloński", "medycyna", "prawo", "farmacja", "biologia", "chemia", 
            "psychologia", "historia", "filozofia", "literatura", "nauki polityczne"
        ],
        "Politechnika Krakowska": [
            "pk", "politechnika", "architektura", "budownictwo", "mechanika", "elektrotechnika", 
            "inżynieria", "matematyka", "fizyka", "chemia"
        ],
        "Uniwersytet Ekonomiczny": [
            "uek", "ekonomiczny", "ekonomia", "finanse", "zarządzanie", "marketing", 
            "biznes", "przedsiębiorczość", "statystyka"
        ],
        "Akademia Muzyczna im. Krzysztofa Pendereckiego": [
            "muzyczna", "muzyka", "kompozycja", "dyrygentura", "instrumentalny", "wokalny", 
            "jazz", "muzykologia", "teoria muzyki"
        ],
        "Akademia Sztuk Pięknych im. Jana Matejki": [
            "asp", "sztuki piękne", "sztuka", "malarstwo", "rzeźba", "grafika", "architektura", 
            "historia sztuki", "konserwacja"
        ],
        "Akademia Sztuk Teatralnych im. Stanisława Wyspiańskiego": [
            "ast", "teatralna", "teatr", "aktorstwo", "reżyseria", "dramat", "scenografia", 
            "historia teatru", "dramaturgia"
        ],
        "Akademia Wychowania Fizycznego im. Bronisława Czecha": [
            "awf", "wychowanie fizyczne", "sport", "fitness", "rehabilitacja", "fizjoterapia", 
            "medycyna sportowa", "biomechanika"
        ],
        "Uniwersytet Komisji Edukacji Narodowej": [
            "uken", "pedagogika", "edukacja", "psychologia", "filologia", "dydaktyka", 
            "nauczanie", "wychowanie"
        ],
        "Akademia Ignatianum": [
            "ignatianum", "filozofia", "teologia", "etyka", "kultura", "humanistyka", 
            "nauki społeczne", "psychologia"
        ],
        "Uniwersytet Papieski Jana Pawła II": [
            "upjpii", "papieski", "teologia", "prawo kanoniczne", "filozofia religii", 
            "historia kościoła", "etyka", "religia"
        ],
        "Krakowska Akademia im. Andrzeja Frycza Modrzewskiego": [
            "krakowska akademia", "prawo", "administracja", "zarządzanie", "bezpieczeństwo", 
            "pedagogika", "stosunki międzynarodowe", "zdrowie publiczne"
        ],
        "Wyższa Szkoła Zarządzania i Bankowości": [
            "wszib", "zarządzanie", "bankowość", "finanse", "marketing", "biznes", 
            "przedsiębiorczość", "ekonomia"
        ],
        "Uniwersytet Rolniczy im. Hugona Kołłątaja": [
            "rolniczy", "rolnictwo", "ogrodnictwo", "leśnictwo", "weterynaria", 
            "biotechnologia", "ochrona środowiska", "nauki o żywności"
        ],
        "Wyższa Szkoła Europejska im. ks. Józefa Tischnera": [
            "wse", "europejska", "stosunki międzynarodowe", "kultura", "media", 
            "zarządzanie", "turystyka", "komunikacja"
        ],
        "Wyższa Szkoła Ekonomii i Informatyki": [
            "wsei", "ekonomia", "informatyka", "programowanie", "finanse", 
            "zarządzanie", "marketing", "biznes"
        ],
        "Wyższa Szkoła Bezpieczeństwa Publicznego i Indywidualnego \"Apeiron\"": [
            "apeiron", "bezpieczeństwo", "kryminologia", "cyberbezpieczeństwo", 
            "obrona", "policja", "ratownictwo", "zarządzanie kryzysowe"
        ]
    }
    
    assigned_universities = []
    
    # Sprawdź słowa kluczowe dla każdej uczelni
    for uni_name, keywords in university_keywords.items():
        for keyword in keywords:
            if keyword in text:
                assigned_universities.append(uni_name)
                break  # Przypisz tylko raz do każdej uczelni
    
    # Jeśli nie znaleziono żadnych powiązań, nie przypisuj do żadnej uczelni
    # (zamiast przypisywać do wszystkich, co powoduje duplikaty)
    if not assigned_universities:
        print(f"⚠️ Nie znaleziono słów kluczowych dla wydarzenia: {title[:50]}...")
        return []
    
    return assigned_universities

# ŹRÓDŁA WYDAWNICZE I KSIĄŻKOWE – prawdziwe strony z wydarzeniami w Krakowie
EVENTS_SOURCES = {
    "Akademia Górniczo-Hutnicza": [
        {"type": "discover", "url": "https://biletyna.pl/Krakow", "category": "bilety"},
        {"type": "rss", "url": "https://rynek-ksiazki.pl/rss/", "category": "książki"},
        {"type": "rss", "url": "https://literacko.pl/feed/", "category": "literatura"},
        {"type": "rss", "url": "https://lubimyczytać.pl/rss", "category": "książki"},
    ],
    "Politechnika Krakowska": [
        {"type": "discover", "url": "https://biletyna.pl/Krakow", "category": "bilety"},
        {"type": "rss", "url": "https://rynek-ksiazki.pl/rss/", "category": "książki"},
        {"type": "rss", "url": "https://literacko.pl/feed/", "category": "literatura"},
        {"type": "rss", "url": "https://lubimyczytać.pl/rss", "category": "książki"},
    ],
    "Uniwersytet Jagielloński": [
        {"type": "discover", "url": "https://biletyna.pl/Krakow", "category": "bilety"},
        {"type": "rss", "url": "https://rynek-ksiazki.pl/rss/", "category": "książki"},
        {"type": "rss", "url": "https://literacko.pl/feed/", "category": "literatura"},
        {"type": "rss", "url": "https://lubimyczytać.pl/rss", "category": "książki"},
    ],
    "Uniwersytet Ekonomiczny": [
        {"type": "discover", "url": "https://biletyna.pl/Krakow", "category": "bilety"},
        {"type": "rss", "url": "https://rynek-ksiazki.pl/rss/", "category": "książki"},
        {"type": "rss", "url": "https://literacko.pl/feed/", "category": "literatura"},
        {"type": "rss", "url": "https://lubimyczytać.pl/rss", "category": "książki"},
    ],
    "Akademia Muzyczna im. Krzysztofa Pendereckiego": [
        {"type": "discover", "url": "https://biletyna.pl/Krakow", "category": "bilety"},
        {"type": "rss", "url": "https://rynek-ksiazki.pl/rss/", "category": "książki"},
        {"type": "rss", "url": "https://literacko.pl/feed/", "category": "literatura"},
        {"type": "rss", "url": "https://lubimyczytać.pl/rss", "category": "książki"},
    ],
    "Akademia Sztuk Pięknych im. Jana Matejki": [
        {"type": "discover", "url": "https://biletyna.pl/Krakow", "category": "bilety"},
        {"type": "rss", "url": "https://rynek-ksiazki.pl/rss/", "category": "książki"},
        {"type": "rss", "url": "https://literacko.pl/feed/", "category": "literatura"},
        {"type": "rss", "url": "https://lubimyczytać.pl/rss", "category": "książki"},
    ],
    "Akademia Wychowania Fizycznego im. Bronisława Czecha": [
        {"type": "discover", "url": "https://biletyna.pl/Krakow", "category": "bilety"},
        {"type": "rss", "url": "https://rynek-ksiazki.pl/rss/", "category": "książki"},
        {"type": "rss", "url": "https://literacko.pl/feed/", "category": "literatura"},
        {"type": "rss", "url": "https://lubimyczytać.pl/rss", "category": "książki"},
    ],
    "Uniwersytet Komisji Edukacji Narodowej": [
        {"type": "discover", "url": "https://biletyna.pl/Krakow", "category": "bilety"},
        {"type": "rss", "url": "https://rynek-ksiazki.pl/rss/", "category": "książki"},
        {"type": "rss", "url": "https://literacko.pl/feed/", "category": "literatura"},
        {"type": "rss", "url": "https://lubimyczytać.pl/rss", "category": "książki"},
    ],
    "Akademia Ignatianum": [
        {"type": "discover", "url": "https://biletyna.pl/Krakow", "category": "bilety"},
        {"type": "rss", "url": "https://rynek-ksiazki.pl/rss/", "category": "książki"},
        {"type": "rss", "url": "https://literacko.pl/feed/", "category": "literatura"},
        {"type": "rss", "url": "https://lubimyczytać.pl/rss", "category": "książki"},
    ],
    "Uniwersytet Papieski Jana Pawła II": [
        {"type": "discover", "url": "https://biletyna.pl/Krakow", "category": "bilety"},
        {"type": "rss", "url": "https://rynek-ksiazki.pl/rss/", "category": "książki"},
        {"type": "rss", "url": "https://literacko.pl/feed/", "category": "literatura"},
        {"type": "rss", "url": "https://lubimyczytać.pl/rss", "category": "książki"},
    ],
    "Akademia Sztuk Teatralnych im. Stanisława Wyspiańskiego": [
        {"type": "discover", "url": "https://biletyna.pl/Krakow", "category": "bilety"},
        {"type": "rss", "url": "https://rynek-ksiazki.pl/rss/", "category": "książki"},
        {"type": "rss", "url": "https://literacko.pl/feed/", "category": "literatura"},
        {"type": "rss", "url": "https://lubimyczytać.pl/rss", "category": "książki"},
    ],
    "Krakowska Akademia im. Andrzeja Frycza Modrzewskiego": [
        {"type": "discover", "url": "https://biletyna.pl/Krakow", "category": "bilety"},
        {"type": "rss", "url": "https://rynek-ksiazki.pl/rss/", "category": "książki"},
        {"type": "rss", "url": "https://literacko.pl/feed/", "category": "literatura"},
        {"type": "rss", "url": "https://lubimyczytać.pl/rss", "category": "książki"},
    ],
    "Wyższa Szkoła Zarządzania i Bankowości": [
        {"type": "discover", "url": "https://biletyna.pl/Krakow", "category": "bilety"},
        {"type": "rss", "url": "https://rynek-ksiazki.pl/rss/", "category": "książki"},
        {"type": "rss", "url": "https://literacko.pl/feed/", "category": "literatura"},
        {"type": "rss", "url": "https://lubimyczytać.pl/rss", "category": "książki"},
    ],
    "Uniwersytet Rolniczy im. Hugona Kołłątaja": [
        {"type": "discover", "url": "https://biletyna.pl/Krakow", "category": "bilety"},
        {"type": "rss", "url": "https://rynek-ksiazki.pl/rss/", "category": "książki"},
        {"type": "rss", "url": "https://literacko.pl/feed/", "category": "literatura"},
        {"type": "rss", "url": "https://lubimyczytać.pl/rss", "category": "książki"},
    ],
    "Wyższa Szkoła Europejska im. ks. Józefa Tischnera": [
        {"type": "discover", "url": "https://biletyna.pl/Krakow", "category": "bilety"},
        {"type": "rss", "url": "https://rynek-ksiazki.pl/rss/", "category": "książki"},
        {"type": "rss", "url": "https://literacko.pl/feed/", "category": "literatura"},
        {"type": "rss", "url": "https://lubimyczytać.pl/rss", "category": "książki"},
    ],
    "Wyższa Szkoła Ekonomii i Informatyki": [
        {"type": "discover", "url": "https://biletyna.pl/Krakow", "category": "bilety"},
        {"type": "rss", "url": "https://rynek-ksiazki.pl/rss/", "category": "książki"},
        {"type": "rss", "url": "https://literacko.pl/feed/", "category": "literatura"},
        {"type": "rss", "url": "https://lubimyczytać.pl/rss", "category": "książki"},
    ],
    "Wyższa Szkoła Bezpieczeństwa Publicznego i Indywidualnego \"Apeiron\"": [
        {"type": "discover", "url": "https://biletyna.pl/Krakow", "category": "bilety"},
        {"type": "rss", "url": "https://rynek-ksiazki.pl/rss/", "category": "książki"},
        {"type": "rss", "url": "https://literacko.pl/feed/", "category": "literatura"},
        {"type": "rss", "url": "https://lubimyczytać.pl/rss", "category": "książki"},
    ],
    # Specjalne źródło dla wydarzeń książkowych - przypisywane do wszystkich uczelni
    "Kraków - wydarzenia książkowe": [
        {"type": "rss", "url": "https://rynek-ksiazki.pl/rss/", "category": "książki"},
        {"type": "rss", "url": "https://literacko.pl/feed/", "category": "literatura"},
        {"type": "rss", "url": "https://lubimyczytać.pl/rss", "category": "książki"},
    ],
}

@router.get("", response_model=list[EventOut])
def list_events(
    uni: Optional[str] = None,
    q: Optional[str] = None,
    category: Optional[str] = None,
    online: Optional[bool] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_current_user_optional),
):
    sel = select(Event).where(Event.status == "published")

    if uni:
        sel = sel.where(Event.university_name == uni)
    if category:
        sel = sel.where(Event.category == category)
    if online is not None:
        sel = sel.where(Event.is_online == online)
    if q:
        like = f"%{q.lower()}%"
        sel = sel.where(
            or_(
                func.lower(Event.title).like(like),
                func.lower(Event.description).like(like),
                func.lower(Event.organizer).like(like),
                func.lower(Event.location_name).like(like),
            )
        )
    if date_from:
        try:
            sel = sel.where(Event.start_at >= datetime.fromisoformat(date_from))
        except Exception:
            pass
    if date_to:
        try:
            sel = sel.where(Event.start_at <= datetime.fromisoformat(date_to))
        except Exception:
            pass

    sel = sel.order_by(Event.start_at.desc(), Event.id.asc()).limit(200)
    events = db.execute(sel).scalars().all()

    # 🔹 mapowanie RSVP dla zalogowanego usera
    state_map = {}
    if current_user:
        user_events = db.execute(
            select(UserEvent).where(
                UserEvent.user_id == current_user.id,
                UserEvent.event_id.in_([e.id for e in events])
            )
        ).scalars().all()
        state_map = {ue.event_id: ue.state for ue in user_events}

    # 🔹 deduplikacja na poziomie wyświetlania
    seen_events = set()
    out = []
    for ev in events:
        # Klucz deduplikacji: tytuł + data + lokalizacja
        dedup_key = f"{ev.title.lower()}_{ev.start_at}_{ev.location_name or ''}"
        if dedup_key in seen_events:
            continue
        seen_events.add(dedup_key)
        
        ev.my_state = state_map.get(ev.id)
        out.append(ev)

    return out

@router.get("/multi", response_model=dict[str, list[EventOut]])
def events_multi(
    q: str = Query(..., description="Lista uczelni rozdzielona przecinkami"),
    category: Optional[str] = None,
    online: Optional[bool] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit_each: int = 20,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_current_user_optional),
):
    """🚀 Endpoint dla wszystkich wydarzeń z deduplikacją"""
    queries = [s.strip() for s in q.split(",") if s.strip()]
    if not queries: return {}
    
    results = {}
    seen_global = set()  # Globalna deduplikacja
    
    for uni in queries:
        sel = select(Event).where(Event.status == "published")
        
        if uni:
            sel = sel.where(Event.university_name == uni)
        if category:
            sel = sel.where(Event.category == category)
        if online is not None:
            sel = sel.where(Event.is_online == online)
        if date_from:
            try:
                sel = sel.where(Event.start_at >= datetime.fromisoformat(date_from))
            except Exception:
                pass
        if date_to:
            try:
                sel = sel.where(Event.start_at <= datetime.fromisoformat(date_to))
            except Exception:
                pass

        sel = sel.order_by(Event.start_at.desc(), Event.id.asc()).limit(limit_each)
        events = db.execute(sel).scalars().all()

        # 🔹 mapowanie RSVP dla zalogowanego usera
        state_map = {}
        if current_user:
            user_events = db.execute(
                select(UserEvent).where(
                    UserEvent.user_id == current_user.id,
                    UserEvent.event_id.in_([e.id for e in events])
                )
            ).scalars().all()
            state_map = {ue.event_id: ue.state for ue in user_events}

        # 🔹 deduplikacja globalna
        deduped_events = []
        for ev in events:
            # Klucz deduplikacji: tytuł + data + lokalizacja
            dedup_key = f"{ev.title.lower()}_{ev.start_at}_{ev.location_name or ''}"
            if dedup_key in seen_global:
                continue
            seen_global.add(dedup_key)
            
            ev.my_state = state_map.get(ev.id)
            deduped_events.append(ev)

        results[uni] = deduped_events

    return results

@router.get("/mine", response_model=list[EventOut])
def my_events(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    sel = (
        select(Event, UserEvent.state)
        .join(UserEvent, UserEvent.event_id == Event.id)
        .where(UserEvent.user_id == current_user.id)
        .where(Event.status == "published")
        .order_by(Event.start_at.desc())
    )
    rows = db.execute(sel).all()

    out = []
    for ev, state in rows:
        ev.my_state = state
        out.append(ev)
    return out

@router.get("/stats")
async def events_stats(db: Session = Depends(get_db)):
    """Pokaż statystyki wydarzeń w bazie danych"""
    total = db.execute(select(func.count()).select_from(Event)).scalar() or 0
    
    # Statystyki według kategorii
    categories = db.execute(
        select(Event.category.label("category"), func.count().label("count"))
        .where(Event.category.isnot(None))
        .group_by(Event.category)
        .order_by(func.count().desc())
    ).all()
    
    # Statystyki według uczelni
    universities = db.execute(
        select(Event.university_name.label("university_name"), func.count().label("count"))
        .where(Event.university_name.isnot(None))
        .group_by(Event.university_name)
        .order_by(func.count().desc())
    ).all()
    
    # Ostatnie wydarzenia
    recent = db.execute(
        select(Event.title, Event.start_at, Event.category, Event.university_name)
        .order_by(Event.start_at.desc())
        .limit(5)
    ).all()
    
    return {
        "total_events": total,
        "categories": [dict(r._mapping) for r in categories],
        "universities": [dict(r._mapping) for r in universities],
        "recent_events": [dict(r._mapping) for r in recent],
        "sources_count": len(EVENTS_SOURCES),
        "universities_with_sources": list(EVENTS_SOURCES.keys())
    }

@router.get("/{event_id}", response_model=EventDetail)
def event_detail(event_id: int, db: Session = Depends(get_db)):
    ev = db.get(Event, event_id)
    if not ev or ev.status != "published":
        raise HTTPException(404, "Wydarzenie nie istnieje")
    return ev

@router.post("/{event_id}/rsvp", response_model=RSVPOut)
def event_rsvp(
    event_id: int,
    body: RSVPIn = Body(...),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    ev = db.get(Event, event_id)
    if not ev or ev.status != "published":
        raise HTTPException(404, "Wydarzenie nie istnieje")
    ue = db.execute(
        select(UserEvent).where(and_(UserEvent.user_id==current_user.id, UserEvent.event_id==event_id))
    ).scalar_one_or_none()
    if ue:
        ue.state = body.state
        ue.reminder_minutes_before = body.reminder_minutes_before
    else:
        ue = UserEvent(
            user_id=current_user.id,
            event_id=event_id,
            state=body.state,
            reminder_minutes_before=body.reminder_minutes_before,
        )
        db.add(ue)
    db.commit()
    return RSVPOut(
        user_id=current_user.id, event_id=event_id,
        state=ue.state, reminder_minutes_before=ue.reminder_minutes_before
    )

@router.delete("/{event_id}/rsvp")
def event_rsvp_delete(event_id: int, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    ue = db.execute(
        select(UserEvent).where(and_(UserEvent.user_id==current_user.id, UserEvent.event_id==event_id))
    ).scalar_one_or_none()
    if ue:
        db.delete(ue); db.commit()
    return {"ok": True}

@router.get("/{event_id}.ics")
def event_ics(event_id: int, db: Session = Depends(get_db)):
    ev = db.get(Event, event_id)
    if not ev or ev.status != "published":
        raise HTTPException(404, "Wydarzenie nie istnieje")
    ics = build_event_ics(ev)
    return Response(content=ics, media_type="text/calendar")

# Importy (MVP)
@router.post("/import/all")
async def import_all_events_endpoint(db: Session = Depends(get_db)):
    http = get_http()
    await import_events_all(db, http, EVENTS_SOURCES)
    return {"ok": True}

@router.post("/import/refresh")
async def refresh_events_endpoint(db: Session = Depends(get_db)):
    """Wyczyść stare wydarzenia i zaimportuj nowe z zaktualizowanych źródeł"""
    import time
    start_time = time.time()
    
    try:
        print("🔄 Rozpoczynam odświeżanie wydarzeń...")
        
        # Najpierw usuń powiązane rekordy z user_events (RSVP)
        from sqlalchemy import delete
        print("🗑️ Usuwam stare RSVP...")
        db.execute(delete(UserEvent))
        db.commit()
        
        # Teraz usuń wszystkie stare wydarzenia
        print("🗑️ Usuwam stare wydarzenia...")
        db.execute(delete(Event))
        db.commit()
        
        print("📥 Importuję nowe wydarzenia z źródeł książkowych...")
        print(f"📊 Łącznie źródeł do sprawdzenia: {len(EVENTS_SOURCES)}")
        
        # Zaimportuj nowe wydarzenia z zaktualizowanych źródeł
        await import_events_all(db, get_http(), EVENTS_SOURCES)
        
        # Pokaż statystyki
        total = db.execute(select(func.count()).select_from(Event)).scalar() or 0
        rows = db.execute(
            select(Event.university_name.label("university_name"), func.count().label("count"))
            .group_by(Event.university_name)
            .order_by(func.count().desc())
        ).all()
        by_university = [dict(r._mapping) for r in rows]
        
        elapsed_time = time.time() - start_time
        
        return {
            "ok": True, 
            "message": f"Wydarzenia zostały odświeżone z nowych źródeł książkowych w {elapsed_time:.1f}s",
            "total_events": total, 
            "by_university": by_university,
            "elapsed_time": elapsed_time,
            "sources_checked": len(EVENTS_SOURCES)
        }
    except Exception as e:
        db.rollback()
        elapsed_time = time.time() - start_time
        print(f"❌ Błąd po {elapsed_time:.1f}s: {str(e)}")
        return {
            "ok": False,
            "error": f"Błąd podczas odświeżania wydarzeń po {elapsed_time:.1f}s: {str(e)}"
        }

@router.post("/clean-duplicates")
def clean_duplicates_endpoint(db: Session = Depends(get_db)):
    """Usuń duplikaty wydarzeń z bazy danych"""
    from ..services.events_import import clean_duplicate_events
    
    try:
        removed_count = clean_duplicate_events(db)
        
        # Pokaż statystyki po czyszczeniu
        total = db.execute(select(func.count()).select_from(Event)).scalar() or 0
        
        return {
            "ok": True,
            "message": f"Usunięto {removed_count} duplikatów wydarzeń",
            "removed_duplicates": removed_count,
            "total_events_after": total
        }
    except Exception as e:
        db.rollback()
        return {
            "ok": False,
            "error": f"Błąd podczas czyszczenia duplikatów: {str(e)}"
        }

@router.post("/import/uni")
async def import_events_for_uni_endpoint(name: str, db: Session = Depends(get_db)):
    import time
    start_time = time.time()
    
    http = get_http()
    if name not in EVENTS_SOURCES:
        raise HTTPException(404, f"Brak w EVENTS_SOURCES: {name}")
    
    print(f"🔄 Importuję wydarzenia dla: {name}")
    await import_events_for_university(db, name, http, EVENTS_SOURCES)
    
    elapsed_time = time.time() - start_time
    total = db.execute(select(func.count()).select_from(Event)).scalar() or 0
    rows = db.execute(
        select(Event.university_name.label("university_name"), func.count().label("count"))
        .group_by(Event.university_name)
        .order_by(func.count().desc())
    ).all()
    by_university = [dict(r._mapping) for r in rows]
    
    return {
        "ok": True, 
        "message": f"Import dla {name} zakończony w {elapsed_time:.1f}s",
        "total_events": total, 
        "by_university": by_university,
        "elapsed_time": elapsed_time
    }

@router.get("/import/test-source")
async def test_single_source(url: str, db: Session = Depends(get_db)):
    """Testuj pojedyncze źródło - sprawdź czy działa szybko"""
    import time
    start_time = time.time()
    
    try:
        http = get_http()
        print(f"🧪 Testuję źródło: {url}")
        
        # Testuj tylko discovery dla tego URL
        found = await discover_sources(url, http)
        
        elapsed_time = time.time() - start_time
        
        return {
            "ok": True,
            "url": url,
            "elapsed_time": elapsed_time,
            "found": {
                "ics_count": len(found["ics"]),
                "rss_count": len(found["rss"]),
                "detail_pages_count": len(found["detail_pages"]),
                "jsonld_events_count": len(found["jsonld_events"])
            },
            "sources": {
                "ics": found["ics"][:5],  # Pierwsze 5
                "rss": found["rss"][:5],
                "detail_pages": found["detail_pages"][:5]
            }
        }
    except Exception as e:
        elapsed_time = time.time() - start_time
        return {
            "ok": False,
            "url": url,
            "error": str(e),
            "elapsed_time": elapsed_time
        }

# Debug discovery
@router.get("/_debug/discover")
async def debug_discover(url: str):
    http = get_http()
    try:
        found = await discover_sources(url, http)
        return {
            "url": url,
            "ics_count": len(found["ics"]),
            "rss_count": len(found["rss"]),
            "detail_pages_count": len(found["detail_pages"]),
            "jsonld_events_count": len(found["jsonld_events"]),
            "ics": found["ics"],
            "rss": found["rss"],
            "detail_pages_sample": found["detail_pages"][:10],
        }
    except Exception as e:
        raise HTTPException(500, f"discover error: {e!r}")