# app/routes/routes_rankings.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional, Dict
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock
import time
import hashlib
from app.db.database import SessionLocal
from app.db.database import get_db
from app import models, schemas
from .routes_books import _enrich_with_ratings, _persist_book
from app.services.book_cache import get_cached_books

router = APIRouter(prefix="/rankings", tags=["rankings"])

# 🚀 Cache dla wyników rankingów (5 minut TTL)
_RANKINGS_CACHE = {}
_RANKINGS_CACHE_LOCK = Lock()
_RANKINGS_CACHE_TTL = 300  # 5 minut

# ✅ zoptymalizowana funkcja do batch enrichment
def _enrich_books_batch(db: Session, books: List[dict]) -> List[dict]:
    """Wzbogaca listę książek o oceny w jednym zapytaniu batch"""
    if not books:
        return books
    
    # Pobierz tylko książki z ID
    books_with_id = [b for b in books if b.get("id")]
    if not books_with_id:
        return books
    
    book_ids = [b["id"] for b in books_with_id]
    
    # Jedno zapytanie dla wszystkich ocen
    ratings_data = (
        db.query(
            models.book.Review.book_id,
            func.avg(models.book.Review.rating).label("avg_rating"),
            func.count(models.book.Review.id).label("reviews_count")
        )
        .filter(models.book.Review.book_id.in_(book_ids))
        .group_by(models.book.Review.book_id)
        .all()
    )
    
    # Stwórz mapę book_id -> (avg_rating, reviews_count)
    ratings_map = {
        row.book_id: (round(row.avg_rating, 1), row.reviews_count)
        for row in ratings_data
    }
    
    # Wzbogać książki
    for book in books:
        if book.get("id") and book["id"] in ratings_map:
            avg_rating, reviews_count = ratings_map[book["id"]]
            book["avg_rating"] = avg_rating
            book["reviews_count"] = reviews_count
        else:
            book["avg_rating"] = 0.0
            book["reviews_count"] = 0
    
    return books

def _process_university_rankings(uni: str, min_stars: float, max_stars: float, 
                                sort_by: str, order: str, limit_each: int, 
                                year: Optional[int], categories: Optional[List[str]]) -> tuple[str, List[dict]]:
    """Przetwarza rankingi dla jednej uczelni - do użycia w ThreadPoolExecutor"""
    # Tworzymy nową sesję dla tego wątku
    db = SessionLocal()
    try:
        # 🔹 lokalne książki
        local_books = (
            db.query(models.book.Book)
            .filter(models.book.Book.university == uni)
            .all()
        )
        local_books = [b.__dict__ for b in local_books]

        # 🔹 cache Google Books
        cached = get_cached_books(db, uni) or []
        persisted = [
            _persist_book(db, b)
            for b in cached
            if b.get("thumbnail") and b.get("authors")
        ]

        # 🔹 scal lokalne i z Google
        all_books = local_books + persisted
        
        # 🔹 batch enrichment - jedno zapytanie dla wszystkich książek tej uczelni
        all_books = _enrich_books_batch(db, all_books)

        # 🔹 filtry
        if year:
            all_books = [b for b in all_books if (b.get("published_date") or "").startswith(str(year))]
        if categories and "Wszystkie" not in categories:
            all_books = [
                b for b in all_books
                if any(c.lower() in (b.get("categories") or "").lower() for c in categories)
            ]
        all_books = [
            b for b in all_books
            if min_stars <= (b.get("avg_rating") or 0) <= max_stars
        ]

        # 🔹 sortowanie
        reverse = order == "desc"
        if sort_by == "avg_rating":
            all_books.sort(key=lambda b: b.get("avg_rating") or 0, reverse=reverse)
        elif sort_by == "reviews_count":
            all_books.sort(key=lambda b: b.get("reviews_count") or 0, reverse=reverse)
        else:
            all_books.sort(key=lambda b: b.get("title") or "", reverse=reverse)

        return uni, all_books[:limit_each]
    
    finally:
        db.close()

