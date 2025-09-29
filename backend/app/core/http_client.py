# app/http_client.py
from __future__ import annotations
import httpx, certifi

_client: httpx.AsyncClient | None = None

def get_http() -> httpx.AsyncClient:
    """Zwraca singleton AsyncClient; tworzy go przy pierwszym użyciu."""
    global _client
    if _client is None:
        _client = httpx.AsyncClient(
            timeout=httpx.Timeout(7.0),
            follow_redirects=True,
            limits=httpx.Limits(max_connections=50, max_keepalive_connections=20),
            headers={"User-Agent": "Mozilla/5.0 (NewsFetcher; +http://localhost)"},
            verify=certifi.where(),
        )
    return _client

async def close_http() -> None:
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None
