from datetime import date
from sqlalchemy import Column, Date, Integer, String, Text, Boolean, ForeignKey, Enum, UniqueConstraint, func
from sqlalchemy.orm import relationship
from app.db.database import Base

class ForumTopic(str, Enum):
    # dopisz co chcesz, to są przykładowe
    AI = "AI"
    energetyka = "Energetyka"
    dydaktyka = "Dydaktyka"
    stypendia = "Stypendia"
    ogloszenia = "Ogłoszenia"

class ReactionType(str, Enum):
    like = "like"
    celebrate = "celebrate"
    support = "support"
    love = "love"
    insightful = "insightful"
    funny = "funny"

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

class ForumReply(Base):
    __tablename__ = "forum_replies"
    id = Column(Integer, primary_key=True)
    post_id = Column(Integer, ForeignKey("forum_posts.id"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    body = Column(Text, nullable=False)
    created_at = Column(Date, default=date.today)
    is_deleted = Column(Boolean, default=False)            

    parent_id = Column(Integer, ForeignKey("forum_replies.id"), nullable=True)
    parent = relationship("ForumReply", remote_side="ForumReply.id", backref="children")
    post = relationship("ForumPost", back_populates="replies")
    author = relationship("User")                            

class ForumReplyReaction(Base):
    __tablename__ = "forum_reply_reactions"
    reply_id = Column(Integer, ForeignKey("forum_replies.id"), primary_key=True)
    user_id  = Column(Integer, ForeignKey("users.id"), primary_key=True)
    type     = Column(String, nullable=False)  # "up"|"down"
    created_at = Column(Date, default=date.today)

    reply = relationship("ForumReply")
    user  = relationship("User")

    __tableargs__ = (UniqueConstraint("reply_id","user_id", name="uq_reply_reaction"),)

class ForumReplyReport(Base):
    __tablename__ = "forum_reply_reports"
    id = Column(Integer, primary_key=True)
    reply_id = Column(Integer, ForeignKey("forum_replies.id"), index=True, nullable=False)
    reporter_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    reason = Column(String, nullable=True)
    created_at = Column(Date, default=date.today)
    handled = Column(Boolean, default=False)

    reply = relationship("ForumReply")
    reporter = relationship("User")

class ForumReaction(Base):
    __tablename__ = "forum_reactions"
    post_id = Column(Integer, ForeignKey("forum_posts.id"), primary_key=True)
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
    post_id = Column(Integer, ForeignKey("forum_posts.id"), index=True, nullable=False)
    reporter_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    reason = Column(String, nullable=True)
    created_at = Column(Date, default=date.today)
    handled = Column(Boolean, default=False)

    post = relationship("ForumPost")
    reporter = relationship("User")