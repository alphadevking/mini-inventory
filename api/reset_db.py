"""
reset_db.py
===========
Drop all tables, recreate schema from current models, then seed.

Usage:
    python -m api.reset_db          # drop + create + seed (default)
    python -m api.reset_db --no-seed  # drop + create only (skip seed)
"""
import sys

from sqlalchemy import text
from sqlmodel import SQLModel

from .database import engine
from .models import *  # noqa: F401,F403 — registers all models with SQLModel.metadata


def reset_db(seed: bool = True) -> None:
    print("Dropping all tables...")
    # Drop any legacy tables that no longer exist in models (CASCADE removes their FKs first)
    with engine.connect() as conn:
        conn.execute(text("DROP TABLE IF EXISTS transaction CASCADE"))
        conn.commit()
    SQLModel.metadata.drop_all(engine)
    print("Creating all tables from current models...")
    SQLModel.metadata.create_all(engine)
    print("Schema ready.")

    if seed:
        from .seed_data import seed_database
        seed_database()


if __name__ == "__main__":
    no_seed = "--no-seed" in sys.argv
    reset_db(seed=not no_seed)
