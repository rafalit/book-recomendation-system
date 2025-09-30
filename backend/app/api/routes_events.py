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

# ŹRÓDŁA – przeniesione z main (bez zmian treści)
EVENTS_SOURCES = {
    "Akademia Górniczo-Hutnicza": [
        {"type": "discover", "url": "https://www.agh.edu.pl/wydarzenia", "category": "ogólne"},
        {"type": "discover", "url": "https://www.agh.edu.pl/en/calendar", "category": "ogólne"},
        {"type": "discover", "url": "https://sd.agh.edu.pl/en/events", "category": "doktoranci"},
    ],
    "Politechnika Krakowska": [
        {"type": "discover", "url": "https://www.pk.edu.pl/index.php?option=com_content&view=category&layout=blog&id=50&Itemid=1118&lang=pl", "category": "ogólne"},
        {"type": "discover", "url": "https://futurelab.pk.edu.pl/wydarzenia/", "category": "ogólne"},
        {"type": "discover", "url": "https://delta.pk.edu.pl/calendar/view.php?view=month", "category": "ogólne"},
    ],
    "Uniwersytet Jagielloński": [
        {"type": "discover", "url": "https://www.uj.edu.pl/kalendarz", "category": "ogólne"},
    ],
     "Uniwersytet Ekonomiczny": [
        {"type": "ics", "url": "https://granty.uek.krakow.pl/kalendarz/miesiac/?ical=1", "category": "granty"},
        {"type": "discover", "url": "https://uek.krakow.pl/artykuly/wydarzenia", "category": "ogólne"},
        {"type": "discover", "url": "https://kariery.uek.krakow.pl/strefa-studenta/szkolenia-i-doradztwo/kalendarz-wydarzen/", "category": "kariera"},
        {"type": "rss", "url": "https://kpz.uek.krakow.pl/portal/pl/rss.xml", "category": "wydziały"},
        {"type": "discover", "url": "https://kpz.uek.krakow.pl/portal/pl/content/planowane-wydarzenia-na-uek", "category": "wydziały"},
        {"type": "discover", "url": "https://juwenaliauek.pl/wydarzenia/", "category": "studenci"},
    ],
    "Akademia Muzyczna im. Krzysztofa Pendereckiego": [
        {"type": "discover", "url": "https://www.amuz.krakow.pl/category/wydarzenia/", "category": "kultura"},
    ],
    "Akademia Sztuk Pięknych im. Jana Matejki": [
        {"type": "rss", "url": "https://www.asp.krakow.pl/category/wydarzenia/feed/", "category": "kultura"},
        {"type": "discover", "url": "https://www.asp.krakow.pl/category/wydarzenia/", "category": "kultura"},
    ],
    "Akademia Wychowania Fizycznego im. Bronisława Czecha": [
        {"type": "rss", "url": "https://www.akf.krakow.pl/?format=feed&type=rss", "category": "ogólne"},
        {"type": "discover", "url": "https://www.akf.krakow.pl/sport/aktualnosci-sportowe", "category": "sport"},
        {"type": "discover", "url": "https://www.akf.krakow.pl/sport/imprezy-sportowe", "category": "sport"},
    ],
    "Uniwersytet Komisji Edukacji Narodowej": [
        {"type": "discover", "url": "https://www.uken.krakow.pl/uniwersytet/kalendarz-wydarzen", "category": "ogólne"},
        {"type": "discover", "url": "https://www.uken.krakow.pl/index.php?option=com_icagenda&view=list&lang=pl", "category": "ogólne"},
        {"type": "rss", "url": "https://www.uken.krakow.pl/uniwersytet/aktualnosci?format=feed&type=rss", "category": "aktualności"},
    ],
    "Akademia Ignatianum": [
        {"type": "discover", "url": "https://ignatianum.edu.pl/kalendarium-lista", "category": "ogólne"},
        {"type": "discover", "url": "https://uniwersytet.ignatianum.edu.pl/wszystkie-wydarzenia/", "category": "ogólne"},
    ],
    "Uniwersytet Papieski Jana Pawła II": [
        {"type": "discover", "url": "https://upjp2.edu.pl/konferencje-i-wydarzenia", "category": "ogólne"},
        {"type": "discover", "url": "https://upjp2.edu.pl/uniwersytet/uczelnia/kalendarium-akademickie", "category": "ogólne"},
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
    current_user: Optional[models.User] = Depends(auth.get_current_user),
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

    out = []
    for ev in events:
        ev.my_state = state_map.get(ev.id)
        out.append(ev)

    return out

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

@router.post("/import/uni")
async def import_events_for_uni_endpoint(name: str, db: Session = Depends(get_db)):
    http = get_http()
    if name not in EVENTS_SOURCES:
        raise HTTPException(404, f"Brak w EVENTS_SOURCES: {name}")
    await import_events_for_university(db, name, http, EVENTS_SOURCES)
    total = db.execute(select(func.count()).select_from(Event)).scalar() or 0
    rows = db.execute(
        select(Event.university_name.label("university_name"), func.count().label("count"))
        .group_by(Event.university_name)
        .order_by(func.count().desc())
    ).all()
    by_university = [dict(r._mapping) for r in rows]
    return {"ok": True, "total_events": total, "by_university": by_university}

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
