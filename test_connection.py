#!/usr/bin/env python3
"""
Test database connection script
Useful for verifying Neon database setup
"""

import os
import sys
from dotenv import load_dotenv
from sqlalchemy import text

def test_connection():
    """Test the database connection"""

    print("🔍 Testing Database Connection")
    print("=" * 40)

    # Load environment variables
    load_dotenv()

    # Get database configuration
    db_type = os.getenv("DB_TYPE", "sqlite")
    database_url = os.getenv("DATABASE_URL")

    print(f"Database Type: {db_type}")
    print(f"Database URL: {database_url}")
    print()

    if not database_url:
        print("❌ DATABASE_URL not found in .env file")
        print("Please set up your .env file first")
        return False

    try:
        if db_type.lower() == "postgres":
            # Test PostgreSQL connection
            from sqlalchemy import create_engine
            from sqlalchemy.exc import OperationalError

            print("🔗 Testing PostgreSQL connection...")
            engine = create_engine(database_url, echo=False)

            with engine.connect() as connection:
                result = connection.execute(text("SELECT version();"))
                row = result.fetchone()
                version = row[0] if row else "Unknown"
                print(f"✅ Connected successfully!")
                print(f"PostgreSQL Version: {version}")

        else:
            # Test SQLite connection
            from sqlalchemy import create_engine

            print("🔗 Testing SQLite connection...")
            engine = create_engine(database_url, echo=False)

            with engine.connect() as connection:
                result = connection.execute(text("SELECT sqlite_version();"))
                row = result.fetchone()
                version = row[0] if row else "Unknown"
                print(f"✅ Connected successfully!")
                print(f"SQLite Version: {version}")

        return True

    except Exception as e:
        print(f"❌ Connection failed: {e}")
        print("\n🔧 Troubleshooting tips:")
        print("1. Check your .env file configuration")
        print("2. Verify your Neon connection string")
        print("3. Ensure your database is active")
        print("4. Check your internet connection")
        return False

def test_migrations():
    """Test if migrations can be run"""

    print("\n📊 Testing Database Migrations")
    print("=" * 40)

    try:
        from alembic.config import Config
        from alembic import command

        print("🔗 Running migration test...")

        # Create Alembic config
        alembic_cfg = Config("alembic.ini")

        # Check current migration status
        command.current(alembic_cfg)

        print("✅ Migration test completed!")
        return True

    except Exception as e:
        print(f"❌ Migration test failed: {e}")
        return False

def main():
    """Main test function"""

    print("🎯 Mini Inventory - Database Connection Test")
    print("=" * 50)

    # Test basic connection
    connection_ok = test_connection()

    if connection_ok:
        # Test migrations
        migration_ok = test_migrations()

        if migration_ok:
            print("\n🎉 All tests passed!")
            print("Your database is ready to use.")
        else:
            print("\n⚠️  Connection works but migrations failed.")
            print("You may need to run: pipenv run alembic upgrade head")
    else:
        print("\n❌ Database connection failed.")
        print("Please check your configuration and try again.")

if __name__ == "__main__":
    main()