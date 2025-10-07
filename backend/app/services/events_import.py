# app/services/events_import.py
from __future__ import annotations
import re, json, hashlib
from datetime import datetime, timezone
from urllib.parse import urljoin, urlparse, parse_qs
from typing import Optional

import httpx
from selectolax.parser import HTMLParser
from icalendar import Calendar
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from dateutil import parser as dtp

from ..models.event import Event

_BAD_TLS = {"krakow.ast.krakow.pl", "www.ast.krakow.pl"}
CAL_MIME_TYPES = {"text/calendar", "application/calendar+json"}

def _sha(s: str) -> str: return hashlib.sha256(s.encode("utf-8")).hexdigest()
def _norm_txt(x: str | None) -> str: return (x or "").strip()

def _check_global_duplicate(db: Session, title: str, start_at: datetime | None, location: str | None) -> Event | None:
    """Sprawdź czy wydarzenie o podobnym tytule, dacie i lokalizacji już istnieje"""
    if not title or not start_at:
        return None
    
    # Szukaj wydarzeń o podobnym tytule i dacie (w ciągu 1 godziny)
    from datetime import timedelta
    time_window_start = start_at - timedelta(hours=1)
    time_window_end = start_at + timedelta(hours=1)
    
    similar_events = db.execute(
        select(Event).where(
            Event.title.ilike(f"%{title[:30]}%"),  # Pierwsze 30 znaków tytułu
            Event.start_at.between(time_window_start, time_window_end),
            Event.status == "published"
        )
    ).scalars().all()
    
    # Sprawdź podobieństwo tytułów (prosta heurystyka)
    title_words = set(title.lower().split())
    for event in similar_events:
        event_words = set(event.title.lower().split())
        # Jeśli 70% słów się pokrywa, to prawdopodobnie duplikat
        if len(title_words & event_words) / max(len(title_words), len(event_words)) > 0.7:
            return event
    
    return None

def _assign_category_from_title(title: str, default_category: str | None) -> str:
    """Przypisz kategorię na podstawie tytułu wydarzenia"""
    if default_category and default_category != "bilety":
        return default_category
    
    title_lower = title.lower()
    
    # Słowa kluczowe dla różnych kategorii
    kultura_keywords = ["wystawa", "galeria", "muzeum", "teatr", "koncert", "spektakl", "sztuka", "kultura", "artysta", "malarstwo", "rzeźba", "artystyczne"]
    turystyka_keywords = ["wycieczka", "spacer", "zwiedzanie", "turystyka", "podróż", "wyprawa", "szlak", "trasa", "krajoznawstwo"]
    wydarzenia_keywords = ["konferencja", "seminarium", "warsztat", "szkolenie", "spotkanie", "debata", "panel", "dyskusja", "prezentacja"]
    
    # Sprawdź słowa kluczowe
    for keyword in kultura_keywords:
        if keyword in title_lower:
            print(f"🔍 Found kultura keyword '{keyword}' in '{title[:50]}...'")
            return "kultura"
    
    for keyword in turystyka_keywords:
        if keyword in title_lower:
            print(f"🔍 Found turystyka keyword '{keyword}' in '{title[:50]}...'")
            return "turystyka"
    
    for keyword in wydarzenia_keywords:
        if keyword in title_lower:
            print(f"🔍 Found wydarzenia keyword '{keyword}' in '{title[:50]}...'")
            return "wydarzenia"
    
    # Domyślnie zostaw "bilety" jeśli nie pasuje do niczego
    return default_category or "bilety"

async def _safe_get(url: str, http: httpx.AsyncClient) -> httpx.Response | None:
    try:
        r = await http.get(url, headers={"Accept": "text/html,application/xhtml+xml,*/*"})
        r.raise_for_status()
        return r
    except httpx.ConnectError:
        host = (urlparse(url).hostname or "").lower()
        if host in _BAD_TLS:
            try:
                r = await http.get(url, headers={"Accept": "text/html,application/xhtml+xml,*/*"}, verify=False)
                if r.status_code == 200: return r
            except Exception: pass
            if url.startswith("https://"):
                try:
                    u2 = "http://" + url[len("https://"):]
                    r = await http.get(u2, headers={"Accept": "text/html,application/xhtml+xml,*/*"})
                    if r.status_code == 200: return r
                except Exception: pass
    except Exception:
        pass
    return None

