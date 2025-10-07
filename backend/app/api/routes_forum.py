from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, func
from typing import Literal
import json as _json

from app.db.database import get_db
from app.models.forum import (
    ForumPost, ForumReply, ForumReaction, ForumReport,
    ForumReplyReaction, ForumReplyReport
)
from app.models.user import User
from app.services.notifications import create_notification
from app.utils.deps import get_current_user

router = APIRouter(prefix="/forum", tags=["forum"])

REACTION_EMOJI = {
    "like": "👍",
    "celebrate": "🎉",
    "support": "🤝",
    "love": "❤️",
    "insightful": "🧠",
    "funny": "😂",
}


# ── HELPERS ────────────────────────────────────────────────────────────────

def reply_counts(db: Session, reply_id: int):
    rows = db.query(ForumReplyReaction.type, func.count("*")) \
        .filter(ForumReplyReaction.reply_id == reply_id) \
        .group_by(ForumReplyReaction.type).all()
    d = {"up": 0, "down": 0}
    for t, c in rows:
        d[t] = c
    return d


def build_tree(db: Session, post_id: int):
    all_replies = (
        db.query(ForumReply)
        .options(joinedload(ForumReply.author))
        .filter(ForumReply.post_id == post_id, ForumReply.is_deleted == False)
        .all()
    )
    by_parent: dict[int | None, list[ForumReply]] = {}
    for r in all_replies:
        by_parent.setdefault(r.parent_id, []).append(r)

    for v in by_parent.values():
        v.sort(key=lambda x: x.created_at)

    out = []
    for r0 in by_parent.get(None, []):
        node0 = {
            "id": r0.id,
            "post_id": r0.post_id,
            "body": r0.body,
            "created_at": r0.created_at,
            "author": {
                "id": r0.author.id,
                "first_name": r0.author.first_name,
                "last_name": r0.author.last_name,
                "role": r0.author.role,
                "academic_title": getattr(r0.author, "academic_title", None),
                "university": getattr(r0.author, "university", None),
            },
            "reactions": reply_counts(db, r0.id),
            "children": [
                {
                    "id": r1.id,
                    "post_id": r1.post_id,
                    "body": r1.body,
                    "created_at": r1.created_at,
                    "author": {
                        "id": r1.author.id,
                        "first_name": r1.author.first_name,
                        "last_name": r1.author.last_name,
                        "role": r1.author.role,
                        "academic_title": getattr(r1.author, "academic_title", None),
                        "university": getattr(r1.author, "university", None),
                    },
                    "reactions": reply_counts(db, r1.id),
                    "children": [
                        {
                            "id": r2.id,
                            "post_id": r2.post_id,
                            "body": r2.body,
                            "created_at": r2.created_at,
                            "author": {
                                "id": r2.author.id,
                                "first_name": r2.author.first_name,
                                "last_name": r2.author.last_name,
                                "role": r2.author.role,
                                "academic_title": getattr(r2.author, "academic_title", None),
                                "university": getattr(r2.author, "university", None),
                            },
                            "reactions": reply_counts(db, r2.id),
                            "children": [],
                        }
                        for r2 in by_parent.get(r1.id, [])
                    ],
                }
                for r1 in by_parent.get(r0.id, [])
            ],
        }
        out.append(node0)
    return out


# ── REAKCJE / RAPORTY / USUWANIE KOMENTARZY ──────────────────────────────

