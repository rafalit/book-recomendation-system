from sqlalchemy import Column, Integer, String, Text, Boolean, Date, ForeignKey, func
from sqlalchemy.orm import relationship
from app.db.database import Base

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(String, nullable=False)
    payload = Column(Text, nullable=False)   # tutaj przechowujemy dane: actors, url itp.
    created_at = Column(Date, server_default=func.now())
    read = Column(Boolean, default=False, nullable=False)
    post_id = Column(Integer, nullable=True)
    reply_id = Column(Integer, nullable=True)

    user = relationship("User", back_populates="notifications")