async def discover_sources(url: str, http: httpx.AsyncClient) -> dict:
    out_rss, out_ics, out_jsonld, out_details = set(), set(), [], set()
    r = await _safe_get(url, http)
    if not r or r.status_code != 200 or not r.text:
        return {"rss": [], "ics": [], "jsonld_events": [], "detail_pages": []}

    tree = HTMLParser(r.text)

    for n in tree.css('link[rel="alternate"]'):
        t = (n.attributes.get("type") or "").lower()
        href = n.attributes.get("href") or ""
        if not href: continue
        full = urljoin(url, href)
        if t in ("application/rss+xml", "application/atom+xml"): out_rss.add(full)
        if t in CAL_MIME_TYPES or "ical" in href.lower() or href.lower().endswith(".ics"):
            out_ics.add(full)

    for a in tree.css("a[href]"):
        href = a.attributes.get("href") or ""
        full = urljoin(url, href)
        txt = (a.text() or "").lower()
        if any(k in txt for k in ("ical","ics")) or full.lower().endswith(".ics") or ("type=" in full and "ical" in full.lower()):
            out_ics.add(full)

    for s in tree.css('script[type="application/ld+json"]'):
        try: data = json.loads(s.text())
        except Exception: continue
        blob = data if isinstance(data, list) else [data]
        for obj in blob:
            if isinstance(obj, dict):
                graph = obj.get("@graph", [])
                if isinstance(graph, list):
                    for g in graph:
                        if isinstance(g, dict) and (g.get("@type") == "Event"):
                            out_jsonld.append(g)
                if obj.get("@type") == "Event":
                    out_jsonld.append(obj)

    for a in tree.css("a[href]"):
        href = a.attributes.get("href") or ""
        full = urljoin(url, href)
        if any(x in full.lower() for x in ("/wydarzenia","/events","/konferenc","tx_sfeventmgt","/repertuar","/kalendarium","/artykul/")):
            out_details.add(full)

    return {"rss": list(out_rss), "ics": list(out_ics), "jsonld_events": out_jsonld, "detail_pages": list(out_details)[:50]}

def _is_online_from(location: str | None, url: str | None) -> bool:
    blob = " ".join([location or "", url or ""]).lower()
    return any(k in blob for k in ["online","teams","zoom","meet","webinar","stream"])

def _ics_datetime(v):
    if not v: return None
    try:
        dt = v.dt
        if isinstance(dt, datetime):
            if dt.tzinfo:
                return dt.astimezone(timezone.utc).replace(tzinfo=None)
            return dt.replace(tzinfo=None)
        else:
            return dt
    except Exception:
        return None

async def _fetch_ics(http: httpx.AsyncClient, url: str) -> bytes | None:
    try:
        r = await http.get(url, headers={"Accept": "text/calendar, */*"})
        r.raise_for_status()
        return r.content
    except Exception:
        return None

async def _fetch_rss_items(url: str, http: httpx.AsyncClient) -> list[dict]:
    import feedparser
    try:
        r = await http.get(url, headers={"Accept": "application/rss+xml, application/xml, */*"})
        r.raise_for_status()
    except Exception:
        return []
    parsed = feedparser.parse(r.content)
    items = []
    for e in parsed.entries:
        title = (getattr(e, "title", "") or "").strip()
        link  = (getattr(e, "link", "") or "").strip()
        desc  = (getattr(e, "summary", "") or "").strip()
        dt    = None
        if hasattr(e, "published_parsed") and e.published_parsed:
            try:
                dt = datetime(*e.published_parsed[:6], tzinfo=timezone.utc).astimezone(timezone.utc).replace(tzinfo=None)
            except Exception:
                dt = None
        items.append({"title": title, "link": link, "desc": desc, "start_at": dt})
    return items

