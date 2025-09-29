from backend.app.db.database import SessionLocal
from backend.app.db import models

db = SessionLocal()
rows = db.query(models.User).all()
for u in rows:
    print(u.id, u.email, u.role, u.university, u.faculty, u.study_year, u.academic_title)
db.close()
