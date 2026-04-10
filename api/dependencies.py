from typing import Dict, Any, Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session, select
from uuid import UUID

from .database import get_session
from .services.stock_service import StockService
from .models import User, UserRead, UserRole
from .auth import decode_access_token

# OAuth2PasswordBearer for token extraction
# tokenUrl matches our login endpoint in api/routers/auth.py
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login", auto_error=False)

# --- Authentication Dependencies ---


def get_current_user(
    request: Request,
    token: str = Depends(oauth2_scheme),
    session: Session = Depends(get_session),
) -> UserRead:
    """
    Dependency to fetch and validate the current authenticated user.
    Supports both Authorization header and access_token cookie.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # Use cookie if header token is missing
    if not token:
        token = request.cookies.get("access_token")

    if not token:
        raise credentials_exception

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    # Token payload should contain a user ID (sub)
    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    try:
        user_uuid = UUID(user_id)
    except ValueError:
        raise credentials_exception

    # Fetch user from database to ensure they still exist and are active
    user = session.exec(select(User).where(User.id == user_uuid)).first()

    if user is None or not user.is_active:
        raise credentials_exception

    # Return UserRead model for protection and to standardize the dependency output
    return UserRead.model_validate(user)


def require_roles(allowed_roles: list[str]):
    """
    Factory function to create a dependency that enforces any of the specified roles.
    """

    def role_checker(user: UserRead = Depends(get_current_user)):
        if user.role.value not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Requires one of these roles: {', '.join(allowed_roles)}",
            )
        return user

    return role_checker


# Common role dependencies
require_admin = require_roles(["admin"])
require_manager = require_roles(["manager", "admin"])
require_technician = require_roles(["technician", "manager", "admin"])
require_cashier = require_roles(["cashier", "manager", "admin"])
require_staff = require_roles(["cashier", "technician", "manager", "admin"])

# --- Utility Dependencies ---


def validate_stock_availability(
    product_id: str, quantity: int, session: Session = Depends(get_session)
):
    """Validate stock availability for transactions"""
    try:
        product_uuid = UUID(product_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid product ID format"
        )

    if not StockService.check_stock_availability(session, product_uuid, quantity):
        current_stock, _ = StockService.calculate_stock_levels(session, product_uuid)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient stock. Available: {current_stock}, Requested: {quantity}",
        )
    return True


def pagination_params(skip: int = 0, limit: int = 100):
    """Pagination parameters with validation"""
    if skip < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Skip must be non-negative"
        )
    if limit < 1 or limit > 1000:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Limit must be between 1 and 1000",
        )
    return {"skip": skip, "limit": limit}
