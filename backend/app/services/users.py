# app/users.py
from ..core import auth
from fastapi import HTTPException
from sqlalchemy.orm import Session
from .. import models
from ..krakow_data import DOMAIN_TO_UNI, UNIVERSITY_FACULTIES, ACADEMIC_TITLES

REG_CODE = "styczeń2026"

def _uni_from_email(email: str) -> str | None:
    domain = email.split("@")[-1].lower()
    return DOMAIN_TO_UNI.get(domain)

def create_user(payload, db: Session) -> models.User:
    # 1) Weryfikacja roli
    if payload.role not in ("student", "researcher"):
        raise HTTPException(400, "Nieobsługiwana rola.")

    # 2) Email lower + domena → uczelnia
    email = payload.email.lower()
    uni_from_domain = _uni_from_email(email)
    if not uni_from_domain:
        raise HTTPException(400, "Domena e-mail nie jest obsługiwana (Kraków).")

    # 3) Uczelnia w formularzu musi zgadzać się z domeną
    if payload.university != uni_from_domain:
        raise HTTPException(400, "Uczelnia nie zgadza się z domeną e-mail.")

    # 4) Wydział musi należeć do uczelni
    valid_fac = UNIVERSITY_FACULTIES.get(uni_from_domain, [])
    if payload.faculty not in valid_fac:
        raise HTTPException(400, "Wydział nie należy do wskazanej uczelni.")

    # 5) Walidacja imienia/nazwiska i hasła
    auth.validate_first_last(payload.first_name, payload.last_name)
    auth.validate_password_strength(payload.password)

    # 6) Specyficzne wymagania
    if payload.role == "student":
        if payload.study_year not in [str(i) for i in range(1, 6)]:
            raise HTTPException(400, "Rok studiów musi być 1..5 (string).")
        if not payload.field:
            raise HTTPException(400, "Kierunek jest wymagany dla studenta.")
        # dodatkowa reguła .edu.pl dla studenta (opcjonalnie, zgodnie z Twoim doprecyzowaniem)
        if not email.endswith(".edu.pl"):
            raise HTTPException(400, "Student musi mieć e-mail w domenie .edu.pl")
    else:
        if not payload.academic_title or payload.academic_title not in ACADEMIC_TITLES:
            raise HTTPException(400, "Nieprawidłowy tytuł naukowy.")
        # dodatkowa reguła .pl dla pracownika
        if not email.endswith(".pl") or email.endswith(".edu.pl"):
            raise HTTPException(400, "Pracownik musi mieć e-mail w domenie .pl")

    # 7) Kod weryfikacyjny
    if payload.verification_code != REG_CODE:
        raise HTTPException(400, "Nieprawidłowy kod weryfikacyjny.")

    # 8) Unikalny e-mail
    if db.query(models.User).filter(models.User.email == email).first():
        raise HTTPException(400, "Użytkownik z takim e-mailem już istnieje.")

    # 9) Hash i zapis (same stringi)
    hashed = auth.hash_password(payload.password)
    user = models.User(
        email=email,
        hashed_password=hashed,
        role=payload.role,
        first_name=payload.first_name,
        last_name=payload.last_name,
        university=payload.university,
        faculty=payload.faculty,
        field=payload.field or None,
        study_year=payload.study_year or None,
        academic_title=payload.academic_title or None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
