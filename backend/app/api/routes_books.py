from fastapi import APIRouter, Depends, HTTPException, Query, Body, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import date
from typing import List, Dict
from sqlalchemy import func, or_
from sqlalchemy.orm import joinedload
import json as _json

from app.services.recommend import recommend_books
from app.schemas.book import BookOut
from app.db.database import get_db
from app import models, schemas
from app.utils.deps import get_current_user
from app.services.book_cache import get_cached_books, set_cached_books
from app.services.google_books import search_google_books, get_google_book_by_id
from app.constants.univeristy_queries import UNI_BOOK_QUERIES
from app.services.notifications import create_notification   # 🔥 NOWE
from app.services.books_refresh import refresh_books_for_uni

router = APIRouter(prefix="/books", tags=["books"])


# ✅ pomocnicza funkcja do obliczania średniej i liczby ocen/recenzji
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
        book_dict["reviews_count"] = reviews_count   # tylko recenzje

    return book_dict


# ✅ zapisuje książkę w DB i zwraca dict z id
def _persist_book(db: Session, data: dict) -> dict:
    existing = db.query(models.book.Book).filter_by(google_id=data["google_id"]).first()
    if existing:
        data["id"] = existing.id
        return data

    new_book = models.book.Book(
        google_id=data.get("google_id"),
        title=data.get("title"),
        authors=data.get("authors"),
        publisher=None,
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


# ✅ Import pojedynczej książki po google_id
@router.post("/import/{google_id}", response_model=schemas.book.BookOut)
def import_book(google_id: str, db: Session = Depends(get_db)):
    existing = db.query(models.book.Book).filter_by(google_id=google_id).first()
    if existing:
        return _enrich_with_ratings(db, existing.__dict__)

    book_data = get_google_book_by_id(google_id)
    if not book_data:
        raise HTTPException(404, "Book not found in Google Books")

    persisted = _persist_book(db, book_data)
    return _enrich_with_ratings(db, persisted)


# ✅ główna funkcja wyszukiwania dla jednej uczelni
def fetch_books_for_uni(db: Session, uni: str, limit_each: int = 40, pages: int = 5) -> List[BookOut]:
    cached = get_cached_books(db, uni)
    if cached:
        persisted = [_persist_book(db, b) for b in cached]
        enriched = [_enrich_with_ratings(db, b) for b in persisted]
        return [BookOut(**b) for b in enriched]

    queries = UNI_BOOK_QUERIES.get(uni, [uni])
    all_books = []
    for query in queries:
        books = search_google_books(query, max_results=limit_each, pages=pages)
        all_books.extend(books)

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
    return [BookOut(**b) for b in unique_books]


# ✅ lista książek dla jednej uczelni
@router.get("/", response_model=List[schemas.book.BookOut])
def list_books(
    q: str = Query(..., description="Nazwa uczelni"),
    max_results: int = 20,
    query: str | None = Query(None, description="Fraza do wyszukiwania"),
    available_only: bool = Query(False, description="Tylko dostępne"),
    categories: list[str] = Query([], description="Lista kategorii"),
    sort_by: str = Query("newest", description="Sortowanie: newest/oldest"),
    db: Session = Depends(get_db),
    tasks: BackgroundTasks = None,
):
    # 🔹 lokalne książki dodane ręcznie
    local_books_q = db.query(models.book.Book).filter(models.book.Book.university == q)

    if query:
        local_books_q = local_books_q.filter(
            or_(
                models.book.Book.title.ilike(f"%{query}%"),
                models.book.Book.authors.ilike(f"%{query}%"),
                models.book.Book.description.ilike(f"%{query}%"),
            )
        )

    if available_only:
        local_books_q = local_books_q.filter(models.book.Book.available_copies > 0)

    if categories and "Wszystkie" not in categories:
        conds = [models.book.Book.categories.ilike(f"%{cat}%") for cat in categories]
        local_books_q = local_books_q.filter(or_(*conds))

    # sortowanie lokalnych
    if sort_by == "newest":
        local_books_q = local_books_q.order_by(models.book.Book.published_date.desc().nullslast())
    elif sort_by == "oldest":
        local_books_q = local_books_q.order_by(models.book.Book.published_date.asc().nullslast())

    local_books = local_books_q.limit(max_results).all()

    local_books_out = [
        _enrich_with_ratings(
            db,
            {
                "id": b.id,
                "google_id": b.google_id,
                "title": b.title,
                "authors": b.authors,
                "publisher": b.publisher,
                "published_date": b.published_date,
                "thumbnail": b.thumbnail,
                "categories": b.categories,
                "description": b.description,
                "available_copies": b.available_copies,
                "created_by": b.created_by,
            },
        )
        for b in local_books
    ]

    # 🔹 Google Books z cache
    cached = get_cached_books(db, q)
    if cached:
        persisted = [
            _persist_book(db, b)
            for b in cached
            if b.get("thumbnail") and b.get("authors")
        ]
        enriched = [_enrich_with_ratings(db, b) for b in persisted[:max_results]]

        if tasks:
            tasks.add_task(refresh_books_for_uni, db, q)

        # 🔎 filtry na Google Books
        def apply_filters(book):
            if query and query.lower() not in (
                (book.get("title") or "").lower()
                + (book.get("authors") or "").lower()
                + (book.get("description") or "").lower()
            ):
                return False
            if available_only and (book.get("available_copies") or 0) <= 0:
                return False
            if categories and "Wszystkie" not in categories:
                if not any(cat.lower() in (book.get("categories") or "").lower() for cat in categories):
                    return False
            return True

        enriched = list(filter(apply_filters, enriched))

        # 🔎 sortowanie
        if sort_by == "newest":
            enriched.sort(key=lambda b: b.get("published_date") or "1900", reverse=True)
        elif sort_by == "oldest":
            enriched.sort(key=lambda b: b.get("published_date") or "2100")

        return [BookOut(**b) for b in local_books_out] + [BookOut(**b) for b in enriched]

    # 🔹 Google Books bez cache
    queries = UNI_BOOK_QUERIES.get(q, [q])
    all_books = []
    for search_q in queries:
        try:
            books = search_google_books(search_q, max_results=40)
            books = [b for b in books if b.get("thumbnail") and b.get("authors")]
            all_books.extend(books)
        except Exception as e:
            print(f"❌ Błąd pobierania książek dla frazy '{search_q}': {e}")

    seen = set()
    unique_books = []
    for b in all_books:
        key = b.get("google_id") or b.get("isbn") or b.get("title")
        if key in seen:
            continue
        seen.add(key)
        b = _persist_book(db, b)
        b = _enrich_with_ratings(db, b)
        unique_books.append(b)

    # 🔎 filtry na Google Books
    def apply_filters(book):
        if query and query.lower() not in (
            (book.get("title") or "").lower()
            + (book.get("authors") or "").lower()
            + (book.get("description") or "").lower()
        ):
            return False
        if available_only and (book.get("available_copies") or 0) <= 0:
            return False
        if categories and "Wszystkie" not in categories:
            if not any(cat.lower() in (book.get("categories") or "").lower() for cat in categories):
                return False
        return True

    unique_books = list(filter(apply_filters, unique_books))

    # 🔎 sortowanie
    if sort_by == "newest":
        unique_books.sort(key=lambda b: b.get("published_date") or "1900", reverse=True)
    elif sort_by == "oldest":
        unique_books.sort(key=lambda b: b.get("published_date") or "2100")

    unique_books = unique_books[:max_results]
    set_cached_books(db, q, unique_books)

    return [BookOut(**b) for b in local_books_out] + [BookOut(**b) for b in unique_books]

# ✅ multi – wszystkie uczelnie
@router.get("/multi", response_model=Dict[str, List[BookOut]])
def books_multi(
    q: List[str] = Query(..., description="Lista uczelni"),
    limit_each: int = 20,
    query: str | None = Query(None, description="Fraza do wyszukiwania"),
    available_only: bool = Query(False, description="Tylko dostępne"),
    categories: list[str] = Query([], description="Lista kategorii"),
    sort_by: str = Query("newest", description="Sortowanie: newest/oldest"),
    db: Session = Depends(get_db),
):
    results: Dict[str, List[BookOut]] = {}
    seen_global = set()

    def apply_filters(book: dict) -> bool:
        # wyszukiwanie tekstowe
        if query and query.lower() not in (
            (book.get("title") or "").lower()
            + (book.get("authors") or "").lower()
            + (book.get("description") or "").lower()
        ):
            return False
        # tylko dostępne
        if available_only and (book.get("available_copies") or 0) <= 0:
            return False
        # kategorie
        if categories and "Wszystkie" not in categories:
            if not any(cat.lower() in (book.get("categories") or "").lower() for cat in categories):
                return False
        return True

    for uni in q:
        # 🔹 lokalne książki
        local_books_q = db.query(models.book.Book).filter(models.book.Book.university == uni)

        if query:
            local_books_q = local_books_q.filter(
                or_(
                    models.book.Book.title.ilike(f"%{query}%"),
                    models.book.Book.authors.ilike(f"%{query}%"),
                    models.book.Book.description.ilike(f"%{query}%"),
                )
            )
        if available_only:
            local_books_q = local_books_q.filter(models.book.Book.available_copies > 0)
        if categories and "Wszystkie" not in categories:
            conds = [models.book.Book.categories.ilike(f"%{cat}%") for cat in categories]
            local_books_q = local_books_q.filter(or_(*conds))

        if sort_by == "newest":
            local_books_q = local_books_q.order_by(models.book.Book.published_date.desc().nullslast())
        elif sort_by == "oldest":
            local_books_q = local_books_q.order_by(models.book.Book.published_date.asc().nullslast())

        local_books = local_books_q.limit(limit_each).all()
        local_books_out = [
            _enrich_with_ratings(
                db,
                {
                    "id": b.id,
                    "google_id": b.google_id,
                    "title": b.title,
                    "authors": b.authors,
                    "publisher": b.publisher,
                    "published_date": b.published_date,
                    "thumbnail": b.thumbnail,
                    "categories": b.categories,
                    "description": b.description,
                    "available_copies": b.available_copies,
                    "created_by": b.created_by,
                },
            )
            for b in local_books
        ]

        cached = get_cached_books(db, uni)
        if cached:
            # ograniczaj pracę przed persystencją i enrich
            limited_cached = [
                b for b in cached if b.get("thumbnail") and b.get("authors")
            ][:limit_each]

            persisted = [_persist_book(db, b) for b in limited_cached]
            deduped = []
            for b in persisted:
                key = b.get("google_id") or b.get("isbn") or b.get("title")
                if key in seen_global:
                    continue
                seen_global.add(key)
                deduped.append(b)

            # 🔎 filtry + sortowanie
            deduped = list(filter(apply_filters, deduped))
            if sort_by == "newest":
                deduped.sort(key=lambda b: b.get("published_date") or "1900", reverse=True)
            elif sort_by == "oldest":
                deduped.sort(key=lambda b: b.get("published_date") or "2100")

            results[uni] = (
                [BookOut(**b) for b in local_books_out]
                + [BookOut(**_enrich_with_ratings(db, b)) for b in deduped[:limit_each]]
            )
            continue

        # 🔹 Google Books bez cache
        queries = UNI_BOOK_QUERIES.get(uni, [uni])
        all_books = []
        # pobierz równolegle i nie pobieraj nadmiarowo
        from concurrent.futures import ThreadPoolExecutor, as_completed
        with ThreadPoolExecutor(max_workers=min(8, len(queries))) as ex:
            futures = {
                ex.submit(search_google_books, search_q, max_results=limit_each): search_q
                for search_q in queries
            }
            for fut in as_completed(futures):
                try:
                    books = fut.result()
                    books = [b for b in books if b.get("thumbnail") and b.get("authors")]
                    all_books.extend(books)
                    if len(all_books) >= limit_each * 2:
                        # wystarczająco wyników, przerwij dalsze czekanie
                        break
                except Exception as e:
                    print(f"❌ Błąd pobierania książek dla frazy '{futures[fut]}': {e}")

        seen_local = set()
        unique_books = []
        for b in all_books:
            key = b.get("google_id") or b.get("isbn") or b.get("title")
            if key in seen_local or key in seen_global:
                continue
            seen_local.add(key)
            seen_global.add(key)
            unique_books.append(b)

        # 🔎 filtry + sortowanie
        unique_books = list(filter(apply_filters, unique_books))
        if sort_by == "newest":
            unique_books.sort(key=lambda b: b.get("published_date") or "1900", reverse=True)
        elif sort_by == "oldest":
            unique_books.sort(key=lambda b: b.get("published_date") or "2100")

        limited_books = unique_books[:limit_each]
        # dopiero teraz zapisz do DB i wzbogac
        limited_books = [_persist_book(db, b) for b in limited_books]
        limited_books = [_enrich_with_ratings(db, b) for b in limited_books]
        set_cached_books(db, uni, limited_books)

        results[uni] = (
            [BookOut(**b) for b in local_books_out]
            + [BookOut(**b) for b in limited_books]
        )

    return results

@router.get("/mine", response_model=list[schemas.book.BookOut])
def my_books(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    books = (
        db.query(models.book.Book)
        .filter(models.book.Book.created_by == user.id)
        .order_by(models.book.Book.id.desc())
        .all()
    )
    return [
        _enrich_with_ratings(
            db,
            {
                "id": b.id,
                "google_id": b.google_id,
                "title": b.title,
                "authors": b.authors,
                "publisher": b.publisher,
                "published_date": b.published_date,
                "thumbnail": b.thumbnail,
                "categories": b.categories,
                "description": b.description,
                "available_copies": b.available_copies,
                "created_by": b.created_by,
            },
        )
        for b in books
    ]
    

# ✅ pojedyncza książka
@router.get("/{book_id}", response_model=schemas.book.BookOut)
def get_book(book_id: int, db: Session = Depends(get_db)):
    book = db.query(models.book.Book).get(book_id)
    if not book:
        raise HTTPException(404, "Book not found")
    return _enrich_with_ratings(db, book.__dict__)


# ✅ oceny
@router.post("/{book_id}/rate", response_model=schemas.book.RatingOut)
def rate_book(
    book_id: int,
    r: schemas.book.RatingCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    book = db.query(models.book.Book).get(book_id)
    if not book:
        raise HTTPException(404, "Book not found in DB")
    rating = models.book.Rating(value=r.value, user_id=user.id, book_id=book_id)
    db.add(rating)
    db.commit()
    db.refresh(rating)
    return rating


# ✅ recenzje
@router.post("/{book_id}/review")
def review_book(
    book_id: int,
    rev: schemas.book.ReviewCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    book = db.query(models.book.Book).get(book_id)
    if not book:
        raise HTTPException(404, "Book not found in DB")

    review = models.book.Review(
        text=rev.text,
        rating=rev.rating,
        user_id=user.id,
        book_id=book_id,
        created_at=date.today(),
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    
    if book.created_by and book.created_by != user.id:
        create_notification(
            db,
            user_id=book.created_by,
            type="new_review",
            payload={
                "book_id": book_id,
                "book_title": book.title,
                "actors": [f"{user.first_name} {user.last_name}"],
            },
            url=f"/books/{book_id}"
        )

    avg = (
        db.query(func.avg(models.book.Review.rating))
        .filter_by(book_id=book_id)
        .scalar()
        or 0.0
    )
    reviews_count = (
        db.query(func.count(models.book.Review.id))
        .filter_by(book_id=book_id)
        .scalar()
        or 0
    )

    return {
        "review": schemas.book.ReviewOut.model_validate(review),  # 🔥 user wejdzie dzięki relacji
        "avg_rating": round(avg, 1),
        "reviews_count": reviews_count,
    }
    
@router.get("/{book_id}/reviews", response_model=list[schemas.book.ReviewOut])
def get_reviews(book_id: int, db: Session = Depends(get_db)):
    reviews = (
        db.query(models.book.Review)
        .filter(models.book.Review.book_id == book_id)
        .all()
    )

    result = []
    for r in reviews:
        thumbs_up = (
            db.query(func.count(models.book.ReviewReaction.id))
            .filter_by(review_id=r.id, type="thumbs_up")
            .scalar()
        )
        thumbs_down = (
            db.query(func.count(models.book.ReviewReaction.id))
            .filter_by(review_id=r.id, type="thumbs_down")
            .scalar()
        )

        result.append({
            "id": r.id,
            "text": r.text,
            "rating": r.rating,
            "created_at": r.created_at,
            "user_id": r.user_id,
            "book_id": r.book_id,
            "user": r.user,              # 🔹 relacja User, FastAPI samo zserializuje
            "thumbs_up": thumbs_up,
            "thumbs_down": thumbs_down,
        })

    return result


    
@router.put("/{book_id}/reviews/{review_id}")
def update_review(
    book_id: int,
    review_id: int,
    rev: schemas.book.ReviewCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    review = (
        db.query(models.book.Review)
        .filter_by(id=review_id, book_id=book_id, user_id=user.id)
        .first()
    )
    if not review:
        raise HTTPException(404, "Review not found or not yours")

    review.text = rev.text
    review.rating = rev.rating
    db.commit()
    db.refresh(review)

    avg = (
        db.query(func.avg(models.book.Review.rating))
        .filter_by(book_id=book_id)
        .scalar()
        or 0.0
    )
    reviews_count = (
        db.query(func.count(models.book.Review.id))
        .filter_by(book_id=book_id)
        .scalar()
        or 0
    )

    return {
        "review": schemas.book.ReviewOut.model_validate(review),  
        "avg_rating": round(avg, 1),
        "reviews_count": reviews_count,
    }

@router.delete("/{book_id}/reviews/{review_id}")
def delete_review(
    book_id: int,
    review_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    review = (
        db.query(models.book.Review)
        .filter_by(id=review_id, book_id=book_id, user_id=user.id)
        .first()
    )
    if not review:
        raise HTTPException(404, "Review not found or not owned by user")

    db.delete(review)
    db.commit()

    # policz nową średnią
    avg = (
        db.query(func.avg(models.book.Review.rating))
        .filter_by(book_id=book_id)
        .scalar()
        or 0.0
    )
    reviews_count = (
        db.query(func.count(models.book.Review.id))
        .filter_by(book_id=book_id)
        .scalar()
        or 0
    )

    return {
        "avg_rating": round(avg, 1),
        "reviews_count": reviews_count,
    }

# ✅ wypożyczenia
@router.post("/{book_id}/loan", response_model=schemas.book.LoanOut)
def loan_book(
    book_id: int,
    l: schemas.book.LoanCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    book = db.query(models.book.Book).get(book_id)
    if not book:
        raise HTTPException(404, "Book not found")
    if book.available_copies <= 0:
        raise HTTPException(400, "No copies available")

    loan = models.book.Loan(
        user_id=user.id,
        book_id=book_id,
        start_date=date.today(),   # ✅ tylko data
        due_date=l.due_date,
    )
    book.available_copies -= 1
    db.add(loan)
    db.commit()
    db.refresh(loan)
    return loan

@router.get("/loans/me", response_model=list[schemas.book.LoanOut])
def my_loans(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    loans = (
        db.query(models.book.Loan)
        .options(joinedload(models.book.Loan.book)) 
        .filter_by(user_id=user.id)
        .order_by(models.book.Loan.start_date.desc())
        .all()
    )
    return loans

@router.get("/loans/active", response_model=list[schemas.book.LoanOut])
def my_active_loans(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    loans = (
        db.query(models.book.Loan)
        .filter_by(user_id=user.id, returned_at=None)
        .order_by(models.book.Loan.due_date.asc())
        .all()
    )
    return loans

@router.get("/loans", response_model=list[schemas.book.LoanOut])
def all_loans(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    if user.role != "admin":
        raise HTTPException(403, "Brak uprawnień")
    return db.query(models.book.Loan).order_by(models.book.Loan.start_date.desc()).all()


@router.post("/{book_id}/return", response_model=schemas.book.LoanOut)
def return_book(book_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    loan = (
        db.query(models.book.Loan)
        .filter_by(book_id=book_id, user_id=user.id, returned_at=None)
        .first()
    )
    if not loan:
        raise HTTPException(400, "No active loan found")

    loan.returned_at = date.today()
    loan.book.available_copies += 1
    db.commit()
    db.refresh(loan)
    return loan


# ✅ rekomendacje
@router.get("/recommend", response_model=List[BookOut])
def recommend(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    limit: int = 10,
):
    return recommend_books(user, db, limit=limit)


# ✅ szukanie książek w Google
@router.get("/import/google")
def google_books_search(q: str, max_results: int = 10):
    return search_google_books(q, max_results=max_results)

@router.post("/{book_id}/reviews/{review_id}/react")
def react_review(
    book_id: int,
    review_id: int,
    data: dict = Body(...),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    review = db.query(models.book.Review).filter_by(id=review_id, book_id=book_id).first()
    if not review:
        raise HTTPException(404, "Review not found")

    if review.user_id == user.id:
        raise HTTPException(400, "Nie możesz reagować na swoją recenzję")

    reaction_type = data.get("type")
    if reaction_type not in ["thumbs_up", "thumbs_down"]:
        raise HTTPException(400, "Invalid reaction type")

    existing = (
        db.query(models.book.ReviewReaction)
        .filter_by(user_id=user.id, review_id=review_id)
        .first()
    )

    if existing:
        existing.type = reaction_type
    else:
        db.add(models.book.ReviewReaction(
            user_id=user.id,
            review_id=review_id,
            type=reaction_type,
        ))

    # 🔔 powiadomienie dla autora recenzji
    if review.user_id != user.id:
        create_notification(
            db,
            user_id=review.user_id,
            type="review_reaction",
            payload={
                "review_id": review_id,
                "post_id": book_id,
                "actors": [f"{user.first_name} {user.last_name}"],
                "type": reaction_type,
            },
            url=f"/books/{book_id}#review-{review_id}"
        )

    db.commit()

    thumbs_up = (
        db.query(func.count(models.book.ReviewReaction.id))
        .filter_by(review_id=review_id, type="thumbs_up")
        .scalar()
    )
    thumbs_down = (
        db.query(func.count(models.book.ReviewReaction.id))
        .filter_by(review_id=review_id, type="thumbs_down")
        .scalar()
    )

    return {"thumbs_up": thumbs_up, "thumbs_down": thumbs_down}


@router.post("/{book_id}/reviews/{review_id}/report")
def report_review(
    book_id: int,
    review_id: int,
    reason: str | None = Body(None, embed=True),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    review = (
        db.query(models.book.Review)
        .filter_by(id=review_id, book_id=book_id)
        .first()
    )
    if not review:
        raise HTTPException(404, "Review not found")

    db.add(models.book.ReviewReport(
        user_id=user.id,
        review_id=review_id,
        reason=reason,
    ))

    # 🔔 powiadomienia dla adminów
    admins = db.query(models.user.User).filter(models.user.User.role == "admin").all()
    for a in admins:
        create_notification(
            db,
            user_id=a.id,
            type="report",
            payload={
                "review_id": review_id,
                "post_id": book_id,
                "reason": reason,
                "actors": [f"{user.first_name} {user.last_name}"],
            },
            url=f"/books/{book_id}#review-{review_id}"
        )

    db.commit()
    return {"status": "ok", "message": "Zgłoszenie przyjęte"}

@router.post("/manual", response_model=schemas.book.BookOut)
def add_manual_book(
    data: schemas.book.BookCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    if not data.title or not data.authors:
        raise HTTPException(400, "Brak wymaganych pól")
    
    if data.university.lower() == "wszystkie":
        raise HTTPException(400, "Nie można dodać książki do 'wszystkie uczelnie'")

    book = models.book.Book(
        google_id=None,
        title=data.title,
        authors=data.authors,
        publisher=data.publisher,
        published_date=data.published_date,
        thumbnail=data.thumbnail,
        categories=data.categories,
        description=data.description,
        available_copies=data.available_copies or 1,
        university=data.university,
        created_by=user.id,   
    )
    db.add(book)
    db.commit()
    db.refresh(book)
    return book

@router.delete("/{book_id}")
def delete_book(
    book_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    book = db.query(models.book.Book).get(book_id)
    if not book:
        raise HTTPException(404, "Book not found")

    # 🔹 pozwól usuwać tylko książki dodane ręcznie
    if book.google_id is not None:
        raise HTTPException(400, "Nie można usuwać książek z Google Books")

    # 🔹 tylko właściciel albo admin
    if book.created_by != user.id and user.role != "admin":
        raise HTTPException(403, "Nie masz uprawnień do usunięcia tej książki")

    db.delete(book)
    db.commit()
    return {"status": "ok", "message": "Książka została usunięta"}