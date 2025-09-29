from __future__ import annotations
from fastapi import APIRouter, HTTPException, Query
from ..core.http_client import get_http
from ..services.discovery import discover_sources

router = APIRouter(prefix="/_debug", tags=["debug"])

@router.get("/discover")
async def debug_discover(url: str = Query(..., description="URL strony uczelni/organizatora")):
    http = get_http()
    if http is None:
        raise HTTPException(503, "HTTP client not ready")
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
