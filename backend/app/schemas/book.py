from pydantic import BaseModel, validator
from datetime import date
from typing import Optional
from app.db.schemas import UserOut


class RatingBase(BaseModel):
    value: float  


class RatingCreate(RatingBase):
    pass


class RatingOut(RatingBase):
    id: int
    user_id: int

    class Config:
        orm_mode = True


class ReviewBase(BaseModel):
    text: str


class ReviewCreate(BaseModel):
    rating: float   # ⭐ połówki
    text: str


class ReviewOut(BaseModel):
    id: int
    rating: float
    text: str
    user_id: int
    book_id: int
    created_at: date        # 👈 tylko data
    user: Optional["UserOut"]

    model_config = {"from_attributes": True}


class BookBase(BaseModel):
    title: str
    authors: Optional[str] = None
    publisher: Optional[str] = None
    published_date: Optional[str] = None
    thumbnail: Optional[str] = None
    categories: Optional[str] = None
    description: Optional[str] = None
    available_copies: int


class BookCreate(BaseModel):
    title: str
    authors: str
    publisher: Optional[str] = None
    published_date: Optional[str] = None
    thumbnail: Optional[str] = None
    categories: Optional[str] = None
    description: Optional[str] = None
    available_copies: Optional[int] = 1 
    university: str


class BookOut(BaseModel):
    id: Optional[int] = None
    google_id: Optional[str] = None
    title: str
    authors: Optional[str] = None
    published_date: Optional[str] = None
    categories: Optional[str] = None
    description: Optional[str] = None
    thumbnail: Optional[str] = None
    language: Optional[str] = None
    page_count: Optional[int] = None
    isbn: Optional[str] = None

    avg_rating: Optional[float] = 0.0
    reviews_count: Optional[int] = 0
    available_copies: int = 1

    created_by: Optional[int] = None   

    class Config:
        from_attributes = True


# 🔹 Loan – tylko daty
class LoanBase(BaseModel):
    due_date: date
    @validator("due_date", pre=True)
    def check_date(cls, v):
        return v


class LoanCreate(BaseModel):
    due_date: date
    @validator("due_date", pre=True)
    def check_date(cls, v):
        return v


class LoanOut(LoanBase):
    id: int
    user_id: int
    book_id: int
    start_date: date
    returned_at: Optional[date]

    class Config:
        orm_mode = True
