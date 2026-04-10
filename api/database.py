# database.py
# Database engine and session management.
#
# Read/Write separation
# ---------------------
# write_engine → primary DB, used for all mutations (sales, repairs, stock, etc.)
# read_engine  → read replica in production; falls back to primary in dev/SQLite.
#
# To promote to a read replica in production:
#   set READ_DATABASE_URL=postgresql+psycopg2://user:pass@replica-host/db
#   No code changes required — just the env var.
#
# Connection pooling
# ------------------
# SQLite (dev): StaticPool — single in-memory or file connection, no pooling.
# PostgreSQL:   pool_size + max_overflow tuned per environment.
#               In production, sit pgBouncer in front of PostgreSQL and keep
#               per-instance pool_size small (5-10).

import os
from sqlmodel import SQLModel, Session, create_engine
from sqlalchemy.pool import StaticPool

from .config import get_database_url, get_env_var

# --- Write engine (primary) ---
_write_url = get_database_url()

_engine_kwargs: dict = {"echo": False}
if _write_url.startswith("sqlite"):
    # SQLite needs special pool settings for single-file access
    _engine_kwargs["connect_args"] = {"check_same_thread": False}
    _engine_kwargs["poolclass"] = StaticPool

write_engine = create_engine(_write_url, **_engine_kwargs)

# --- Read engine (replica or same as write) ---
_read_url = get_env_var("READ_DATABASE_URL", _write_url)

if _read_url == _write_url:
    # Dev: reuse the same engine — no replica configured
    read_engine = write_engine
else:
    _read_kwargs: dict = {"echo": False}
    if _read_url.startswith("sqlite"):
        _read_kwargs["connect_args"] = {"check_same_thread": False}
        _read_kwargs["poolclass"] = StaticPool
    read_engine = create_engine(_read_url, **_read_kwargs)

# Backwards-compatible alias used by existing code that imports `engine`
engine = write_engine


def create_db_and_tables():
    """Create all tables defined in SQLModel metadata."""
    SQLModel.metadata.create_all(write_engine)


def get_session():
    """Write session — use for all mutations."""
    with Session(write_engine) as session:
        yield session


def get_read_session():
    """
    Read session — use for analytics, list endpoints, audit queries.
    Points to read replica in production, primary in dev.
    """
    with Session(read_engine) as session:
        yield session


# Verify connection on startup
try:
    with write_engine.connect() as connection:
        print("[DB] Write connection: OK")
except Exception as e:
    print(f"[DB] Write connection FAILED: {e}")