@router.post("/reply/{reply_id}/react")
def reply_react(
    reply_id: int, 
    body: dict = Body(...),
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    r = db.get(ForumReply, reply_id)
    if not r or r.is_deleted:
        raise HTTPException(404, "Komentarz nie istnieje")

    t = (body.get("type") or "").strip()
    if t not in ("up", "down"):
        raise HTTPException(400, "Nieznana reakcja")

    rec = db.query(ForumReplyReaction).filter(
        ForumReplyReaction.reply_id == reply_id,
        ForumReplyReaction.user_id == current.id
    ).one_or_none()

    if rec:
        rec.type = t
    else:
        db.add(ForumReplyReaction(reply_id=reply_id, user_id=current.id, type=t))
    db.commit()

    if r.author_id != current.id:
        create_notification(
            db,
            user_id=r.author_id,
            type="reaction",
            payload={
                "reply_id": reply_id,
                "post_id": r.post_id,
                "actors": [f"{current.first_name} {current.last_name}"],
                "type": t,
            },
            url=f"/forum/{r.post_id}#reply-{reply_id}"
        )

    return {"counts": reply_counts(db, reply_id)}


@router.post("/{post_id}/report")
def post_report(
    post_id: int,
    body: dict = Body(...),
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    p = db.get(ForumPost, post_id)
    if not p or p.is_deleted:
        raise HTTPException(404, "Post nie istnieje")

    if p.author_id == current.id:
        raise HTTPException(400, "Nie można zgłosić własnego posta.")

    reason = (body.get("reason") or "").strip() or None
    db.add(ForumReport(post_id=post_id, reporter_id=current.id, reason=reason))
    db.commit()

    for a in db.query(User).filter(User.role == "admin"):
        create_notification(
            db,
            user_id=a.id,
            type="report",
            payload={
                "post_id": post_id,
                "reason": reason,
                "actors": [f"{current.first_name} {current.last_name}"],
            },
            url=f"/forum/{post_id}"
        )
    return {"ok": True}


@router.post("/reply/{reply_id}/report")
def reply_report(
    reply_id: int,
    body: dict = Body(...),
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    r = db.get(ForumReply, reply_id)
    if not r or r.is_deleted:
        raise HTTPException(404, "Komentarz nie istnieje")

    if r.author_id == current.id:
        raise HTTPException(400, "Nie można zgłosić własnego komentarza.")

    reason = (body.get("reason") or "").strip() or None
    db.add(ForumReplyReport(reply_id=reply_id, reporter_id=current.id, reason=reason))
    db.commit()

    for a in db.query(User).filter(User.role == "admin"):
        create_notification(
            db,
            user_id=a.id,
            type="report",
            payload={
                "reply_id": reply_id,
                "reason": reason,
                "actors": [f"{current.first_name} {current.last_name}"],
            },
            url=f"/forum/{r.post_id}#reply-{reply_id}"
        )
    return {"ok": True}


@router.delete("/reply/{reply_id}")
def reply_delete(
    reply_id: int,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    r = db.get(ForumReply, reply_id)
    if not r:
        raise HTTPException(404, "Nie istnieje")

    if current.role != "admin" and r.author_id != current.id:
        raise HTTPException(403, "Brak uprawnień")

    r.is_deleted = True
    db.commit()
    return {"ok": True}


# ── POSTY ────────────────────────────────────────────────────────────────

@router.get("")
def list_posts(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
    q: str | None = None, topic: str | None = None, uni: str | None = None,
    sort: Literal["newest", "latest_activity"] = "newest",
    limit: int = 30, offset: int = 0
):
    sel = select(ForumPost).options(joinedload(ForumPost.books)).where(ForumPost.is_deleted == False)

    if uni:
        if uni.lower() in ("ogólne", "ogolne"):
            sel = sel.where(ForumPost.university == "Ogólne")
        elif uni.lower() != "wszystkie":
            sel = sel.where(ForumPost.university == uni)

    if topic:
        sel = sel.where(func.lower(ForumPost.topic) == topic.lower())

    if q:
        like = f"%{q.lower()}%"
        sel = sel.where(
            func.lower(ForumPost.title).like(like) |
            func.lower(ForumPost.summary).like(like) |
            func.lower(ForumPost.body).like(like)
        )

    sel = sel.order_by(ForumPost.created_at.desc())
    rows = db.execute(sel.limit(limit).offset(offset)).scalars().unique().all()

    out = []
    for p in rows:
        counts = (
            db.query(ForumReaction.type, func.count("*"))
            .filter(ForumReaction.post_id == p.id)
            .group_by(ForumReaction.type)
            .all()
        )
        reactions = {t: c for (t, c) in counts}
        
        # Sprawdź reakcję użytkownika
        user_reaction = db.query(ForumReaction.type).filter(
            ForumReaction.post_id == p.id,
            ForumReaction.user_id == current.id
        ).scalar()
        
        out.append({
            "id": p.id,
            "title": p.title,
            "summary": p.summary,
            "body": p.body,
            "topic": p.topic,
            "created_at": p.created_at,
            "university": p.university,
            "books": [
                {
                    "id": book.id,
                    "title": book.title,
                    "authors": book.authors,
                    "thumbnail": book.thumbnail,
                }
                for book in p.books
            ],
            "author": {
                "id": p.author.id,
                "first_name": p.author.first_name,
                "last_name": p.author.last_name,
                "role": p.author.role,
                "academic_title": p.author.academic_title,
                "university": p.author.university,
            },
            "reactions": reactions,
            "user_reaction": user_reaction,
            "replies_count": db.query(func.count(ForumReply.id))
                .filter(ForumReply.post_id == p.id,
                        ForumReply.parent_id == None,
                        ForumReply.is_deleted == False)
                .scalar() or 0,
        })
    return out


@router.post("")
def create_post(
    body: dict = Body(...),
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current.role == "admin":
        raise HTTPException(403, "Admin nie może dodawać wpisów.")

    uni = (body.get("university") or "").strip() or None
    title = (body.get("title") or "").strip()
    summary = (body.get("summary") or "").strip()
    text = (body.get("body") or "").strip()
    topic = (body.get("topic") or "").strip()
    book_ids = body.get("book_ids", [])

    if not title or not summary or not text or not topic:
        raise HTTPException(400, "Tytuł, opis, treść i temat są wymagane.")
    
    if not book_ids:
        raise HTTPException(400, "Musisz wybrać przynajmniej jedną książkę.")

    p = ForumPost(
        author_id=current.id, title=title, summary=summary, body=text, topic=topic,
        university=uni or "Ogólne",
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    
    # Dodaj powiązania z książkami
    from app.models.book import Book
    for book_id in book_ids:
        book = db.get(Book, book_id)
        if book:
            p.books.append(book)
    
    db.commit()
    return {"id": p.id}


@router.get("/{post_id}")
def post_detail(post_id: int, db: Session = Depends(get_db)):
    p = db.query(ForumPost).options(joinedload(ForumPost.books)).filter(ForumPost.id == post_id).first()
    if not p or p.is_deleted:
        raise HTTPException(404, "Post nie istnieje")

    post_flagged = db.query(func.count(ForumReport.id)) \
        .filter(ForumReport.post_id == p.id, ForumReport.handled == False) \
        .scalar() or 0

    counts = dict(db.query(ForumReaction.type, func.count("*"))
                  .filter(ForumReaction.post_id == p.id)
                  .group_by(ForumReaction.type).all())

    return {
        "id": p.id,
        "title": p.title,
        "summary": p.summary,
        "body": p.body,
        "topic": p.topic,
        "created_at": p.created_at,
        "flagged": bool(post_flagged),
        "books": [
            {
                "id": book.id,
                "title": book.title,
                "authors": book.authors,
                "thumbnail": book.thumbnail,
            }
            for book in p.books
        ],
        "author": {
            "id": p.author.id,
            "first_name": p.author.first_name,
            "last_name": p.author.last_name,
            "role": p.author.role,
            "academic_title": p.author.academic_title,
            "university": p.author.university,
        },
        "reactions": counts,
        "replies": build_tree(db, post_id),
    }


@router.post("/{post_id}/react")
def post_react(
    post_id: int, body: dict = Body(...),
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    p = db.get(ForumPost, post_id)
    if not p or p.is_deleted:
        raise HTTPException(404, "Post nie istnieje")

    t = body.get("type")
    if t is not None and t not in REACTION_EMOJI:
        raise HTTPException(400, "Nieznana reakcja")

    rec = db.query(ForumReaction).filter(
        ForumReaction.post_id == post_id,
        ForumReaction.user_id == current.id
    ).one_or_none()
    
    if t is None:
        # Usuń reakcję
        if rec:
            db.delete(rec)
    else:
        # Dodaj lub zmień reakcję
        if rec:
            rec.type = t
        else:
            db.add(ForumReaction(post_id=post_id, user_id=current.id, type=t))
    
    db.commit()

    if p.author_id != current.id:
        create_notification(
            db,
            user_id=p.author_id,
            type="reaction",
            payload={
                "post_id": post_id,
                "actors": [f"{current.first_name} {current.last_name}"],
                "type": t,
            },
            url=f"/forum/{post_id}"
        )

    counts = dict(db.query(ForumReaction.type, func.count("*"))
                  .filter(ForumReaction.post_id == post_id)
                  .group_by(ForumReaction.type).all())
    
    # Sprawdź reakcję użytkownika po aktualizacji
    user_reaction = db.query(ForumReaction.type).filter(
        ForumReaction.post_id == post_id,
        ForumReaction.user_id == current.id
    ).scalar()
    
    return {"counts": counts, "user_reaction": user_reaction}


@router.post("/{post_id}/reply")
def add_reply(
    post_id: int, body: dict = Body(...),
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    p = db.get(ForumPost, post_id)
    if not p or p.is_deleted:
        raise HTTPException(404, "Post nie istnieje")

    text = (body.get("body") or "").strip()
    parent_id = body.get("parent_id")

    if not text:
        raise HTTPException(400, "Treść odpowiedzi jest wymagana.")

    parent = None
    if parent_id is not None:
        parent = db.get(ForumReply, int(parent_id))
        if not parent or parent.post_id != post_id:
            raise HTTPException(400, "Nieprawidłowy parent_id.")

    r = ForumReply(post_id=post_id, author_id=current.id, body=text, parent_id=parent_id)
    db.add(r)
    db.commit()
    db.refresh(r)

    actor = f"{current.first_name} {current.last_name}"

    if p.author_id != current.id:
        create_notification(
            db,
            user_id=p.author_id,
            type="reply",
            payload={
                "post_id": post_id,
                "reply_id": r.id,
                "actors": [actor],
            },
            url=f"/forum/{post_id}#reply-{r.id}"
        )

    if parent and parent.author_id not in (None, current.id, p.author_id):
        create_notification(
            db,
            user_id=parent.author_id,
            type="reply",
            payload={
                "post_id": post_id,
                "reply_id": r.id,
                "actors": [actor],
            },
            url=f"/forum/{post_id}#reply-{r.id}"
        )

    return {"id": r.id}


@router.delete("/{post_id}")
def delete_post(
    post_id: int,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    p = db.get(ForumPost, post_id)
    if not p:
        raise HTTPException(404, "Nie istnieje")

    if current.role != "admin" and p.author_id != current.id:
        raise HTTPException(403, "Brak uprawnień.")

    p.is_deleted = True
    db.commit()
    return {"ok": True}
