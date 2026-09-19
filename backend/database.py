"""
MaterialDNA AI — Database Configuration

SQLAlchemy setup with SQLite for prototype.
Architecture is PostgreSQL-ready — swap the connection string.
"""

import os
import shutil
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

# Database file location
DEFAULT_DB_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
DEFAULT_DB_PATH = os.path.join(DEFAULT_DB_DIR, "materialdna.db")

# Detect Vercel / serverless environment where deployment files are read-only
if os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
    TMP_DB_DIR = "/tmp/materialdna_data"
    os.makedirs(TMP_DB_DIR, exist_ok=True)
    TMP_DB_PATH = os.path.join(TMP_DB_DIR, "materialdna.db")
    # Copy pre-seeded database to writable /tmp if not already present
    if os.path.exists(DEFAULT_DB_PATH) and not os.path.exists(TMP_DB_PATH):
        shutil.copy2(DEFAULT_DB_PATH, TMP_DB_PATH)
    DB_PATH = TMP_DB_PATH
else:
    os.makedirs(DEFAULT_DB_DIR, exist_ok=True)
    DB_PATH = DEFAULT_DB_PATH

DATABASE_URL = os.environ.get("DATABASE_URL", f"sqlite:///{DB_PATH}")
# For PostgreSQL: DATABASE_URL = "postgresql://user:pass@host:5432/materialdna"

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """FastAPI dependency for database sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables."""
    try:
        from . import models  # noqa: F401
    except (ImportError, ValueError):
        import models  # noqa: F401
    Base.metadata.create_all(bind=engine)
