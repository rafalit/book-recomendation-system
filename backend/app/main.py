# app/main.py
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .db.database import engine
from . import models
from .core.http_client import close_http
from app.db.database import Base
# Routers
from .api.routes_auth import router as auth_router
from .api.routes_meta import router as meta_router
from .api.routes_contacts import router as contact_router
from .api.routes_events import router as events_router
from .api.routes_news import router as news_router
from .api.routes_debug import router as debug_router
from .api.routes_forum import router as forum_router
from .api.routes_notifications import router as notif_router
from .api.routes_books import router as books_router
from .api.routes_rankings import router as routes_rankings
from .api.routes_admin import router as admin_router

# ── Init DB metadata (migrations docelowo przez Alembic, ale na razie OK)
Base.metadata.create_all(bind=engine)

app = FastAPI()

# ── CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers
app.include_router(auth_router)
app.include_router(meta_router)
app.include_router(contact_router)
app.include_router(events_router)
app.include_router(news_router)
app.include_router(debug_router)
app.include_router(forum_router)
app.include_router(notif_router)
app.include_router(books_router)
app.include_router(routes_rankings)
app.include_router(admin_router)

# ── Graceful shutdown of shared HTTP client
@app.on_event("shutdown")
async def _shutdown() -> None:
    await close_http()