@router.get("", response_model=List[schemas.book.BookOut])
def list_rankings(
    db: Session = Depends(get_db),
    uni: Optional[str] = Query(None, description="Nazwa uczelni"),
    min_stars: float = Query(0, ge=0, le=5),
    max_stars: float = Query(5, ge=0, le=5),
    sort_by: str = Query("avg_rating", regex="^(|avg_rating|reviews_count)$"),
    order: str = Query("desc", regex="^(asc|desc)$"),
    limit: int = Query(20, le=100),
    year: Optional[int] = None,
    categories: Optional[List[str]] = Query(None),
):
    # 🔹 Tryb 1: konkretna uczelnia
    if uni and uni.lower() != "wszystkie":
        # lokalne książki
        local_books = (
            db.query(models.book.Book)
            .filter(models.book.Book.university == uni)
            .all()
        )
        local_books = [_enrich_with_ratings(db, b.__dict__) for b in local_books]

        # cache Google Books
        cached = get_cached_books(db, uni) or []
        persisted = [
            _persist_book(db, b)
            for b in cached
            if b.get("thumbnail") and b.get("authors")
        ]
        enriched_cached = [_enrich_with_ratings(db, b) for b in persisted]

        books = local_books + enriched_cached

        # filtry
        if year:
            books = [b for b in books if (b.get("published_date") or "").startswith(str(year))]
        if categories and "Wszystkie" not in categories:
            books = [
                b for b in books
                if any(c.lower() in (b.get("categories") or "").lower() for c in categories)
            ]
        books = [
            b for b in books
            if min_stars <= (b.get("avg_rating") or 0) <= max_stars
        ]

        # sortowanie
        reverse = order == "desc"
        if sort_by == "avg_rating":
            books.sort(key=lambda b: b.get("avg_rating") or 0, reverse=reverse)
        elif sort_by == "reviews_count":
            books.sort(key=lambda b: b.get("reviews_count") or 0, reverse=reverse)
        else:
            books.sort(key=lambda b: b.get("title") or "", reverse=reverse)

        return [schemas.book.BookOut(**b) for b in books[:limit]]

    # 🔹 Tryb 2: wszystkie uczelnie
    q = (
        db.query(models.book.Book)
        .outerjoin(models.book.Review)
        .group_by(models.book.Book.id)
        .having(func.coalesce(func.avg(models.book.Review.rating), 0) >= min_stars)
        .having(func.coalesce(func.avg(models.book.Review.rating), 0) <= max_stars)
    )

    if year:
        q = q.filter(models.book.Book.published_date.like(f"{year}%"))
    if categories and "Wszystkie" not in categories:
        q = q.filter(or_(*[models.book.Book.categories.ilike(f"%{c}%") for c in categories]))

    # sortowanie SQL
    if sort_by == "avg_rating":
        sort_expr = func.coalesce(func.avg(models.book.Review.rating), 0)
    elif sort_by == "reviews_count":
        sort_expr = func.count(models.book.Review.id)
    else:
        sort_expr = models.book.Book.title

    q = q.order_by(sort_expr.desc() if order == "desc" else sort_expr.asc())

    books = q.limit(limit).all()
    enriched = [_enrich_with_ratings(db, b.__dict__) for b in books]
    return [schemas.book.BookOut(**b) for b in enriched]


@router.get("/multi", response_model=Dict[str, List[schemas.book.BookOut]])
def rankings_multi(
    db: Session = Depends(get_db),
    q: List[str] = Query(..., description="Lista uczelni"),
    min_stars: float = Query(0, ge=0, le=5),
    max_stars: float = Query(5, ge=0, le=5),
    sort_by: str = Query("avg_rating", regex="^(|avg_rating|reviews_count)$"),
    order: str = Query("desc", regex="^(asc|desc)$"),
    limit_each: int = Query(100, le=500),
    year: Optional[int] = None,
    categories: Optional[List[str]] = Query(None),
):
    """🚀 Zoptymalizowana wersja z równoległym przetwarzaniem i batch enrichment"""
    
    # 🚀 Cache check
    cache_key = hashlib.md5(
        f"{sorted(q)}_{min_stars}_{max_stars}_{sort_by}_{order}_{limit_each}_{year}_{sorted(categories or [])}".encode()
    ).hexdigest()
    
    now = time.time()
    with _RANKINGS_CACHE_LOCK:
        cached = _RANKINGS_CACHE.get(cache_key)
        if cached and (now - cached[0] < _RANKINGS_CACHE_TTL):
            return cached[1]
    
    results: Dict[str, List[schemas.book.BookOut]] = {}
    seen_global = set()  # 🔹 globalny set dla wszystkich uczelni
    
    # 🚀 Równoległe przetwarzanie uczelni
    with ThreadPoolExecutor(max_workers=min(8, len(q))) as executor:
        # Uruchom zadania dla wszystkich uczelni równolegle
        future_to_uni = {
            executor.submit(
                _process_university_rankings, 
                uni, min_stars, max_stars, sort_by, order, limit_each, year, categories
            ): uni for uni in q
        }
        
        # Zbierz wyniki w miarę ich gotowości
        for future in as_completed(future_to_uni):
            try:
                uni, books = future.result()
                
                # 🔹 deduplikacja globalna (thread-safe)
                deduped = []
                for b in books:
                    key = b.get("google_id") or b.get("isbn") or b.get("title")
                    if key in seen_global:
                        continue
                    seen_global.add(key)
                    deduped.append(b)
                
                results[uni] = [schemas.book.BookOut(**b) for b in deduped]
                
            except Exception as e:
                print(f"❌ Błąd przetwarzania uczelni '{future_to_uni[future]}': {e}")
                # W przypadku błędu, dodaj pustą listę
                results[future_to_uni[future]] = []

    # 🚀 Cache wyników
    with _RANKINGS_CACHE_LOCK:
        _RANKINGS_CACHE[cache_key] = (now, results)
    
    return results
