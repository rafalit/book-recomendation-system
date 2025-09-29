from __future__ import annotations
import json
from urllib.parse import urljoin, urlparse
from typing import Optional, Dict, Any, List, Set

import httpx
from selectolax.parser import HTMLParser

# hosty z problematycznym TLS — opcjonalny fallback
_BAD_TLS = {"krakow.ast.krakow.pl", "www.ast.krakow.pl"}

CAL_MIME_TYPES = {"text/calendar", "application/calendar+json"}

async def _safe_get(url: str, http: httpx.AsyncClient) -> Optional[httpx.Response]:
    try:
        r = await http.get(url, headers={"Accept": "text/html,application/xhtml+xml,*/*"})
        r.raise_for_status()
        return r
    except httpx.ConnectError:
        host = (urlparse(url).hostname or "").lower()
        if host in _BAD_TLS:
            # 1) spróbuj bez weryfikacji certu (po HTTPS)
            try:
                r = await http.get(url, headers={"Accept": "text/html,application/xhtml+xml,*/*"}, verify=False)
                if r.status_code == 200:
                    return r
            except Exception:
                pass
            # 2) spróbuj HTTP (jeśli podany był HTTPS)
            if url.startswith("https://"):
                try:
                    u2 = "http://" + url[len("https://"):]
                    r = await http.get(u2, headers={"Accept": "text/html,application/xhtml+xml,*/*"})
                    if r.status_code == 200:
                        return r
                except Exception:
                    pass
    except Exception:
        pass
    return None

async def discover_sources(url: str, http: httpx.AsyncClient) -> Dict[str, Any]:
    """
    Zwraca: { rss: [..], ics: [..], jsonld_events: [...], detail_pages: [..] }
    """
    out_rss: Set[str] = set()
    out_ics: Set[str] = set()
    out_details: Set[str] = set()
    out_jsonld: List[dict] = []

    r = await _safe_get(url, http)
    if not r or r.status_code != 200 or not r.text:
        return {"rss": [], "ics": [], "jsonld_events": [], "detail_pages": []}

    tree = HTMLParser(r.text)

    # <link rel="alternate">
    for n in tree.css('link[rel="alternate"]'):
        t = (n.attributes.get("type") or "").lower()
        href = n.attributes.get("href") or ""
        if not href:
            continue
        full = urljoin(url, href)
        if t in ("application/rss+xml", "application/atom+xml"):
            out_rss.add(full)
        if t in CAL_MIME_TYPES or "ical" in href.lower() or href.lower().endswith(".ics"):
            out_ics.add(full)

    # Anchory z .ics / „iCal”
    for a in tree.css("a[href]"):
        href = a.attributes.get("href") or ""
        full = urljoin(url, href)
        txt = (a.text() or "").lower()
        if any(k in txt for k in ("ical", "ics")) or full.lower().endswith(".ics") or ("type=" in full and "ical" in full.lower()):
            out_ics.add(full)

    # JSON-LD (Event)
    for s in tree.css('script[type="application/ld+json"]'):
        try:
            data = json.loads(s.text())
        except Exception:
            continue
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

    # Linki do „szczegółów wydarzeń”
    for a in tree.css("a[href]"):
        href = a.attributes.get("href") or ""
        full = urljoin(url, href)
        if any(x in full.lower() for x in ("/wydarzenia", "/events", "/konferenc", "tx_sfeventmgt", "/repertuar", "/kalendarium", "/artykul/")):
            out_details.add(full)

    return {
        "rss": list(out_rss),
        "ics": list(out_ics),
        "jsonld_events": out_jsonld,
        "detail_pages": list(out_details)[:50],
    }
