#!/usr/bin/env python3
"""Sprawdź co jest w bazie danych wydarzeń"""

from app.db.database import get_db
from app.models.event import Event
from sqlalchemy import select, func
from sqlalchemy.orm import Session

def check_events():
    # Połącz się z bazą danych
    db = next(get_db())
    
    try:
        # Sprawdź statystyki wydarzeń
        total = db.execute(select(func.count()).select_from(Event)).scalar() or 0
        print(f'Total events: {total}')
        
        # Sprawdź kategorie
        categories = db.execute(
            select(Event.category.label('category'), func.count().label('count'))
            .where(Event.category.isnot(None))
            .group_by(Event.category)
            .order_by(func.count().desc())
        ).all()
        
        print('\nCategories:')
        for cat in categories:
            print(f'  {cat.category}: {cat.count}')
        
        # Sprawdź uczelnie
        universities = db.execute(
            select(Event.university_name.label('university_name'), func.count().label('count'))
            .where(Event.university_name.isnot(None))
            .group_by(Event.university_name)
            .order_by(func.count().desc())
        ).all()
        
        print('\nUniversities:')
        for uni in universities:
            print(f'  {uni.university_name}: {uni.count}')
            
        # Sprawdź ostatnie wydarzenia
        recent = db.execute(
            select(Event.title, Event.start_at, Event.category, Event.university_name)
            .order_by(Event.start_at.desc())
            .limit(10)
        ).all()
        
        print('\nRecent events:')
        for ev in recent:
            print(f'  {ev.title} ({ev.category}) - {ev.university_name}')
            
    finally:
        db.close()

if __name__ == "__main__":
    check_events()