# app/api/routes_admin.py
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc
from typing import List, Optional
from datetime import date

from app.db.database import get_db
from app.models import (
    User, ForumPost, ForumReply, ForumReport, ForumReplyReport, 
    Book, Review, ReviewReport
)
from app.utils.deps import get_current_user
from app import schemas

router = APIRouter(prefix="/admin", tags=["admin"])

def require_admin(current_user: User = Depends(get_current_user)):
    """Middleware do sprawdzania uprawnień administratora"""
    if current_user.role != "admin":
        raise HTTPException(403, "Brak uprawnień administratora")
    return current_user

# ═══════════════════════════════════════════════════════════════════
# ZGŁOSZENIA POSTÓW I KOMENTARZY
# ═══════════════════════════════════════════════════════════════════

@router.get("/reports/posts")
def get_post_reports(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
    handled: Optional[bool] = Query(None, description="Filtruj po statusie obsługi"),
    limit: int = Query(50, le=200),
    offset: int = 0
):
    """Lista zgłoszonych postów"""
    query = (
        db.query(ForumReport)
        .join(ForumPost, ForumReport.post_id == ForumPost.id)
        .filter(ForumPost.is_deleted == False)  # Nie pokazuj zgłoszeń usuniętych postów
        .options(
            joinedload(ForumReport.post).joinedload(ForumPost.author),
            joinedload(ForumReport.reporter)
        )
        .order_by(desc(ForumReport.created_at))
    )
    
    if handled is not None:
        query = query.filter(ForumReport.handled == handled)
    
    reports = query.offset(offset).limit(limit).all()
    
    return [
        {
            "id": r.id,
            "reason": r.reason,
            "created_at": r.created_at,
            "handled": r.handled,
            "reporter": {
                "id": r.reporter.id,
                "email": r.reporter.email,
                "first_name": r.reporter.first_name,
                "last_name": r.reporter.last_name,
            },
            "post": {
                "id": r.post.id,
                "title": r.post.title,
                "summary": r.post.summary,
                "body": r.post.body[:200] + "..." if len(r.post.body) > 200 else r.post.body,
                "topic": r.post.topic,
                "created_at": r.post.created_at,
                "is_deleted": r.post.is_deleted,
                "author": {
                    "id": r.post.author.id,
                    "email": r.post.author.email,
                    "first_name": r.post.author.first_name,
                    "last_name": r.post.author.last_name,
                }
            }
        } for r in reports
    ]

@router.get("/reports/replies")
def get_reply_reports(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
    handled: Optional[bool] = Query(None, description="Filtruj po statusie obsługi"),
    limit: int = Query(50, le=200),
    offset: int = 0
):
    """Lista zgłoszonych komentarzy"""
    query = (
        db.query(ForumReplyReport)
        .join(ForumReply, ForumReplyReport.reply_id == ForumReply.id)
        .filter(ForumReply.is_deleted == False)  # Nie pokazuj zgłoszeń usuniętych komentarzy
        .options(
            joinedload(ForumReplyReport.reply).joinedload(ForumReply.author),
            joinedload(ForumReplyReport.reply).joinedload(ForumReply.post),
            joinedload(ForumReplyReport.reporter)
        )
        .order_by(desc(ForumReplyReport.created_at))
    )
    
    if handled is not None:
        query = query.filter(ForumReplyReport.handled == handled)
    
    reports = query.offset(offset).limit(limit).all()
    
    return [
        {
            "id": r.id,
            "reason": r.reason,
            "created_at": r.created_at,
            "handled": r.handled,
            "reporter": {
                "id": r.reporter.id,
                "email": r.reporter.email,
                "first_name": r.reporter.first_name,
                "last_name": r.reporter.last_name,
            },
            "reply": {
                "id": r.reply.id,
                "body": r.reply.body[:200] + "..." if len(r.reply.body) > 200 else r.reply.body,
                "created_at": r.reply.created_at,
                "is_deleted": r.reply.is_deleted,
                "post_id": r.reply.post_id,
                "post_title": r.reply.post.title,
                "author": {
                    "id": r.reply.author.id,
                    "email": r.reply.author.email,
                    "first_name": r.reply.author.first_name,
                    "last_name": r.reply.author.last_name,
                }
            }
        } for r in reports
    ]