def _upsert_event_from_vevent(db: Session, ve, uni_name: str, src_url: str, default_category: str | None):
    title = _norm_txt(str(ve.get("summary", "")))
    desc = _norm_txt(str(ve.get("description", "")))
    loc = _norm_txt(str(ve.get("location", "")))
    url = _norm_txt(str(ve.get("url", "")))
    dtstart = _ics_datetime(ve.get("dtstart"))
    dtend = _ics_datetime(ve.get("dtend"))

    all_day = False
    if dtstart is not None and not isinstance(ve.get("dtstart").dt, datetime):
        all_day = True
        dtstart = datetime.combine(ve.get("dtstart").dt, datetime.min.time())
        dtend = datetime.combine(ve.get("dtend").dt if ve.get("dtend") else ve.get("dtstart").dt, datetime.max.time())

    uid = _norm_txt(str(ve.get("uid", "")))
    organizer = _norm_txt(str(ve.get("organizer", "")))
    is_online = _is_online_from(loc, url)

    fp = _sha("|".join([
        title.lower(), uni_name.lower(),
        (dtstart.isoformat() if isinstance(dtstart, datetime) else str(dtstart)),
        loc.lower()
    ]))

    found = None
    if uid:
        found = db.execute(select(Event).where(Event.source_type=="ics", Event.source_uid==uid)).scalar_one_or_none()
    if not found:
        found = db.execute(select(Event).where(Event.hash==fp)).scalar_one_or_none()

    # Dla wydarzeń książkowych, przypisz do odpowiednich uczelni na podstawie treści
    if default_category in ["książki", "literatura"] or "książk" in (title or "").lower():
        # 🚀 Sprawdź globalne duplikaty przed przypisaniem do uczelni
        global_duplicate = _check_global_duplicate(db, title, dtstart, loc)
        if global_duplicate:
            print(f"🚫 Pominięto duplikat: {title[:50]}... (już istnieje: {global_duplicate.title[:50]}...)")
            return
        
        from ..api.routes_events import assign_event_to_universities
        assigned_universities = assign_event_to_universities(title, desc, organizer, loc)
        
        # 🚀 Sprawdź czy wydarzenie już istnieje w bazie (niezależnie od uczelni)
        existing_global = db.execute(
            select(Event).where(
                Event.title.ilike(f"%{title[:30]}%"),
                Event.start_at == dtstart,
                Event.status == "published"
            )
        ).scalar_one_or_none()
        
        if existing_global:
            print(f"🚫 Pominięto duplikat globalny: {title[:50]}... (już istnieje: {existing_global.title[:50]}...)")
            return
        
        # Utwórz wydarzenie dla każdej przypisanej uczelni
        for assigned_uni in assigned_universities:
            # 🚀 Sprawdź czy wydarzenie już istnieje dla tej uczelni
            uni_hash = fp + "_" + assigned_uni.lower()
            existing_event = db.execute(
                select(Event).where(Event.hash == uni_hash)
            ).scalar_one_or_none()
            
            if existing_event:
                # Aktualizuj istniejące wydarzenie
                existing_event.title = title or existing_event.title
                existing_event.description = desc or existing_event.description
                existing_event.start_at = dtstart or existing_event.start_at
                existing_event.end_at = dtend or existing_event.end_at
                existing_event.all_day = all_day
                existing_event.is_online = is_online
                existing_event.meeting_url = url or existing_event.meeting_url
                existing_event.location_name = loc or existing_event.location_name
                existing_event.organizer = organizer or existing_event.organizer
                existing_event.source_url = src_url
                existing_event.source_uid = uid or existing_event.source_uid
                continue
            
            # 🚀 Przypisz różne kategorie na podstawie tytułu wydarzenia
            assigned_category = _assign_category_from_title(title or "", default_category)
            
            ev = Event(
                title=title or "(bez tytułu)",
                description=desc or None,
                start_at=dtstart or datetime.utcnow(),
                end_at=dtend,
                all_day=all_day,
                is_online=is_online,
                meeting_url=url or None,
                location_name=loc or None,
                address=None,
                organizer=organizer or None,
                university_name=assigned_uni,
                category=assigned_category,
                source_url=src_url,
                source_type="ics",
                source_uid=uid or None,
                hash=uni_hash,
                status="published",
            )
            db.add(ev)
    else:
        # 🚀 Przypisz kategorię na podstawie tytułu dla wszystkich wydarzeń
        assigned_category = _assign_category_from_title(title or "", default_category)
        
        if found:
            ev = found
            ev.title = title or ev.title
            ev.description = desc or ev.description
            ev.start_at = dtstart or ev.start_at
            ev.end_at = dtend or ev.end_at
            ev.all_day = all_day
            ev.location_name = loc or ev.location_name
            ev.is_online = is_online
            ev.meeting_url = url or ev.meeting_url
            ev.organizer = organizer or ev.organizer
            ev.university_name = uni_name
            ev.category = assigned_category or ev.category
            ev.source_url = src_url
        else:
            ev = Event(
                title=title or "(bez tytułu)",
                description=desc or None,
                start_at=dtstart or datetime.utcnow(),
                end_at=dtend,
                all_day=all_day,
                is_online=is_online,
                meeting_url=url or None,
                location_name=loc or None,
                address=None,
                organizer=organizer or None,
                university_name=uni_name,
                category=assigned_category,
                source_url=src_url,
                source_type="ics",
                source_uid=uid or None,
                hash=fp,
                status="published",
            )
            db.add(ev)
    
    try: db.commit()
    except IntegrityError: db.rollback()

