# app/utils/deps.py
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app import models
from app.core import auth

def get_current_user(
    db: Session = Depends(get_db),
    token_data: dict = Depends(auth.get_current_user),
) -> models.User:
    """
    Zwraca aktualnie zalogowanego użytkownika na podstawie JWT.
    """
    user = db.query(models.User).filter(models.User.email == token_data.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nieprawidłowe uwierzytelnienie",
        )
    return user
