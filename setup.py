#!/usr/bin/env python3
"""
Setup script for Mini Inventory System
Helps configure environment variables for Neon database
"""

import os
import sys
from pathlib import Path

def create_env_file():
    """Create .env file with Neon database configuration"""

    print("🚀 Setting up Mini Inventory System")
    print("=" * 50)

    # Check if .env already exists
    env_path = Path(".env")
    if env_path.exists():
        print("⚠️  .env file already exists!")
        response = input("Do you want to overwrite it? (y/N): ").lower()
        if response != 'y':
            print("Setup cancelled.")
            return

    print("\n📋 Neon Database Setup")
    print("1. Go to https://console.neon.tech")
    print("2. Create a free account and new project")
    print("3. Copy your connection string from the dashboard")
    print("4. Paste it below when prompted\n")

    # Get database configuration
    db_type = input("Database type (postgres/sqlite) [postgres]: ").strip() or "postgres"

    if db_type.lower() == "postgres":
        print("\n🔗 Enter your Neon connection string:")
        print("Format: postgresql+psycopg2://user:password@endpoint/dbname?sslmode=require")
        database_url = input("DATABASE_URL: ").strip()

        if not database_url:
            print("❌ DATABASE_URL is required!")
            return

        env_content = f"""# Database Configuration
DB_TYPE=postgres

# Neon Database Connection
DATABASE_URL={database_url}

# For local development (SQLite)
# DB_TYPE=sqlite
# DATABASE_URL=sqlite:///./test.db
"""
    else:
        env_content = """# Database Configuration
DB_TYPE=sqlite

# For local development (SQLite)
DATABASE_URL=sqlite:///./test.db

# For production (PostgreSQL/Neon)
# DB_TYPE=postgres
# DATABASE_URL=postgresql+psycopg2://[user]:[password]@[endpoint]/[dbname]?sslmode=require
"""

    # Write .env file
    try:
        with open(".env", "w") as f:
            f.write(env_content)
        print("\n✅ .env file created successfully!")

        if db_type.lower() == "postgres":
            print("\n📝 Next steps:")
            print("1. Run: pipenv run alembic upgrade head")
            print("2. Run: pipenv run uvicorn api.main:app --reload --port 9000")
            print("3. Run: pnpm dev")
            print("4. Open: http://localhost:5173")
        else:
            print("\n📝 Next steps:")
            print("1. Run: pipenv run alembic upgrade head")
            print("2. Run: pipenv run uvicorn api.main:app --reload --port 9000")
            print("3. Run: pnpm dev")
            print("4. Open: http://localhost:5173")

    except Exception as e:
        print(f"❌ Error creating .env file: {e}")

def check_dependencies():
    """Check if required dependencies are installed"""
    print("\n🔍 Checking dependencies...")

    # Check Python dependencies
    try:
        import fastapi
        import sqlmodel
        import alembic
        print("✅ Python dependencies are installed")
    except ImportError as e:
        print(f"❌ Missing Python dependency: {e}")
        print("Run: pipenv install")
        return False

    # Check if node_modules exists
    if not Path("node_modules").exists():
        print("❌ Node.js dependencies not installed")
        print("Run: pnpm install")
        return False
    else:
        print("✅ Node.js dependencies are installed")

    return True

def main():
    """Main setup function"""
    print("🎯 Mini Inventory System Setup")
    print("=" * 50)

    # Check dependencies
    if not check_dependencies():
        print("\n❌ Please install dependencies first!")
        sys.exit(1)

    # Create .env file
    create_env_file()

    print("\n🎉 Setup complete!")
    print("For more information, see README.md")

if __name__ == "__main__":
    main()