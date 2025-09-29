from sqlalchemy import Column, Date, Integer, String, JSON
from datetime import date
from app.db.database import Base

class BookCache(Base):
    __tablename__ = "books_cache"

    id = Column(Integer, primary_key=True, index=True)
    university = Column(String, index=True, unique=True)
    data = Column(JSON)  # lista książek
    updated_at = Column(Date, default=date.today)
