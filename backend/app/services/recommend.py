from sqlalchemy.orm import Session
from typing import List
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.models.book import Book
from app.models.user import User

def recommend_books(user: User, db: Session, limit: int = 10) -> List[Book]:
    books = db.query(Book).all()
    if not books:
        return []

    # 1) profil użytkownika
    profile_parts = [
        user.university or "",
        user.faculty or "",
        user.field or "",
        user.role or "",
        user.academic_title or "",
    ]
    user_profile = " ".join([p for p in profile_parts if p])

    # 2) dane książek
    corpus = []
    for b in books:
        corpus.append(" ".join([
            b.title or "",
            b.authors or "",
            b.categories or "",
            b.description or "",
        ]))

    # 3) TF-IDF
    vectorizer = TfidfVectorizer(stop_words="english")
    X = vectorizer.fit_transform(corpus + [user_profile])  # książki + user
    user_vec = X[-1]   # ostatni = użytkownik
    book_vecs = X[:-1]

    # 4) podobieństwo kosinusowe
    sims = cosine_similarity(user_vec, book_vecs).flatten()

    # 5) posortuj po dopasowaniu
    scored = list(zip(books, sims))
    scored.sort(key=lambda x: x[1], reverse=True)

    return [b for b, _ in scored[:limit]]
