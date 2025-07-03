# database.py
# Database connection logic (to be implemented)

import os
from sqlmodel import SQLModel, Session
from dotenv import load_dotenv
from sqlalchemy import create_engine

# Load environment variables from .env
load_dotenv()

def get_database_url():
    # Always use DATABASE_URL if set
    url = os.getenv("DATABASE_URL")
    if url:
        return url
    # Fallback to SQLite for local development
    return "sqlite:///./test.db"

# Use the unified function to get the database URL
DATABASE_URL = get_database_url()

# Create the SQLAlchemy engine
engine = create_engine(DATABASE_URL, echo=False)

# Test the connection
try:
    with engine.connect() as connection:
        print("Connection successful!")
except Exception as e:
    print(f"Failed to connect: {e}")

def get_session():
    """
    Dependency for FastAPI to get a database session.
    Usage: Depends(get_session)
    """
    with Session(engine) as session:
        yield session

# Best Practices:
# - Use the exact connection string format from Supabase dashboard for PostgreSQL.
# - For local development, you can omit the individual variables to use SQLite.
# - Never commit your real .env file or credentials.