def _upsert_event_from_rss(db: Session, it: dict, uni_name: str, src_url: str, default_category: str | None):
    title = it["title"] or "(bez tytułu)"
    desc  = it.get("desc") or None
    link  = it.get("link") or None
    dt    = it.get("start_at")
    is_online = _is_online_from(None, link)
    fp = _sha("|".join([
        title.lower(), uni_name.lower(),
        (dt.isoformat() if isinstance(dt, datetime) else ""),
        (link or "").lower()
    ]))
    
    # Dla wydarzeń książkowych, przypisz do odpowiednich uczelni na podstawie treści
    if default_category in ["książki", "literatura"] or "książk" in title.lower():
        # 🚀 Sprawdź globalne duplikaty przed przypisaniem do uczelni
        global_duplicate = _check_global_duplicate(db, title, dt, None)
        if global_duplicate:
            print(f"🚫 Pominięto duplikat RSS: {title[:50]}... (już istnieje: {global_duplicate.title[:50]}...)")
            return
        
        from ..api.routes_events import assign_event_to_universities
        assigned_universities = assign_event_to_universities(title, desc or "", "", "")
        
        # 🚀 Sprawdź czy wydarzenie już istnieje w bazie (niezależnie od uczelni)
        existing_global = db.execute(
            select(Event).where(
                Event.title.ilike(f"%{title[:30]}%"),
                Event.start_at == dt,
                Event.status == "published"
            )
        ).scalar_one_or_none()
        
        if existing_global:
            print(f"🚫 Pominięto duplikat globalny RSS: {title[:50]}... (już istnieje: {existing_global.title[:50]}...)")
            return
        
        # Utwórz wydarzenie dla każdej przypisanej uczelni
        for assigned_uni in assigned_universities:
            # 🚀 Sprawdź czy wydarzenie już istnieje dla tej uczelni
            uni_hash = fp + "_" + assigned_uni.lower()
            existing_event = db.execute(
                select(Event).where(Event.hash == uni_hash)
            ).scalar_one_or_none()
            
            if existing_event:
                # Aktualizuj istniejące wydarzenie
                existing_event.description = desc or existing_event.description
                existing_event.start_at = dt or existing_event.start_at
                existing_event.is_online = is_online
                existing_event.source_url = src_url
                continue
            
            # 🚀 Przypisz kategorię na podstawie tytułu
            assigned_category = _assign_category_from_title(title, default_category)
            
            ev = Event(
                title=title, description=desc, start_at=dt or datetime.utcnow(), end_at=None,
                all_day=False, is_online=is_online, meeting_url=None, location_name=None, address=None,
                organizer=None, university_name=assigned_uni, category=assigned_category,
                source_url=src_url, source_type="rss", source_uid=None, 
                hash=uni_hash, status="published",
            )
            db.add(ev)
    else:
        # 🚀 Przypisz kategorię na podstawie tytułu dla wszystkich wydarzeń RSS
        assigned_category = _assign_category_from_title(title, default_category)
        
        found = db.execute(select(Event).where(Event.hash==fp)).scalar_one_or_none()
        if found:
            ev = found
            ev.description = desc or ev.description
            ev.start_at    = dt or ev.start_at
            ev.is_online   = is_online
            ev.university_name = uni_name
            ev.category    = assigned_category or ev.category
            ev.source_url  = src_url
        else:
            ev = Event(
                title=title, description=desc, start_at=dt or datetime.utcnow(), end_at=None,
                all_day=False, is_online=is_online, meeting_url=None, location_name=None, address=None,
                organizer=None, university_name=uni_name, category=assigned_category,
                source_url=src_url, source_type="rss", source_uid=None, hash=fp, status="published",
            )
            db.add(ev)
    
    try: db.commit()
    except IntegrityError: db.rollback()

