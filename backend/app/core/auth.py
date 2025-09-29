# app/auth.py
import os
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from dotenv import load_dotenv

from ..db.database import get_db
from .. import models

load_dotenv()

# --- JWT/crypto config ---
SECRET_KEY = os.getenv("SECRET_KEY", "change_me_super_secret")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# --- password utils ---
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

# --- token utils ---
def create_access_token(data: dict, expires_minutes: int = ACCESS_TOKEN_EXPIRE_MINUTES) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=expires_minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# --- user lookup ---
def get_user_by_email(db: Session, email: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.email == email.lower()).first()

# --- dependency: current user from Bearer token ---
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Nieprawidłowy token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if not email:
            raise credentials_exc
    except JWTError:
        raise credentials_exc

    user = get_user_by_email(db, email=email)
    if not user:
        raise credentials_exc
    return user

# --- walidacje z Twoich reguł ( używane w users.py ) ---
import re
NAME_RE = re.compile(r"^[A-ZĄĆĘŁŃÓŚŻŹ][a-ząćęłńóśżź-]*$")

def validate_first_last(first: str, last: str):
    if not NAME_RE.fullmatch(first):
        raise HTTPException(status_code=400, detail="Niepoprawne imię (tylko litery, 1 wielka na początku).")
    if not NAME_RE.fullmatch(last):
        raise HTTPException(status_code=400, detail="Niepoprawne nazwisko (tylko litery, 1 wielka na początku).")

def validate_password_strength(password: str):
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Hasło musi mieć co najmniej 8 znaków.")
    if not re.search(r"[0-9]", password):
        raise HTTPException(status_code=400, detail="Hasło musi zawierać cyfrę.")
    if not re.search(r"[^A-Za-z0-9]", password):
        raise HTTPException(status_code=400, detail="Hasło musi zawierać znak specjalny.")
