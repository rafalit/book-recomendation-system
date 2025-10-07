#!/usr/bin/env python3
"""
Skrypt do tworzenia użytkownika admin w bazie danych.
Uruchom: python -m app.scripts.seed_admin
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.database import SessionLocal
from app import models
from app.core.auth import hash_password

def create_admin():
    db = SessionLocal()
    try:
        # Sprawdź czy admin już istnieje
        existing_admin = db.query(models.User).filter(models.User.email == "admin@admin.pl").first()
        if existing_admin:
            print("❌ Admin już istnieje w bazie danych!")
            return
        
        # Stwórz admina
        admin_user = models.User(
            email="admin@admin.pl",
            hashed_password=hash_password("admin"),
            role="admin",
            first_name="Admin",
            last_name="Administrator",
            university="System",
            faculty="Administracja",
            field=None,
            study_year=None,
            academic_title="Administrator"
        )
        
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        
        print("✅ Admin został utworzony pomyślnie!")
        print(f"   Email: admin@admin.pl")
        print(f"   Hasło: admin")
        print(f"   ID: {admin_user.id}")
        
    except Exception as e:
        print(f"❌ Błąd podczas tworzenia admina: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_admin()
