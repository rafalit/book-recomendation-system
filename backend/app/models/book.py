from sqlalchemy import Column, Integer, String, Text, ForeignKey, Date, Float, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import date
from app.db.database import Base

from sqlalchemy import Column, Integer, String, Text, ForeignKey, Float, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db.database import Base

class Book(Base):
    __tablename__ = "books"
    id = Column(Integer, primary_key=True, index=True)
    google_id = Column(String, nullable=True, unique=True)
    title = Column(String, nullable=False)
    authors = Column(String, nullable=True)
    publisher = Column(String, nullable=True)
    published_date = Column(String, nullable=True)
    thumbnail = Column(String, nullable=True)
    categories = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    available_copies = Column(Integer)
    university = Column(String, nullable=True)   
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)  

    ratings = relationship("Rating", back_populates="book", cascade="all,delete")
    reviews = relationship("Review", back_populates="book", cascade="all,delete")
    loans = relationship("Loan", back_populates="book", cascade="all,delete")


class Rating(Base):
    __tablename__ = "ratings"
    id = Column(Integer, primary_key=True, index=True)
    value = Column(Float, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"))
    book_id = Column(Integer, ForeignKey("books.id"))

    book = relationship("Book", back_populates="ratings")


class Review(Base):
    __tablename__ = "reviews"
    id = Column(Integer, primary_key=True, index=True)
    text = Column(Text, nullable=False)
    rating = Column(Float, nullable=False)   # ⭐ ocena przeniesiona do recenzji
    created_at = Column(Date, default=date.today)
    user_id = Column(Integer, ForeignKey("users.id"))
    book_id = Column(Integer, ForeignKey("books.id"))

    book = relationship("Book", back_populates="reviews")
    reactions = relationship("ReviewReaction", back_populates="review", cascade="all,delete")
    user = relationship("User") 


class Loan(Base):
    __tablename__ = "loans"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    book_id = Column(Integer, ForeignKey("books.id"))
    start_date = Column(Date, default=date.today)
    due_date = Column(Date, nullable=False)
    returned_at = Column(Date, nullable=True)

    book = relationship("Book", back_populates="loans")


class ReviewReaction(Base):
    __tablename__ = "review_reactions"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    review_id = Column(Integer, ForeignKey("reviews.id"), nullable=False)
    type = Column(String, nullable=False)  # 'thumbs_up' | 'thumbs_down'

    __table_args__ = (UniqueConstraint("user_id", "review_id", name="uq_user_review"),)

    review = relationship("Review", back_populates="reactions")
    user = relationship("User")


class ReviewReport(Base):
    __tablename__ = "review_reports"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # zgłaszający
    review_id = Column(Integer, ForeignKey("reviews.id"), nullable=False)
    reason = Column(String, nullable=True)
    created_at = Column(Date, default=date.today)