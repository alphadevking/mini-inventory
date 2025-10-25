from sqlmodel import SQLModel
from database import engine
import models  # Import models to register them with SQLModel

def reset_database():
    """Drop all tables and recreate them"""
    print("Dropping all tables...")
    SQLModel.metadata.drop_all(engine)

    print("Creating all tables...")
    SQLModel.metadata.create_all(engine)

    print("Database reset complete!")

if __name__ == "__main__":
    reset_database()
