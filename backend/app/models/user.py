from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.db.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)

    role = Column(String, nullable=False)        # "student" | "researcher"
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    university = Column(String, nullable=False)
    faculty = Column(String, nullable=False)
    field = Column(String, nullable=True)
    study_year = Column(String, nullable=True)
    academic_title = Column(String, nullable=True)

    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
