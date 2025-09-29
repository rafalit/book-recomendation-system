import requests
import time
from typing import List, Dict, Any, Optional

GOOGLE_BOOKS_API = "https://www.googleapis.com/books/v1/volumes"
GOOGLE_BOOKS_API_KEY: Optional[str] = None  # <- ustaw w .env i wczytaj np. os.getenv("GOOGLE_BOOKS_API_KEY")


def search_google_books(query: str, max_results: int = 40) -> List[Dict[str, Any]]:
    """Wyszukaj książki w Google Books (tylko z okładką i autorem)."""
    results = []
    start = 0

    while len(results) < max_results:
        params = {
            "q": query,
            "maxResults": 40,   # Google Books limit per request
            "startIndex": start,
        }
        if GOOGLE_BOOKS_API_KEY:
            params["key"] = GOOGLE_BOOKS_API_KEY

        r = requests.get(GOOGLE_BOOKS_API, params=params)
        if r.status_code == 429:
            # limit – spróbuj poczekać i ponowić
            time.sleep(1)
            continue
        r.raise_for_status()

        data = r.json()
        items = data.get("items", [])
        if not items:
            break

        for item in items:
            info = item.get("volumeInfo", {})

            # 🚫 pomijamy książki bez okładki lub autora
            if not info.get("imageLinks", {}).get("thumbnail"):
                continue
            if not info.get("authors"):
                continue

            results.append({
                "google_id": item.get("id"),
                "title": info.get("title"),
                "authors": ", ".join(info.get("authors", [])),
                "published_date": info.get("publishedDate"),
                "categories": ", ".join(info.get("categories", [])),
                "description": info.get("description"),
                "thumbnail": info["imageLinks"]["thumbnail"],
                "language": info.get("language"),
                "page_count": info.get("pageCount"),
                "isbn": _extract_isbn(info),
            })

        start += 40
        time.sleep(0.1)  # lekkie opóźnienie żeby nie triggerować 429

    return results[:max_results]


def get_google_book_by_id(google_id: str) -> dict | None:
    url = f"{GOOGLE_BOOKS_API}/{google_id}"
    params = {}
    if GOOGLE_BOOKS_API_KEY:
        params["key"] = GOOGLE_BOOKS_API_KEY

    r = requests.get(url, params=params)
    if r.status_code != 200:
        return None
    item = r.json()
    info = item.get("volumeInfo", {})

    if not info.get("imageLinks", {}).get("thumbnail"):
        return None
    if not info.get("authors"):
        return None

    return {
        "google_id": item.get("id"),
        "title": info.get("title"),
        "authors": ", ".join(info.get("authors", [])),
        "published_date": info.get("publishedDate"),
        "categories": ", ".join(info.get("categories", [])),
        "description": info.get("description"),
        "thumbnail": info["imageLinks"]["thumbnail"],
        "language": info.get("language"),
        "page_count": info.get("pageCount"),
        "isbn": _extract_isbn(info),
    }


def _extract_isbn(info: Dict[str, Any]) -> str:
    for ident in info.get("industryIdentifiers", []):
        if ident.get("type") in ("ISBN_10", "ISBN_13"):
            return ident.get("identifier")
    return ""
