from datetime import date
from sqlalchemy import Column, Date, Integer, String, Text, Boolean, ForeignKey, Enum, UniqueConstraint, func, Table
from sqlalchemy.orm import relationship
from app.db.database import Base

class ForumTopic(str, Enum):
    # Kategorie związane z książkami
    dyskusja_ksiazki = "Dyskusja o książce"
    recenzja = "Recenzja"
    pytanie = "Pytanie o książkę"
    rekomendacja = "Rekomendacja"
    wymiana = "Wymiana książek"
    ogloszenia = "Ogłoszenia"

class ReactionType(str, Enum):
    like = "like"
    celebrate = "celebrate"
    support = "support"
    love = "love"
    insightful = "insightful"
    funny = "funny"

# Tabela asocjacyjna dla powiązania postów z książkami
forum_post_books = Table(
    'forum_post_books',
    Base.metadata,
    Column('post_id', Integer, ForeignKey('forum_posts.id', ondelete='CASCADE'), primary_key=True),
    Column('book_id', Integer, ForeignKey('books.id', ondelete='CASCADE'), primary_key=True)
)

class ForumPost(Base):
    __tablename__ = "forum_posts"
    id = Column(Integer, primary_key=True)
    author_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    university = Column(String, index=True, nullable=True, server_default="Ogólne")

    title = Column(String, nullable=False)
    summary = Column(String, nullable=False)   # krótki opis
    body = Column(Text, nullable=False)
    topic = Column(String, index=True, nullable=False)  # np. wartości z ForumTopic

    created_at = Column(Date, default=date.today, index=True)
    updated_at = Column(Date, default=date.today, onupdate=date.today)
    is_deleted = Column(Boolean, default=False)

    author = relationship("User")
    replies = relationship(
        "ForumReply",
        back_populates="post",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    reactions = relationship(
        "ForumReaction",
        back_populates="post",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    books = relationship(
        "Book",
        secondary=forum_post_books,
        back_populates="forum_posts"
    )

class ForumReply(Base):
    __tablename__ = "forum_replies"
    id = Column(Integer, primary_key=True)
    post_id = Column(Integer, ForeignKey("forum_posts.id", ondelete="CASCADE"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    body = Column(Text, nullable=False)
    created_at = Column(Date, default=date.today)
    is_deleted = Column(Boolean, default=False)            

    parent_id = Column(Integer, ForeignKey("forum_replies.id", ondelete="CASCADE"), nullable=True)
    parent = relationship("ForumReply", remote_side="ForumReply.id", backref="children")
    post = relationship("ForumPost", back_populates="replies")
    author = relationship("User")                            

class ForumReplyReaction(Base):
    __tablename__ = "forum_reply_reactions"
    reply_id = Column(Integer, ForeignKey("forum_replies.id", ondelete="CASCADE"), primary_key=True)
    user_id  = Column(Integer, ForeignKey("users.id"), primary_key=True)
    type     = Column(String, nullable=False)  # "up"|"down"
    created_at = Column(Date, default=date.today)

    reply = relationship("ForumReply")
    user  = relationship("User")

    __tableargs__ = (UniqueConstraint("reply_id","user_id", name="uq_reply_reaction"),)

class ForumReplyReport(Base):
    __tablename__ = "forum_reply_reports"
    id = Column(Integer, primary_key=True)
    reply_id = Column(Integer, ForeignKey("forum_replies.id", ondelete="CASCADE"), index=True, nullable=False)
    reporter_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    reason = Column(String, nullable=True)
    created_at = Column(Date, default=date.today)
    handled = Column(Boolean, default=False)

    reply = relationship("ForumReply")
    reporter = relationship("User")

class ForumReaction(Base):
    __tablename__ = "forum_reactions"
    post_id = Column(Integer, ForeignKey("forum_posts.id", ondelete="CASCADE"), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    type = Column(String, nullable=False)  # ReactionType
    created_at = Column(Date, default=date.today)

    post = relationship("ForumPost", back_populates="reactions")
    user = relationship("User")
    __tableargs__ = (
        UniqueConstraint("post_id", "user_id", name="uq_reaction_post_user"),
    )

class ForumReport(Base):
    __tablename__ = "forum_reports"
    id = Column(Integer, primary_key=True)
    post_id = Column(Integer, ForeignKey("forum_posts.id", ondelete="CASCADE"), index=True, nullable=False)
    reporter_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    reason = Column(String, nullable=True)
    created_at = Column(Date, default=date.today)
    handled = Column(Boolean, default=False)

    post = relationship("ForumPost")
    reporter = relationship("User")