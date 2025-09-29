# app/api/routes_contacts.py
from __future__ import annotations
from fastapi import APIRouter, HTTPException

from ..krakow_data import UNIVERSITY_CONTACTS

router = APIRouter(prefix="/contact", tags=["contact"])

@router.get("")
def list_contacts():
    """Zwraca mapę 'nazwa uczelni' → kontakt."""
    return UNIVERSITY_CONTACTS

@router.get("/{university_name}")
def contact_by_name(university_name: str):
    c = UNIVERSITY_CONTACTS.get(university_name)
    if not c:
        raise HTTPException(404, "Brak danych kontaktowych")
    return c
