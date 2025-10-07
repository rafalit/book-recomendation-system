# app/api/routes_auth.py
from __future__ import annotations

from ..db import schemas
from .. import models
from ..core import auth, security
from fastapi import APIRouter, Depends, HTTPException, status, Body
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from ..services import users
from ..db.database import get_db

router = APIRouter(prefix="/auth", tags=["auth"])

# --- rejestracja
@router.post("/register", response_model=schemas.UserOut)
def register(body: schemas.RegisterIn, db: Session = Depends(get_db)):
    return users.create_user(body, db)

# --- login
@router.post("/login", response_model=schemas.Token)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    email = form.username.lower()
    security.check_login_attempts(email)
    user = auth.get_user_by_email(db, email)
    if not user or not auth.verify_password(form.password, user.hashed_password):
        security.record_failed_login(email)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Złe dane logowania",
        )
    security.reset_login_attempts(email)
    token = auth.create_access_token({"sub": user.email, "role": user.role})
    return {"access_token": token, "token_type": "bearer"}

# --- ja (profil z tokenu)
@router.get("/me", response_model=schemas.UserOut)
async def read_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

# --- reset hasła (3 kroki) — zostawiamy proste MVP z kodem
RESET_CODE = "luty2026"

@router.post("/password/reset/start")
def reset_start(body: schemas.ResetStart, db: Session = Depends(get_db)):
    # (bezpieczna odpowiedź bez ujawniania, czy email istnieje)
    return {"message": "Jeśli email istnieje, wysłano kod."}

@router.post("/password/reset/verify")
def reset_verify(body: schemas.ResetVerify):
    if body.code != RESET_CODE:
        raise HTTPException(400, "Nieprawidłowy kod weryfikacyjny.")
    return {"message": "Kod poprawny."}

@router.post("/password/reset/confirm")
def reset_confirm(body: schemas.ResetConfirm, db: Session = Depends(get_db)):
    if body.code != RESET_CODE:
        raise HTTPException(400, "Nieprawidłowy kod weryfikacyjny.")
    user = db.query(models.User).filter(models.User.email == body.email.lower()).first()
    # nie zdradzamy istnienia emaila
    if not user:
        return {"message": "Hasło zmienione, jeśli email istnieje."}
    auth.validate_password_strength(body.new_password, body.email)
    user.hashed_password = auth.hash_password(body.new_password)
    db.add(user)
    db.commit()
    return {"message": "Hasło zmienione."}
