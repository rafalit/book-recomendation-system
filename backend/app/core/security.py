# app/security.py
from time import time
from fastapi import HTTPException

FAILED_LOGINS = {}
LOCKOUT_TIME = 300  # 5 minut
MAX_ATTEMPTS = 5

def check_login_attempts(email: str):
    now = time()
    attempts = FAILED_LOGINS.get(email, {"count": 0, "last": now})
    if attempts["count"] >= MAX_ATTEMPTS and now - attempts["last"] < LOCKOUT_TIME:
        raise HTTPException(status_code=429, detail="Konto zablokowane na 5 minut po wielu nieudanych próbach.")
    return attempts

def record_failed_login(email: str):
    now = time()
    attempts = FAILED_LOGINS.get(email, {"count": 0, "last": now})
    attempts["count"] += 1
    attempts["last"] = now
    FAILED_LOGINS[email] = attempts

def reset_login_attempts(email: str):
    FAILED_LOGINS.pop(email, None)
