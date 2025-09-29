# app/services/books_refresh.py
from sqlalchemy.orm import Session
from app.services.google_books import search_google_books
from app.services.book_cache import set_cached_books
from app.constants.univeristy_queries import UNI_BOOK_QUERIES
from app import models
from sqlalchemy import func

# potrzebne pomocnicze funkcje, takie same jak w routes_books
def _enrich_with_ratings(db: Session, book_dict: dict) -> dict:
    if "id" in book_dict and book_dict["id"]:
        avg = (
            db.query(func.avg(models.book.Review.rating))
            .filter_by(book_id=book_dict["id"])
            .scalar()
            or 0.0
        )
        reviews_count = (
            db.query(func.count(models.book.Review.id))
            .filter_by(book_id=book_dict["id"])
            .scalar()
            or 0
        )
        book_dict["avg_rating"] = round(avg, 1)
        book_dict["reviews_count"] = reviews_count
    return book_dict

def _persist_book(db: Session, data: dict) -> dict:
    existing = db.query(models.book.Book).filter_by(google_id=data.get("google_id")).first()
    if existing:
        data["id"] = existing.id
        return data
    new_book = models.book.Book(
        google_id=data.get("google_id"),
        title=data.get("title"),
        authors=data.get("authors"),
        publisher=data.get("publisher"),
        published_date=data.get("published_date"),
        thumbnail=data.get("thumbnail"),
        categories=data.get("categories"),
        description=data.get("description"),
        available_copies=1,
    )
    db.add(new_book)
    db.commit()
    db.refresh(new_book)
    data["id"] = new_book.id
    return data

# 🔥 to jest Twój background task
def refresh_books_for_uni(db: Session, uni: str, limit_each: int = 40):
    queries = UNI_BOOK_QUERIES.get(uni, [uni])
    all_books = []
    for query in queries:
        try:
            books = search_google_books(query, max_results=limit_each)
            all_books.extend(books)
        except Exception as e:
            print(f"❌ Błąd pobierania książek ({uni}): {e}")

    seen = set()
    unique_books = []
    for b in all_books:
        if b["title"] in seen:
            continue
        seen.add(b["title"])
        b = _persist_book(db, b)
        b = _enrich_with_ratings(db, b)
        unique_books.append(b)

    set_cached_books(db, uni, unique_books)
    print(f"✅ Odświeżono cache książek dla {uni}: {len(unique_books)} pozycji")
