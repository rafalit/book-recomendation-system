# app/schemas.py
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, Literal
from datetime import datetime

Role = Literal["student", "researcher"]

class RegisterIn(BaseModel):
    role: Role
    email: EmailStr
    first_name: str
    last_name: str
    university: str
    faculty: str
    # student-only
    field: str | None = None
    study_year: str | None = None
    # researcher-only
    academic_title: str | None = None
    password: str
    verification_code: str

    @field_validator("email")
    @classmethod
    def email_lower(cls, v): return v.lower()

class UserOut(BaseModel):
    id: int
    email: EmailStr
    role: Role
    first_name: str
    last_name: str
    university: str
    faculty: str
    field: Optional[str] = None
    study_year: Optional[str] = None
    academic_title: Optional[str] = None
    model_config = {"from_attributes": True}

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class ResetStart(BaseModel):
    email: EmailStr

class ResetVerify(BaseModel):
    email: EmailStr
    code: str

class ResetConfirm(BaseModel):
    email: EmailStr
    code: str
    new_password: str

class EventOut(BaseModel):
    id: int
    title: str
    start_at: datetime
    end_at: datetime | None = None
    all_day: bool = False
    is_online: bool = False
    location_name: str | None = None
    address: str | None = None
    university_name: str | None = None
    category: str | None = None
    thumbnail: str | None = None
    publisher_favicon: str | None = None
    registration_url: str | None = None
    organizer: str | None = None

    model_config = {"from_attributes": True}

class EventDetail(EventOut):
    description: str | None = None
    meeting_url: str | None = None
    lat: float | None = None
    lon: float | None = None
    tags: str | None = None
    source_url: str | None = None

class RSVPIn(BaseModel):
    state: Literal["going", "interested", "declined"]
    reminder_minutes_before: int | None = None

class RSVPOut(BaseModel):
    user_id: int
    event_id: int
    state: Literal["going", "interested", "declined"]
    reminder_minutes_before: int | None = None