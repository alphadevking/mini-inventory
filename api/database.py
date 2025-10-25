# database.py
# Database connection logic (to be implemented)

from sqlmodel import SQLModel, Session, create_engine
from .config import get_database_url

# Create database engine
database_url = get_database_url()
engine = create_engine(database_url, echo=False)

def create_db_and_tables():
    """Create database tables"""
    SQLModel.metadata.create_all(engine)

def get_session():
    """Get database session"""
    with Session(engine) as session:
        yield session

# Test the connection
try:
    with engine.connect() as connection:
        print("Connection successful!")
except Exception as e:
    print(f"Failed to connect: {e}")