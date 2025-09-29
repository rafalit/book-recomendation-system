from sqlalchemy import Column, DateTime, Integer, String, Text, Boolean, Float, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.database import Base

class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)

    start_at = Column(DateTime, index=True, nullable=False)
    end_at = Column(DateTime, nullable=True)
    timezone = Column(String, default="Europe/Warsaw")
    all_day = Column(Boolean, default=False)

    is_online = Column(Boolean, default=False)
    meeting_url = Column(String, nullable=True)
    location_name = Column(String, nullable=True)
    address = Column(String, nullable=True)
    lat = Column(Float, nullable=True)
    lon = Column(Float, nullable=True)

    organizer = Column(String, nullable=True)
    university_name = Column(String, index=True, nullable=True)
    category = Column(String, index=True, nullable=True)
    tags = Column(String, nullable=True)

    thumbnail = Column(String, nullable=True)
    publisher_favicon = Column(String, nullable=True)
    registration_url = Column(String, nullable=True)
    price = Column(String, nullable=True)

    source_url = Column(String, nullable=True)
    source_type = Column(String, nullable=True)
    source_uid = Column(String, nullable=True)
    hash = Column(String, unique=True, nullable=True)

    status = Column(String, default="published")
    fetched_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    attendees = relationship("UserEvent", back_populates="event", cascade="all, delete-orphan")

    __table_args__ = (UniqueConstraint("source_type", "source_uid", name="uq_event_source_uid"),)


class UserEvent(Base):
    __tablename__ = "user_events"

    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    event_id = Column(Integer, ForeignKey("events.id"), primary_key=True)

    state = Column(String, nullable=False)  # going|interested|declined
    reminder_minutes_before = Column(Integer, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    event = relationship("Event", back_populates="attendees")
