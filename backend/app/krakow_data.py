# app/krakow_data.py
from __future__ import annotations

from pathlib import Path
import json
from typing import Dict, List

DATA_PATH = Path(__file__).parent / "data" / "krakow_universities.json"

try:
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        raw = json.load(f)
        _DATA = raw["universities"]
except FileNotFoundError as e:
    raise RuntimeError(f"Brak pliku z danymi uczelni: {DATA_PATH}") from e
except KeyError as e:
    raise RuntimeError(
        f"Niepoprawny format JSON (brak klucza 'universities') w {DATA_PATH}"
    ) from e

DOMAIN_TO_UNI: Dict[str, str] = {}
UNIVERSITY_FACULTIES: Dict[str, List[str]] = {}
UNIVERSITY_CONTACTS: Dict[str, dict] = {}

for uni in _DATA:
    name: str = uni["name"]
    for dom in uni.get("domains", []):
        if isinstance(dom, str) and dom:
            DOMAIN_TO_UNI[dom.lower()] = name
    UNIVERSITY_FACULTIES[name] = list(uni.get("faculties", []))
    contacts = uni.get("contacts")
    if isinstance(contacts, dict):
        UNIVERSITY_CONTACTS[name] = contacts

ACADEMIC_TITLES = [
    "Profesor", "Profesor Uczelni",
    "Doktor Habilitowany",
    "Doktor",
    "Magister Inżynier",
    "Magister",
    "Inżynier",
]
