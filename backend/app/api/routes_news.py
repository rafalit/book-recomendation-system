from __future__ import annotations
import asyncio, time, re, hashlib
from typing import Optional
from urllib.parse import urljoin, quote_plus, urlparse, parse_qs
from datetime import date, datetime, timedelta

import httpx, feedparser
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from ..core.http_client import get_http
from ..constants.univeristy_queries import UNI_NEWS_QUERIES

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

# RSS feeds dla księgarni i bibliotek (zoptymalizowane - tylko najważniejsze)
BOOK_RSS_FEEDS = {
    # Księgarnie internetowe (najważniejsze)
    "książki": [
        "https://lubimyczytac.pl/rss/nowosci",
        "https://www.empik.com/rss/ksiazki",
    ],
    # Biblioteki uczelniane (najważniejsze)
    "biblioteki": [
        "https://www.bj.uj.edu.pl/rss",
    ],
    # Wydawnictwa naukowe (najważniejsze)
    "wydawnictwa": [
        "https://www.pwn.pl/rss/nowosci",
    ],
}

# Ogólne zapytania związane z książkami i nauką
GENERAL_BOOK_NEWS_QUERIES = [
    "książki nauka", "biblioteki akademickie", "nauka książki",
    "literatura naukowa", "książki edukacja", "nauka biblioteka",
    "książki badania", "nauka publikacje", "książki uniwersytet",
    "nauka literatura", "książki akademickie", "nauka książki"
]

_NEWS_CACHE: dict[tuple[str,int], tuple[float, list[NewsItem]]] = {}
_NEWS_CACHE_TTL = 300.0  # 5 minut zamiast 2
_NEWS_CACHE_LOCK = asyncio.Lock()

# Cache dla multi-request
_MULTI_NEWS_CACHE: dict[str, tuple[float, dict[str, list[NewsItem]]]] = {}
_MULTI_NEWS_CACHE_TTL = 600.0  # 10 minut dla multi-request
_MULTI_NEWS_CACHE_LOCK = asyncio.Lock()

# Semafor do ograniczenia równoległych zapytań fetch_og
_FETCH_OG_SEMAPHORE = asyncio.Semaphore(5)  # Maksymalnie 5 równoległych zapytań

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

# Słowa kluczowe związane z książkami
BOOK_KEYWORDS = [
    "książka", "książki", "książek", "książką", "książkami",
    "publikacja", "publikacje", "publikacji", "publikacją", "publikacjami",
    "wydawnictwo", "wydawnictwa", "wydawnictwem", "wydawnictwami",
    "tom", "tomy", "tomu", "tomem", "tomami",
    "lektura", "lektury", "lektury", "lektura", "lekturami",
    "biblioteka", "biblioteki", "biblioteką", "bibliotekami",
    "literatura", "literatury", "literaturą", "literaturami",
    "pozycja", "pozycje", "pozycji", "pozycją", "pozycjami",
    "tytuł", "tytuły", "tytułu", "tytułem", "tytułami",
    "wydanie", "wydania", "wydania", "wydaniem", "wydaniami",
    "nowość", "nowości", "nowości", "nowością", "nowościami",
    "premiera", "premiery", "premiery", "premierą", "premierami",
    "targi książek", "targi książki", "wystawa książek", "wystawa książki",
    "konferencja książkowa", "konferencje książkowe", "spotkanie z książką",
    "recenzja książki", "recenzje książek", "omówienie książki",
    "autor książki", "autorka książki", "pisarz", "pisarka",
    "czytelnik", "czytelnicy", "czytelniczka", "czytelniczki"
]

def contains_book_keyword(title: str) -> bool:
    """Sprawdza czy tytuł zawiera słowa kluczowe związane z książkami"""
    if not title:
        return False
    
    title_lower = _norm(title)
    
    # Sprawdź czy tytuł zawiera jakiekolwiek słowo kluczowe
    for keyword in BOOK_KEYWORDS:
        if keyword in title_lower:
            return True
    
    return False

def is_within_last_year(date_str: str) -> bool:
    """Sprawdza czy data jest z ostatniego roku"""
    if not date_str:
        return True  # Jeśli brak daty, zaakceptuj
    
    try:
        # Parsuj różne formaty dat
        parsed_date = None
        
        # Spróbuj różne formaty dat
        for fmt in [
            "%a, %d %b %Y %H:%M:%S %Z",
            "%a, %d %b %Y %H:%M:%S %z", 
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%d",
            "%d %b %Y",
            "%d %B %Y"
        ]:
            try:
                parsed_date = datetime.strptime(date_str, fmt)
                break
            except ValueError:
                continue
        
        if not parsed_date:
            return True  # Jeśli nie można sparsować, zaakceptuj
        
        # Sprawdź czy data jest z ostatniego roku
        one_year_ago = datetime.now() - timedelta(days=365)
        return parsed_date >= one_year_ago
        
    except Exception:
        return True  # W przypadku błędu, zaakceptuj

