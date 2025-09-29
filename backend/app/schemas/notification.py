from pydantic import BaseModel
from datetime import date


class NotificationBase(BaseModel):
    id: int
    type: str
    payload: str
    url: str | None = None
    created_at: date
    read: bool

    class Config:
        orm_mode = True
