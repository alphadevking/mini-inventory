import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


# Simple configuration using environment variables
def get_env_var(key: str, default: str = "") -> str:
    """Get environment variable with fallback to default"""
    return os.getenv(key, default)


def get_env_bool(key: str, default: bool = False) -> bool:
    """Get boolean environment variable"""
    value = os.getenv(key, "").lower()
    return value in ("true", "1", "yes", "on") if value else default


def get_env_int(key: str, default: int = 0) -> int:
    """Get integer environment variable"""
    try:
        return int(os.getenv(key, str(default)))
    except ValueError:
        return default


# App settings
APP_NAME = get_env_var("APP_NAME", "Phone Repair Shop Management System")
APP_VERSION = get_env_var("APP_VERSION", "2.0.0")
DEBUG = get_env_bool("DEBUG", False)

# Database settings
DATABASE_URL = get_env_var("DATABASE_URL", "sqlite:///./test_new.db")
DB_TYPE = get_env_var("DB_TYPE", "sqlite")  # sqlite or postgres


# CORS settings
def get_allowed_origins() -> list[str]:
    """Get allowed origins from environment variable or use defaults"""
    origins_env = get_env_var("ALLOWED_ORIGINS", "")
    if origins_env:
        # Split by comma and strip whitespace
        return [origin.strip() for origin in origins_env.split(",") if origin.strip()]

    # Default origins for development
    return [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:9001",
        "http://127.0.0.1:9001",
    ]


ALLOWED_ORIGINS = get_allowed_origins()

# Security settings
SECRET_KEY = get_env_var("SECRET_KEY", "your-secret-key-here")
ALGORITHM = get_env_var("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = get_env_int("ACCESS_TOKEN_EXPIRE_MINUTES", 30)
REFRESH_TOKEN_EXPIRE_DAYS = get_env_int("REFRESH_TOKEN_EXPIRE_DAYS", 7)

# File upload settings
MAX_FILE_SIZE = get_env_int("MAX_FILE_SIZE", 10 * 1024 * 1024)  # 10MB
ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "image/webp"]

# Pagination settings
DEFAULT_PAGE_SIZE = get_env_int("DEFAULT_PAGE_SIZE", 100)
MAX_PAGE_SIZE = get_env_int("MAX_PAGE_SIZE", 1000)


# Database configuration
def get_database_url() -> str:
    """Get database URL based on environment configuration"""
    if DB_TYPE.lower() == "postgres":
        # PostgreSQL configuration
        user = os.getenv("DB_USER")
        password = os.getenv("DB_PASSWORD")
        host = os.getenv("DB_HOST")
        port = os.getenv("DB_PORT")
        dbname = os.getenv("DB_NAME")

        if all([user, password, host, port, dbname]):
            return f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{dbname}?sslmode=require"
        else:
            raise ValueError(
                "PostgreSQL selected but one or more variables are missing."
            )

    # Default to SQLite
    return DATABASE_URL
