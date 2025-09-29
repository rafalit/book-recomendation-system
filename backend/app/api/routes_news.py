from __future__ import annotations
import asyncio, time, re, hashlib
from typing import Optional
from urllib.parse import urljoin, quote_plus, urlparse, parse_qs
from datetime import date

import httpx, feedparser
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from ..core.http_client import get_http

router = APIRouter(tags=["news"])

# --- Model odpowiedzi ---
class NewsItem(BaseModel):
    title: str
    link: str
    source: str | None = None
    snippet: str | None = None
    date: str | None = None
    thumbnail: str | None = None
    publisher_domain: str | None = None
    publisher_favicon: str | None = None

# --- Config / cache ---
FEEDS: dict[str, list[str]] = {}
_NEWS_CACHE: dict[tuple[str,int], tuple[float, list[NewsItem]]] = {}
_NEWS_CACHE_TTL = 120.0
_NEWS_CACHE_LOCK = asyncio.Lock()

# --- Utils (skrócone, 1:1 z main.py) ---
_HREF_RE = re.compile(r'href=["\']([^"\']+)["\']', re.I)
def extract_first_href(html: str | None) -> str | None:
    if not html: return None
    m = _HREF_RE.search(html); return m.group(1) if m else None

_TAG_RE = re.compile(r"<[^>]+>")
def strip_html(s: str | None) -> str:
    if not s: return ""
    import re as _re
    text = _TAG_RE.sub("", s); return _re.sub(r"\s+", " ", text).strip()

_NORM_RE = re.compile(r"[\s\-\–\—\:;,\.\!\?\"“”\'’]+", re.U)
def _norm(s: str) -> str:
    return _NORM_RE.sub(" ", s.lower()).strip()

def take_2_3_sentences(text: str, limit: int = 280) -> str:
    import re as _re
    parts = _re.split(r"(?<=[\.\!\?…])\s+", text)
    preview = " ".join([p for p in parts if p][:3]).strip()
    if len(preview) > limit:
        preview = _re.sub(r"\s+\S*$", "", preview[:limit]) + "…"
    return preview

def google_news_rss(q: str) -> str:
    return f"https://news.google.com/rss/search?q={quote_plus(q)}&hl=pl&gl=PL&ceid=PL:pl"

def _publisher_host_from_url(u: Optional[str]) -> Optional[str]:
    if not u: return None
    h = (urlparse(u).hostname or "").replace("www.", "")
    return h or None

async def _fetch_feed(http: httpx.AsyncClient, url: str):
    try:
        r = await http.get(url, headers={"Accept": "application/rss+xml, application/xml, */*"})
        r.raise_for_status()
        return feedparser.parse(r.content)
    except Exception:
        return None

async def fetch_og(url: str, http: httpx.AsyncClient) -> dict:
    # prosty, lokalny cache
    if not hasattr(fetch_og, "_c"): fetch_og._c = {}  # type: ignore
    cache = fetch_og._c  # type: ignore
    import time as _t, re as _re
    now = _t.time()
    rec = cache.get(url)
    if rec and now - rec[0] < 6*3600: return rec[1]
    out = {}
    try:
        r = await http.get(url)
        r.raise_for_status()
        html = r.text
        meta = _re.findall(
            r'<meta[^>]+?(?:property|name)=["\'](og:image|twitter:image|og:description|description|og:site_name|og:url)["\'][^>]+?content=["\']([^"\']+)["\']',
            html, flags=_re.I
        )
        for name, content in meta:
            k = name.lower()
            if k in ("og:image","twitter:image") and "image" not in out:
                out["image"] = content
            elif k in ("og:description","description") and "description" not in out:
                out["description"] = content
            elif k == "og:site_name" and "site_name" not in out:
                out["site_name"] = content
            elif k == "og:url" and "url" not in out:
                out["url"] = content
    except Exception:
        pass
    cache[url] = (now, out)  # type: ignore
    return out

def resolve_google_link_fast(url: str) -> str:
    try:
        p = urlparse(url)
        if "google." not in (p.hostname or "").lower():
            return url
        qs = parse_qs(p.query or "")
        return (qs.get("url") or [None])[0] or url
    except Exception:
        return url

