# app/routes/routes_rankings.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional, Dict
from app.db.database import get_db
from app import models, schemas
from .routes_books import _enrich_with_ratings, _persist_book
from app.services.book_cache import get_cached_books

router = APIRouter(prefix="/rankings", tags=["rankings"])

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
    results: Dict[str, List[schemas.book.BookOut]] = {}
    seen_global = set()  # 🔹 globalny set dla wszystkich uczelni

    for uni in q:
        # 🔹 lokalne
        local_books = (
            db.query(models.book.Book)
            .filter(models.book.Book.university == uni)
            .all()
        )
        local_books = [_enrich_with_ratings(db, b.__dict__) for b in local_books]

        # 🔹 cache Google Books
        cached = get_cached_books(db, uni) or []
        persisted = [
            _persist_book(db, b)
            for b in cached
            if b.get("thumbnail") and b.get("authors")
        ]
        enriched_cached = [_enrich_with_ratings(db, b) for b in persisted]

        # 🔹 scal lokalne i z Google
        books = local_books + enriched_cached

        # 🔹 deduplikacja globalna
        deduped = []
        for b in books:
            key = b.get("google_id") or b.get("isbn") or b.get("title")
            if key in seen_global:
                continue
            seen_global.add(key)
            deduped.append(b)

        # 🔹 filtry
        if year:
            deduped = [b for b in deduped if (b.get("published_date") or "").startswith(str(year))]
        if categories and "Wszystkie" not in categories:
            deduped = [
                b for b in deduped
                if any(c.lower() in (b.get("categories") or "").lower() for c in categories)
            ]
        deduped = [
            b for b in deduped
            if min_stars <= (b.get("avg_rating") or 0) <= max_stars
        ]

        # 🔹 sortowanie
        reverse = order == "desc"
        if sort_by == "avg_rating":
            deduped.sort(key=lambda b: b.get("avg_rating") or 0, reverse=reverse)
        elif sort_by == "reviews_count":
            deduped.sort(key=lambda b: b.get("reviews_count") or 0, reverse=reverse)
        else:
            deduped.sort(key=lambda b: b.get("title") or "", reverse=reverse)

        # 🔹 limit + wrzucenie do results
        results[uni] = [schemas.book.BookOut(**b) for b in deduped[:limit_each]]

    return results