def _event_from_jsonld(ev: dict) -> dict:
    def take(*keys): 
        for k in keys:
            v = ev.get(k)
            if v: return v
        return None
    name = take("name"); desc = take("description"); url = take("url")
    start = take("startDate"); end = take("endDate")
    loc = ev.get("location") or {}
    if isinstance(loc, dict):
        loc_name = loc.get("name") or ""
        addr = loc.get("address")
        if isinstance(addr, dict):
            loc_name = loc_name or " ".join([addr.get("streetAddress") or "", addr.get("addressLocality") or ""]).strip()
    else:
        loc_name = None
    try: dt_start = dtp.parse(start).replace(tzinfo=None) if start else None
    except Exception: dt_start = None
    try: dt_end = dtp.parse(end).replace(tzinfo=None) if end else None
    except Exception: dt_end = None
    return {
        "title": (name or "(bez tytułu)"),
        "description": desc,
        "start_at": dt_start,
        "end_at": dt_end,
        "location_name": loc_name or None,
        "is_online": _is_online_from(loc_name, url),
        "source_type": "jsonld",
    }

def _upsert_event_from_jsonld(db: Session, ev: dict, uni_name: str, src_url: str, default_category: str | None):
    fp = _sha("|".join([
        ev["title"].lower(), uni_name.lower(),
        (ev["start_at"].isoformat() if isinstance(ev["start_at"], datetime) else ""),
    ]))
    
    # Dla wydarzeń książkowych, przypisz do odpowiednich uczelni na podstawie treści
    if default_category in ["książki", "literatura"] or "książk" in ev["title"].lower():
        # 🚀 Sprawdź globalne duplikaty przed przypisaniem do uczelni
        global_duplicate = _check_global_duplicate(db, ev["title"], ev.get("start_at"), ev.get("location_name"))
        if global_duplicate:
            print(f"🚫 Pominięto duplikat JSON-LD: {ev['title'][:50]}... (już istnieje: {global_duplicate.title[:50]}...)")
            return
        
        from ..api.routes_events import assign_event_to_universities
        assigned_universities = assign_event_to_universities(
            ev["title"], 
            ev.get("description") or "", 
            "", 
            ev.get("location_name") or ""
        )
        
        # 🚀 Sprawdź czy wydarzenie już istnieje w bazie (niezależnie od uczelni)
        existing_global = db.execute(
            select(Event).where(
                Event.title.ilike(f"%{ev['title'][:30]}%"),
                Event.start_at == ev.get("start_at"),
                Event.status == "published"
            )
        ).scalar_one_or_none()
        
        if existing_global:
            print(f"🚫 Pominięto duplikat globalny JSON-LD: {ev['title'][:50]}... (już istnieje: {existing_global.title[:50]}...)")
            return
        
        # Utwórz wydarzenie dla każdej przypisanej uczelni
        for assigned_uni in assigned_universities:
            # 🚀 Sprawdź czy wydarzenie już istnieje dla tej uczelni
            uni_hash = fp + "_" + assigned_uni.lower()
            existing_event = db.execute(
                select(Event).where(Event.hash == uni_hash)
            ).scalar_one_or_none()
            
            if existing_event:
                # Aktualizuj istniejące wydarzenie
                existing_event.description = ev.get("description") or existing_event.description
                existing_event.start_at = ev.get("start_at") or existing_event.start_at
                existing_event.end_at = ev.get("end_at") or existing_event.end_at
                existing_event.is_online = ev.get("is_online", existing_event.is_online)
                existing_event.location_name = ev.get("location_name") or existing_event.location_name
                existing_event.source_url = src_url
                continue
            
            # 🚀 Przypisz kategorię na podstawie tytułu
            assigned_category = _assign_category_from_title(ev["title"], default_category)
            
            rec = Event(
                title=ev["title"], description=ev.get("description"),
                start_at=ev.get("start_at") or datetime.utcnow(), end_at=ev.get("end_at"),
                all_day=False, is_online=ev.get("is_online", False), meeting_url=None,
                location_name=ev.get("location_name"), address=None, organizer=None,
                university_name=assigned_uni, category=assigned_category, source_url=src_url,
                source_type="jsonld", source_uid=None, 
                hash=uni_hash, status="published",
            )
            db.add(rec)
    else:
        found = db.execute(select(Event).where(Event.hash==fp)).scalar_one_or_none()
        if found:
            rec = found
            rec.description = ev.get("description") or rec.description
            rec.start_at    = ev.get("start_at") or rec.start_at
            rec.end_at      = ev.get("end_at") or rec.end_at
            rec.is_online   = ev.get("is_online")
            rec.location_name = ev.get("location_name") or rec.location_name
            rec.university_name = uni_name
            rec.category = default_category or rec.category
            rec.source_url = src_url
        else:
            rec = Event(
                title=ev["title"], description=ev.get("description"),
                start_at=ev.get("start_at") or datetime.utcnow(), end_at=ev.get("end_at"),
                all_day=False, is_online=ev.get("is_online", False), meeting_url=None,
                location_name=ev.get("location_name"), address=None, organizer=None,
                university_name=uni_name, category=default_category, source_url=src_url,
                source_type="jsonld", source_uid=None, hash=fp, status="published",
            )
            db.add(rec)
    
    try: db.commit()
    except IntegrityError: db.rollback()