async def _build_news_for_query(http: httpx.AsyncClient, q: str, max_results: int) -> list[NewsItem]:
    q = q.strip()
    if not q: return []
    targets = FEEDS.get(q, []) or [google_news_rss(q)]
    feeds = await asyncio.gather(*[_fetch_feed(http, u) for u in targets])

    entries = []
    for f in feeds or []:
        if f: entries.extend(f.entries[:max_results])

    pre = []
    for e in entries:
        title = getattr(e, "title", "") or ""
        link  = getattr(e, "link", "") or ""
        html  = getattr(e, "summary", None)
        text  = strip_html(html)
        date  = getattr(e, "published", None) or getattr(e, "updated", None)
        src_title = getattr(getattr(e, "feed", None) or {}, "title", None) or getattr(getattr(e, "source", None) or {}, "title", None)
        thumb = None
        if hasattr(e, "media_thumbnail") and e.media_thumbnail:
            thumb = e.media_thumbnail[0].get("url")
        elif hasattr(e, "media_content") and e.media_content:
            thumb = e.media_content[0].get("url")
        raw_url = extract_first_href(html) or link
        article_url = resolve_google_link_fast(raw_url)
        pre.append(dict(entry=e, title=title, text=text, date=date, thumb=thumb, url=article_url, src_title=src_title))

    async def enrich(it) -> NewsItem:
        e, title, text, date, thumb, url, src_title = it.values()
        if _norm(text) == _norm(title) or _norm(text).startswith(_norm(title)):
            text = ""
        need_og = (not thumb) or (not text or len(text) < 40)
        og = await fetch_og(url, http) if (need_og and url) else {}
        if (not text or len(text) < 40) and og.get("description") and _norm(og["description"]) != _norm(title):
            text = og["description"]
        thumb = thumb or (og.get("image") and urljoin(url, og["image"])) or None
        host = _publisher_host_from_url(url)
        if host and "google." in host:
            try:
                src = getattr(e, "source", None)
                src_url = getattr(src, "href", None) or (src.get("href") if isinstance(src, dict) else None)
                src_host = _publisher_host_from_url(src_url)
                if src_host: host = src_host
            except Exception:
                pass
        fav = f"https://icons.duckduckgo.com/ip3/{host}.ico" if host else None
        return NewsItem(
            title=title,
            link=url or getattr(e,"link","") or "",
            source=og.get("site_name") or src_title,
            snippet=take_2_3_sentences(text) if text else None,
            date=date,
            thumbnail=thumb,
            publisher_domain=host,
            publisher_favicon=fav,
        )

    out = await asyncio.gather(*[enrich(it) for it in pre])
    uniq = {}
    for n in out:
        if n.link and n.link not in uniq: uniq[n.link] = n
    return list(uniq.values())[:max_results]

# --- Endpoints ---
@router.get("/news", response_model=list[NewsItem])
async def news(q: str = Query(..., min_length=1), max_results: int = 12):
    http = get_http()
    if http is None:
        raise HTTPException(503, "HTTP client not ready")
    key = (q.strip(), int(max_results)); now = time.time()
    async with _NEWS_CACHE_LOCK:
        cached = _NEWS_CACHE.get(key)
        if cached and (now - cached[0] < _NEWS_CACHE_TTL):
            return cached[1]
    data = await _build_news_for_query(http, q, max_results)
    async with _NEWS_CACHE_LOCK:
        _NEWS_CACHE[key] = (time.time(), data)
    return data

@router.get("/news/multi", response_model=dict[str, list[NewsItem]])
async def news_multi(q: str = Query(..., description="Lista zapytań rozdzielona przecinkami"),
                     limit_each: int = 6):
    http = get_http()
    if http is None:
        raise HTTPException(503, "HTTP client not ready")
    queries = [s.strip() for s in q.split(",") if s.strip()]
    if not queries: return {}
    async def get_for(single_q: str):
        key = (single_q, int(limit_each)); now = time.time()
        async with _NEWS_CACHE_LOCK:
            cached = _NEWS_CACHE.get(key)
            if cached and (now - cached[0] < _NEWS_CACHE_TTL):
                return single_q, cached[1]
        data = await _build_news_for_query(http, single_q, limit_each)
        async with _NEWS_CACHE_LOCK:
            _NEWS_CACHE[key] = (time.time(), data)
        return single_q, data
    pairs = await asyncio.gather(*[get_for(s) for s in queries])
    return {k: v for k, v in pairs}