@router.post("/reports/posts/{report_id}/handle")
def handle_post_report(
    report_id: int,
    action: dict = Body(...),  # {"action": "delete_post" | "ignore", "delete_post": bool}
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Obsłuż zgłoszenie postu"""
    report = db.get(ForumReport, report_id)
    if not report:
        raise HTTPException(404, "Zgłoszenie nie istnieje")
    
    # Oznacz zgłoszenie jako obsłużone
    report.handled = True
    
    # Jeśli admin zdecydował usunąć post
    if action.get("delete_post", False):
        post = db.get(ForumPost, report.post_id)
        if post:
            # Fizyczne usunięcie postu z kaskadowym usunięciem komentarzy
            db.delete(post)
    
    db.commit()
    return {"message": "Zgłoszenie zostało obsłużone"}

@router.post("/reports/replies/{report_id}/handle")
def handle_reply_report(
    report_id: int,
    action: dict = Body(...),  # {"action": "delete_reply" | "ignore", "delete_reply": bool}
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Obsłuż zgłoszenie komentarza"""
    report = db.get(ForumReplyReport, report_id)
    if not report:
        raise HTTPException(404, "Zgłoszenie nie istnieje")
    
    # Oznacz zgłoszenie jako obsłużone
    report.handled = True
    
    # Jeśli admin zdecydował usunąć komentarz
    if action.get("delete_reply", False):
        reply = db.get(ForumReply, report.reply_id)
        if reply:
            reply.is_deleted = True
    
    db.commit()
    return {"message": "Zgłoszenie zostało obsłużone"}

# ═══════════════════════════════════════════════════════════════════
# ZARZĄDZANIE UŻYTKOWNIKAMI
# ═══════════════════════════════════════════════════════════════════

@router.get("/users")
def get_all_users(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
    search: Optional[str] = Query(None, description="Szukaj po email, imieniu lub nazwisku"),
    role: Optional[str] = Query(None, description="Filtruj po roli"),
    university: Optional[str] = Query(None, description="Filtruj po uczelni"),
    limit: int = Query(100, le=500),
    offset: int = 0
):
    """Lista wszystkich użytkowników"""
    query = db.query(User).order_by(desc(User.id))
    
    if search:
        search_term = f"%{search.lower()}%"
        query = query.filter(
            func.lower(User.email).like(search_term) |
            func.lower(User.first_name).like(search_term) |
            func.lower(User.last_name).like(search_term)
        )
    
    if role:
        query = query.filter(User.role == role)
    
    if university:
        query = query.filter(User.university == university)
    
    users = query.offset(offset).limit(limit).all()
    
    return [
        {
            "id": u.id,
            "email": u.email,
            "role": u.role,
            "first_name": u.first_name,
            "last_name": u.last_name,
            "university": u.university,
            "faculty": u.faculty,
            "field": u.field,
            "study_year": u.study_year,
            "academic_title": u.academic_title,
        } for u in users
    ]

@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Usuń użytkownika (tylko admin)"""
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "Użytkownik nie istnieje")
    
    # Nie pozwalaj adminowi usunąć samego siebie
    if user.id == admin.id:
        raise HTTPException(400, "Nie możesz usunąć samego siebie")
    
    # Usuń użytkownika
    db.delete(user)
    db.commit()
    
    return {"message": f"Użytkownik {user.first_name} {user.last_name} został usunięty"}

@router.get("/users/stats")
def get_user_stats(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Statystyki użytkowników"""
    total_users = db.query(func.count(User.id)).scalar()
    
    by_role = db.query(User.role, func.count(User.id)).group_by(User.role).all()
    by_university = db.query(User.university, func.count(User.id)).group_by(User.university).all()
    
    return {
        "total_users": total_users,
        "by_role": {role: count for role, count in by_role},
        "by_university": {uni: count for uni, count in by_university}
    }

# ═══════════════════════════════════════════════════════════════════
# ZARZĄDZANIE KSIĄŻKAMI
# ═══════════════════════════════════════════════════════════════════

@router.get("/books")
def get_user_books(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
    created_by_user: bool = Query(True, description="Tylko książki dodane przez użytkowników"),
    search: Optional[str] = Query(None, description="Szukaj po tytule lub autorze"),
    university: Optional[str] = Query(None, description="Filtruj po uczelni"),
    limit: int = Query(100, le=500),
    offset: int = 0
):
    """Lista książek dodanych przez użytkowników"""
    query = db.query(Book).options(joinedload(Book.reviews))
    
    if created_by_user:
        query = query.filter(Book.created_by.isnot(None))
    
    if search:
        search_term = f"%{search.lower()}%"
        query = query.filter(
            func.lower(Book.title).like(search_term) |
            func.lower(Book.authors).like(search_term)
        )
    
    if university:
        query = query.filter(Book.university == university)
    
    books = query.order_by(desc(Book.id)).offset(offset).limit(limit).all()
    
    return [
        {
            "id": b.id,
            "title": b.title,
            "authors": b.authors,
            "publisher": b.publisher,
            "published_date": b.published_date,
            "university": b.university,
            "available_copies": b.available_copies,
            "created_by": b.created_by,
            "thumbnail": b.thumbnail,
            "categories": b.categories,
            "reviews_count": len(b.reviews) if b.reviews else 0
        } for b in books
    ]

@router.delete("/books/{book_id}")
def delete_user_book(
    book_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Usuń książkę dodaną przez użytkownika"""
    book = db.get(Book, book_id)
    if not book:
        raise HTTPException(404, "Książka nie istnieje")
    
    if not book.created_by:
        raise HTTPException(400, "Można usuwać tylko książki dodane przez użytkowników")
    
    db.delete(book)
    db.commit()
    return {"message": "Książka została usunięta"}

# ═══════════════════════════════════════════════════════════════════
# STATYSTYKI OGÓLNE
# ═══════════════════════════════════════════════════════════════════

@router.delete("/posts/cleanup")
def cleanup_deleted_posts(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Fizycznie usuń wszystkie posty oznaczone jako usunięte (z kaskadowym usunięciem komentarzy)"""
    deleted_posts = db.query(ForumPost).filter(ForumPost.is_deleted == True).all()
    
    for post in deleted_posts:
        db.delete(post)
    
    db.commit()
    
    return {
        "message": f"Usunięto {len(deleted_posts)} postów i powiązanych komentarzy",
        "deleted_posts_count": len(deleted_posts)
    }

@router.delete("/replies/cleanup")
def cleanup_orphaned_replies(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Oznacz jako usunięte komentarze do usuniętych postów"""
    # Znajdź komentarze do usuniętych postów
    orphaned_replies = (
        db.query(ForumReply)
        .join(ForumPost, ForumReply.post_id == ForumPost.id)
        .filter(ForumPost.is_deleted == True, ForumReply.is_deleted == False)
        .all()
    )
    
    # Oznacz je jako usunięte
    for reply in orphaned_replies:
        reply.is_deleted = True
    
    db.commit()
    
    return {
        "message": f"Oznaczono jako usunięte {len(orphaned_replies)} komentarzy do usuniętych postów",
        "orphaned_replies_count": len(orphaned_replies)
    }

@router.get("/debug")
def debug_database(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Debug - sprawdź co jest w bazie danych"""
    users = db.query(User).all()
    books = db.query(Book).all()
    posts = db.query(ForumPost).all()
    
    return {
        "users_count": len(users),
        "users_sample": [{"id": u.id, "email": u.email, "role": u.role} for u in users[:3]],
        "books_count": len(books),
        "books_sample": [{"id": b.id, "title": b.title, "created_by": b.created_by} for b in books[:3]],
        "posts_count": len(posts)
    }

@router.get("/stats")
def get_admin_stats(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Ogólne statystyki dla panelu admina"""
    
    # Zgłoszenia - tylko te dotyczące nieusuniętych treści
    unhandled_post_reports = (
        db.query(func.count(ForumReport.id))
        .join(ForumPost, ForumReport.post_id == ForumPost.id)
        .filter(ForumReport.handled == False, ForumPost.is_deleted == False)
        .scalar() or 0
    )
    unhandled_reply_reports = (
        db.query(func.count(ForumReplyReport.id))
        .join(ForumReply, ForumReplyReport.reply_id == ForumReply.id)
        .filter(ForumReplyReport.handled == False, ForumReply.is_deleted == False)
        .scalar() or 0
    )
    
    # Użytkownicy
    total_users = db.query(func.count(User.id)).scalar() or 0
    students_count = db.query(func.count(User.id)).filter(User.role == "student").scalar() or 0
    researchers_count = db.query(func.count(User.id)).filter(User.role == "researcher").scalar() or 0
    admins_count = db.query(func.count(User.id)).filter(User.role == "admin").scalar() or 0
    
    # Debug - sprawdź czy są jakiekolwiek użytkownicy
    all_users = db.query(User).all()
    print(f"🔍 DEBUG: Znaleziono {len(all_users)} użytkowników w bazie")
    for user in all_users[:5]:  # Pokaż pierwszych 5
        print(f"   - {user.email} ({user.role})")
    
    # Posty i komentarze
    total_posts = db.query(func.count(ForumPost.id)).filter(ForumPost.is_deleted == False).scalar() or 0
    # Licz tylko komentarze do nieusuniętych postów
    total_replies = (
        db.query(func.count(ForumReply.id))
        .join(ForumPost, ForumReply.post_id == ForumPost.id)
        .filter(ForumReply.is_deleted == False, ForumPost.is_deleted == False)
        .scalar() or 0
    )
    
    # Książki
    total_books = db.query(func.count(Book.id)).scalar() or 0
    user_books = db.query(func.count(Book.id)).filter(Book.created_by.isnot(None)).scalar() or 0
    
    # Książki wyświetlane (z autorem i okładką) - takie same kryteria jak w BooksPage
    displayed_books = db.query(func.count(Book.id)).filter(
        Book.authors.isnot(None),
        Book.authors != "",
        Book.thumbnail.isnot(None),
        Book.thumbnail != ""
    ).scalar() or 0
    
    # Debug - sprawdź książki
    all_books = db.query(Book).all()
    print(f"🔍 DEBUG: Znaleziono {len(all_books)} książek w bazie")
    user_added_books = db.query(Book).filter(Book.created_by.isnot(None)).all()
    print(f"🔍 DEBUG: {len(user_added_books)} książek dodanych przez użytkowników")
    displayed_books_list = db.query(Book).filter(
        Book.authors.isnot(None),
        Book.authors != "",
        Book.thumbnail.isnot(None),
        Book.thumbnail != ""
    ).all()
    print(f"🔍 DEBUG: {len(displayed_books_list)} książek wyświetlanych (z autorem i okładką)")
    
    return {
        "reports": {
            "unhandled_posts": unhandled_post_reports,
            "unhandled_replies": unhandled_reply_reports,
            "total_unhandled": unhandled_post_reports + unhandled_reply_reports
        },
        "users": {
            "total": total_users,
            "students": students_count,
            "researchers": researchers_count,
            "admins": admins_count
        },
        "books": {
            "total": total_books,
            "user_added": user_books,
            "displayed": displayed_books
        },
        "content": {
            "posts": total_posts,
            "replies": total_replies,
            "books_total": total_books,
            "books_by_users": user_books
        }
    }

# ═══════════════════════════════════════════════════════════════════
# ZARZĄDZANIE KONTAKTAMI UCZELNI
# ═══════════════════════════════════════════════════════════════════

@router.get("/contacts")
def get_all_contacts(
    admin: User = Depends(require_admin)
):
    """Lista wszystkich kontaktów uczelni"""
    from app.krakow_data import UNIVERSITY_CONTACTS
    return UNIVERSITY_CONTACTS

@router.put("/contacts/{university_name}")
def update_university_contact(
    university_name: str,
    contact_data: dict = Body(...),
    admin: User = Depends(require_admin)
):
    """Aktualizuj kontakt uczelni"""
    import json
    from pathlib import Path
    
    # Ścieżka do pliku JSON
    data_path = Path(__file__).parent.parent / "data" / "krakow_universities.json"
    
    try:
        # Wczytaj aktualny plik
        with open(data_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        # Znajdź ucelnię i zaktualizuj kontakt
        university_found = False
        for uni in data["universities"]:
            if uni["name"] == university_name:
                uni["contact"] = contact_data
                university_found = True
                break
        
        if not university_found:
            raise HTTPException(404, "Uczelnia nie została znaleziona")
        
        # Zapisz zaktualizowany plik
        with open(data_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        # Odśwież cache w pamięci (wymaga restartu aplikacji dla pełnego efektu)
        from app import krakow_data
        krakow_data.UNIVERSITY_CONTACTS[university_name] = contact_data
        
        return {"message": "Kontakt został zaktualizowany", "contact": contact_data}
        
    except FileNotFoundError:
        raise HTTPException(500, "Plik z danymi uczelni nie został znaleziony")
    except json.JSONDecodeError:
        raise HTTPException(500, "Błąd parsowania pliku JSON")
    except Exception as e:
        raise HTTPException(500, f"Błąd podczas aktualizacji: {str(e)}")

@router.get("/contacts/{university_name}")
def get_university_contact(
    university_name: str,
    admin: User = Depends(require_admin)
):
    """Pobierz kontakt konkretnej uczelni"""
    from app.krakow_data import UNIVERSITY_CONTACTS
    
    contact = UNIVERSITY_CONTACTS.get(university_name)
    if not contact:
        raise HTTPException(404, "Kontakt uczelni nie został znaleziony")
    
    return contact