async def import_events_for_university(db: Session, uni_name: str, http: httpx.AsyncClient, sources_map: dict):
    sources = sources_map.get(uni_name) or []
    for s in sources:
        stype, url, cat = s.get("type"), s.get("url"), s.get("category")
        if not url: continue

        if stype == "ics":
            raw = await _fetch_ics(http, url)
            if raw:
                cal = Calendar.from_ical(raw)
                for comp in cal.walk("vevent"):
                    _upsert_event_from_vevent(db, comp, uni_name, url, cat)

        elif stype == "rss":
            items = await _fetch_rss_items(url, http)
            for it in items:
                _upsert_event_from_rss(db, it, uni_name, url, cat)

        elif stype == "discover":
            found = await discover_sources(url, http)
            for ics_url in found["ics"]:
                raw = await _fetch_ics(http, ics_url)
                if not raw: continue
                try:
                    cal = Calendar.from_ical(raw)
                    for comp in cal.walk("vevent"):
                        _upsert_event_from_vevent(db, comp, uni_name, ics_url, cat)
                except Exception:
                    pass
            for evobj in found["jsonld_events"]:
                ev = _event_from_jsonld(evobj)
                _upsert_event_from_jsonld(db, ev, uni_name, url, cat)
            for durl in found["detail_pages"]:
                try:
                    sub = await discover_sources(durl, http)
                    for ics_url in sub["ics"]:
                        raw = await _fetch_ics(http, ics_url)
                        if not raw: continue
                        cal = Calendar.from_ical(raw)
                        for comp in cal.walk("vevent"):
                            _upsert_event_from_vevent(db, comp, uni_name, ics_url, cat)
                    for evobj in sub["jsonld_events"]:
                        ev = _event_from_jsonld(evobj)
                        _upsert_event_from_jsonld(db, ev, uni_name, durl, cat)
                except Exception:
                    continue

def clean_duplicate_events(db: Session):
    """Usuń duplikaty wydarzeń na podstawie podobieństwa tytułów i dat"""
    from sqlalchemy import func, and_
    
    # Znajdź potencjalne duplikaty (te same tytuły w podobnym czasie)
    duplicates = db.execute(
        select(Event.title, func.count().label('count'))
        .where(Event.status == "published")
        .group_by(Event.title)
        .having(func.count() > 1)
    ).all()
    
    removed_count = 0
    for title, count in duplicates:
        # Znajdź wszystkie wydarzenia o tym tytule
        events = db.execute(
            select(Event).where(
                Event.title == title,
                Event.status == "published"
            ).order_by(Event.updated_at.desc())
        ).scalars().all()
        
        # Zostaw tylko najnowsze, usuń resztę
        if len(events) > 1:
            for event in events[1:]:  # Usuń wszystkie oprócz pierwszego (najnowszego)
                db.delete(event)
                removed_count += 1
    
    db.commit()
    print(f"🧹 Usunięto {removed_count} duplikatów wydarzeń")
    return removed_count

async def import_events_all(db: Session, http: httpx.AsyncClient, sources_map: dict):
    # Najpierw wyczyść stare duplikaty
    clean_duplicate_events(db)
    
    for uni_name in sources_map.keys():
        await import_events_for_university(db, uni_name, http, sources_map)

def build_event_ics(e) -> str:
    def fmt(dt: datetime | None):
        if not dt: return ""
        return dt.strftime("%Y%m%dT%H%M%SZ")
    uid = f"event-{e.id}@academicbooks.local"
    lines = [
        "BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//AcademicBooks//Events//PL","BEGIN:VEVENT",
        f"UID:{uid}",
        f"SUMMARY:{e.title}",
        f"DTSTART:{fmt(e.start_at)}" if e.start_at else "",
        f"DTEND:{fmt(e.end_at)}" if e.end_at else "",
        f"LOCATION:{e.location_name or e.address or ''}",
        f"DESCRIPTION:{_norm_txt(e.description or '')}",
        f"URL:{e.registration_url or e.source_url or ''}",
        "END:VEVENT","END:VCALENDAR",
    ]
    return "\r\n".join([l for l in lines if l is not None])
