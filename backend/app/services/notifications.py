from sqlalchemy.orm import Session
import json as _json
from app.models.notification import Notification


def create_notification(
    db: Session,
    user_id: int,
    type: str,
    payload: dict,
    url: str | None = None,
):
    """
    Utwórz powiadomienie.
    """
    # uproszczone przekierowania
    if url:
        if url.startswith("/forum"):
            payload["url"] = "/forum"
        elif url.startswith("/books"):
            payload["url"] = "/books"
        else:
            payload["url"] = "/"
    else:
        payload["url"] = "/"

    n = Notification(
        user_id=user_id,
        type=type,
        payload=_json.dumps(payload),
    )
    db.add(n)
    db.commit()
    db.refresh(n)
    return n

