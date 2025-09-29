from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.book_cache import BookCache

CACHE_TTL_HOURS = 48

def get_cached_books(db: Session, uni: str):
    row = db.query(BookCache).filter_by(university=uni).first()
    if row and row.updated_at > datetime.utcnow() - timedelta(hours=CACHE_TTL_HOURS):
        return row.data
    return None

def set_cached_books(db: Session, uni: str, data: list[dict]):
    row = db.query(BookCache).filter_by(university=uni).first()
    if not row:
        row = BookCache(university=uni, data=data, updated_at=datetime.utcnow())
        db.add(row)
    else:
        row.data = data
        row.updated_at = datetime.utcnow()
    db.commit()
