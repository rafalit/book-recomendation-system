# app/api/routes_meta.py
from __future__ import annotations
from fastapi import APIRouter

from ..krakow_data import DOMAIN_TO_UNI, UNIVERSITY_FACULTIES, ACADEMIC_TITLES

router = APIRouter(prefix="/meta", tags=["meta"])

@router.get("/config")
def meta_config():
    return {
        "domain_to_uni": DOMAIN_TO_UNI,
        "university_faculties": UNIVERSITY_FACULTIES,
        "titles": ACADEMIC_TITLES,
    }
