from fastapi import Depends, HTTPException, status
from sqlmodel import Session
from uuid import UUID

from .database import get_session
from .services.stock_service import StockService

def get_current_user():
    """Get current user (placeholder for future authentication)"""
    # TODO: Implement JWT token validation
    return {"id": "user-1", "username": "admin", "role": "admin"}

def require_admin(user = Depends(get_current_user)):
    """Require admin role for protected endpoints"""
    if user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return user

def validate_stock_availability(
    product_id: str,
    quantity: int,
    session: Session = Depends(get_session)
):
    """Validate stock availability for transactions"""
    product_uuid = UUID(product_id)
    if not StockService.check_stock_availability(session, product_uuid, quantity):
        current_stock, _ = StockService.calculate_stock_levels(session, product_uuid)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient stock. Available: {current_stock}, Requested: {quantity}"
        )
    return True

def pagination_params(
    skip: int = 0,
    limit: int = 100
):
    """Pagination parameters with validation"""
    if skip < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Skip must be non-negative"
        )
    if limit < 1 or limit > 1000:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Limit must be between 1 and 1000"
        )
    return {"skip": skip, "limit": limit}