def take_2_3_sentences(text: str, limit: int = 280) -> str:
    import re as _re
    parts = _re.split(r"(?<=[\.\!\?…])\s+", text)
    preview = " ".join([p for p in parts if p][:3]).strip()
    if len(preview) > limit:
        preview = _re.sub(r"\s+\S*$", "", preview[:limit]) + "…"
    return preview

def google_news_rss(q: str) -> str:
    # Ograniczenie do newsów z ostatniego roku
    return f"https://news.google.com/rss/search?q={quote_plus(q)}&hl=pl&gl=PL&ceid=PL:pl&tbs=qdr:y"

def _publisher_host_from_url(u: Optional[str]) -> Optional[str]:
    if not u: return None
    h = (urlparse(u).hostname or "").replace("www.", "")
    return h or None

async def _fetch_feed(http: httpx.AsyncClient, url: str):
    try:
        r = await http.get(url, headers={"Accept": "application/rss+xml, application/xml, */*"}, timeout=5.0)
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
    
    # Ograniczenie równoległych zapytań
    async with _FETCH_OG_SEMAPHORE:
        try:
            # Krótszy timeout i ograniczenie rozmiaru odpowiedzi
            r = await http.get(url, timeout=5.0, follow_redirects=True)
            r.raise_for_status()
            # Ograniczenie do pierwszych 50KB HTML
            html = r.text[:50000]
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
    
    # Sprawdź czy to nazwa uczelni - jeśli tak, użyj zapytań związanych z książkami
    if q in UNI_NEWS_QUERIES:
        # Użyj wszystkich zapytań dla danej uczelni
        queries = UNI_NEWS_QUERIES[q]
        all_entries = []
        
        # Pobierz newsy równolegle dla wszystkich zapytań (szybsze)
        all_targets = []
        for query in queries:
            targets = FEEDS.get(query, []) or [google_news_rss(query)]
            all_targets.extend(targets)
        
        # Dodaj RSS feeds dla książek
        for category, rss_urls in BOOK_RSS_FEEDS.items():
            all_targets.extend(rss_urls)
        
        # Pobierz wszystkie feeds równolegle
        feeds = await asyncio.gather(*[_fetch_feed(http, u) for u in all_targets])
        
        # Zbierz wszystkie entries
        for f in feeds or []:
            if f: all_entries.extend(f.entries[:max_results // 2])  # Połowa z każdego źródła
        
        entries = all_entries
    else:
        # Dla innych zapytań użyj standardowego mechanizmu + RSS feeds
        targets = FEEDS.get(q, []) or [google_news_rss(q)]
        
        # Dodaj RSS feeds dla książek jeśli zapytanie zawiera słowo "książka"
        if "książka" in q.lower() or "książki" in q.lower():
            for category, rss_urls in BOOK_RSS_FEEDS.items():
                targets.extend(rss_urls)
        
        feeds = await asyncio.gather(*[_fetch_feed(http, u) for u in targets])

        entries = []
        for f in feeds or []:
            if f: entries.extend(f.entries[:max_results])

    pre = []
    for e in entries:
        title = getattr(e, "title", "") or ""
        date  = getattr(e, "published", None) or getattr(e, "updated", None)
        
        # Filtruj tylko newsy zawierające słowa kluczowe związane z książkami w tytule
        if not contains_book_keyword(title):
            continue
        
        # Filtruj tylko newsy z ostatniego roku
        if not is_within_last_year(date):
            continue
            
        link  = getattr(e, "link", "") or ""
        html  = getattr(e, "summary", None)
        text  = strip_html(html)
        src_title = getattr(getattr(e, "feed", None) or {}, "title", None) or getattr(getattr(e, "source", None) or {}, "title", None)
        thumb = None
        if hasattr(e, "media_thumbnail") and e.media_thumbnail:
            thumb = e.media_thumbnail[0].get("url")
        elif hasattr(e, "media_content") and e.media_content:
            thumb = e.media_content[0].get("url")
        raw_url = extract_first_href(html) or link
        article_url = resolve_google_link_fast(raw_url)
        pre.append(dict(entry=e, title=title, text=text, date=date, thumb=thumb, url=article_url, src_title=src_title))

    # 🚀 Ograniczenie liczby newsów do przetworzenia (max 30 zamiast wszystkich)
    pre_limited = pre[:30]
    
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

    out = await asyncio.gather(*[enrich(it) for it in pre_limited])
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
                     limit_each: int = 4):
    http = get_http()
    if http is None:
        raise HTTPException(503, "HTTP client not ready")
    queries = [s.strip() for s in q.split(",") if s.strip()]
    if not queries: return {}
    
    # 🚀 Cache na poziomie całego multi-request
    cache_key = f"{sorted(queries)}_{limit_each}"
    now = time.time()
    async with _MULTI_NEWS_CACHE_LOCK:
        cached = _MULTI_NEWS_CACHE.get(cache_key)
        if cached and (now - cached[0] < _MULTI_NEWS_CACHE_TTL):
            return cached[1]
    
    # 🚀 Ograniczenie liczby równoległych zapytań
    max_concurrent = min(5, len(queries))  # Maksymalnie 5 równoległych zapytań
    
    # Jeśli to są nazwy uczelni, użyj zapytań związanych z książkami
    if all(uni in UNI_NEWS_QUERIES for uni in queries):
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
        
        # 🚀 Ograniczenie równoległych zapytań
        semaphore = asyncio.Semaphore(max_concurrent)
        async def limited_get_for(single_q: str):
            async with semaphore:
                return await get_for(single_q)
        
        pairs = await asyncio.gather(*[limited_get_for(s) for s in queries])
        result = {k: v for k, v in pairs}
        
        # 🚀 Cache wyników
        async with _MULTI_NEWS_CACHE_LOCK:
            _MULTI_NEWS_CACHE[cache_key] = (time.time(), result)
        return result
    else:
        # Dla innych zapytań użyj standardowego mechanizmu + RSS feeds
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
        
        # Jeśli "wszystkie" jest w zapytaniach, użyj RSS feeds
        if "wszystkie" in queries:
            # Pobierz newsy z RSS feeds dla wszystkich kategorii książek równolegle
            all_rss_urls = []
            for category, rss_urls in BOOK_RSS_FEEDS.items():
                all_rss_urls.extend(rss_urls)
            
            # 🚀 Ograniczenie równoległych zapytań RSS
            semaphore = asyncio.Semaphore(3)  # Maksymalnie 3 równoległe zapytania RSS
            async def limited_fetch_feed(url):
                async with semaphore:
                    return await _fetch_feed(http, url)
            
            feeds = await asyncio.gather(*[limited_fetch_feed(url) for url in all_rss_urls])
            
            all_entries = []
            for f in feeds or []:
                if f: all_entries.extend(f.entries[:limit_each // 2])  # Połowa z każdego źródła
            
            # Przetwórz entries na NewsItem
            pre = []
            for e in all_entries:
                title = getattr(e, "title", "") or ""
                date  = getattr(e, "published", None) or getattr(e, "updated", None)
                
                # Filtruj tylko newsy zawierające słowa kluczowe związane z książkami w tytule
                if not contains_book_keyword(title):
                    continue
                
                # Filtruj tylko newsy z ostatniego roku
                if not is_within_last_year(date):
                    continue
                    
                link  = getattr(e, "link", "") or ""
                html  = getattr(e, "summary", None)
                text  = strip_html(html)
                src_title = getattr(getattr(e, "feed", None) or {}, "title", None) or getattr(getattr(e, "source", None) or {}, "title", None)
                thumb = None
                if hasattr(e, "media_thumbnail") and e.media_thumbnail:
                    thumb = e.media_thumbnail[0].get("url")
                elif hasattr(e, "media_content") and e.media_content:
                    thumb = e.media_content[0].get("url")
                raw_url = extract_first_href(html) or link
                article_url = resolve_google_link_fast(raw_url)
                pre.append(dict(entry=e, title=title, text=text, date=date, thumb=thumb, url=article_url, src_title=src_title))
            
            # 🚀 Ograniczenie równoległych zapytań enrich
            enrich_semaphore = asyncio.Semaphore(3)  # Maksymalnie 3 równoległe zapytania enrich
            async def enrich(it) -> NewsItem:
                async with enrich_semaphore:
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
            data = list(uniq.values())[:limit_each]
            
            result = {"wszystkie": data}
            # 🚀 Cache wyników
            async with _MULTI_NEWS_CACHE_LOCK:
                _MULTI_NEWS_CACHE[cache_key] = (time.time(), result)
            return result
        else:
            # 🚀 Ograniczenie równoległych zapytań
            semaphore = asyncio.Semaphore(max_concurrent)
            async def limited_get_for(single_q: str):
                async with semaphore:
                    return await get_for(single_q)
            
            pairs = await asyncio.gather(*[limited_get_for(s) for s in queries])
            result = {k: v for k, v in pairs}
            
            # 🚀 Cache wyników
            async with _MULTI_NEWS_CACHE_LOCK:
                _MULTI_NEWS_CACHE[cache_key] = (time.time(), result)
            return result
