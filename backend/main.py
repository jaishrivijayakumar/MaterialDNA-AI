"""
MaterialDNA AI — FastAPI Application Entry Point

Mounts all routers, initializes database, seeds data,
and builds the TF-IDF retriever index on startup.
"""

import json
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import init_db, SessionLocal
from .seed import seed_database
from .engine.retriever import get_retriever
from .models import Material

from .routers import materials, matching, reviews, identities, analytics, audit, upload


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown lifecycle."""
    # Initialize database
    init_db()

    # Seed data
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()

    # Build TF-IDF retriever index
    _build_retriever_index()

    yield  # App runs here

    # Shutdown cleanup (if needed)


def _build_retriever_index():
    """Build the TF-IDF index from all materials in the database."""
    db = SessionLocal()
    try:
        materials_list = db.query(Material).all()
        if materials_list:
            ids = [m.material_id for m in materials_list]
            descriptions = [m.normalized_description or m.original_description for m in materials_list]
            retriever = get_retriever()
            retriever.fit(ids, descriptions)
    finally:
        db.close()


app = FastAPI(
    title="MaterialDNA AI",
    description="AI-Driven Standardization and Harmonization of Material Codes Across CPSEs",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(materials.router)
app.include_router(matching.router)
app.include_router(reviews.router)
app.include_router(identities.router)
app.include_router(analytics.router)
app.include_router(audit.router)
app.include_router(upload.router)


@app.get("/api/health")
def health_check():
    return {"status": "healthy", "service": "MaterialDNA AI"}
