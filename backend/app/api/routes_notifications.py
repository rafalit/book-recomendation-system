from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import json as _json

from app.db.database import get_db
from app.models.notification import Notification
from app.models.user import User
from app.utils.deps import get_current_user

router = APIRouter(prefix="/notifications", tags=["notifications"])


# ── FORMATOWANIE ──────────────────────────────────────────────────────────
def format_notification(n: Notification) -> str:
    try:
        data = _json.loads(n.payload or "{}")
    except Exception:
        data = {}

    actors = data.get("actors", [])
    if not actors:
        who = "Ktoś"
    elif len(actors) == 1:
        who = actors[0]
    elif len(actors) == 2:
        who = f"{actors[0]} i {actors[1]}"
    else:
        who = f"{actors[0]}, {actors[1]} i {len(actors) - 2} innych"

    if n.type == "reaction":
        if data.get("reply_id"):
            return f"{who} zareagował(a) na Twój komentarz"
        return f"{who} zareagował(a) na Twój post"

    if n.type == "reply":
        return f"{who} odpowiedział(a) w Twoim wątku"

    if n.type == "report":
        reason = data.get("reason") or ""
        return f"Twój komentarz został zgłoszony: {reason}"

    if n.type == "review_reaction":
        return f"{who} ocenił(a) Twoją recenzję"
    
    if n.type == "new_review":
        book_title = data.get("book_title", "Twoja książka")
        return f"{who} dodał(a) recenzję do Twojej książki „{book_title}”"

    return "Nowe powiadomienie"


# ── ENDPOINTY ─────────────────────────────────────────────────────────────
@router.get("")
def list_notifications(
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notifs = (
        db.query(Notification)
        .filter(Notification.user_id == current.id)
        .order_by(Notification.created_at.desc())
        .limit(50)
        .all()
    )

    out = []
    for n in notifs:
        try:
            data = _json.loads(n.payload or "{}")
        except Exception:
            data = {}

        # 🔄 mapowanie backend → frontend
        if n.type == "reaction":
            if data.get("reply_id"):
                notif_type = "reaction_review"
            else:
                notif_type = "reaction_post"
        elif n.type == "reply":
            # w obecnym systemie reply zawsze dotyczy posta
            notif_type = "reply_post"
        elif n.type == "review_reaction":
            notif_type = "reaction_review"
        elif n.type == "report":
            if data.get("review_id"):
                notif_type = "report_review"
            else:
                notif_type = "report_post"
        elif n.type == "new_review":
            notif_type = "new_review"
        else:
            notif_type = n.type  # fallback

        out.append({
            "id": n.id,
            "type": notif_type,   # <-- 🔥 zgodne z frontendem
            "created_at": n.created_at,
            "read": n.read,
            "text": format_notification(n),
            "url": data.get("url"),  # 🔥 frontend klika w to
        })
    return out



@router.post("/{notif_id}/read")
def mark_as_read(
    notif_id: int,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    n = db.get(Notification, notif_id)
    if not n or n.user_id != current.id:
        raise HTTPException(404, "Powiadomienie nie istnieje")

    n.read = True
    db.commit()
    return {"ok": True}


@router.delete("/{notif_id}")
def delete_notification(
    notif_id: int,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    n = db.get(Notification, notif_id)
    if not n or n.user_id != current.id:
        raise HTTPException(404, "Powiadomienie nie istnieje")

    db.delete(n)
    db.commit()
    return {"ok": True}


@router.get("/unread_count")
def unread_count(
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cnt = (
        db.query(Notification)
        .filter(Notification.user_id == current.id, Notification.read == False)
        .count()
    )
    return {"count": cnt}
