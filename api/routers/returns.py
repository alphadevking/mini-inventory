from fastapi import APIRouter, HTTPException, Depends, status
from sqlmodel import Session, select
from typing import List, Optional
from uuid import UUID

from ..database import get_session
from ..models import (
    Return, ReturnCreate, ReturnUpdate, ReturnAction, ReturnStatus, Product
)

router = APIRouter(prefix="/returns", tags=["returns"])

@router.get("/", response_model=List[Return])
def get_returns(
    skip: int = 0,
    limit: int = 100,
    status: Optional[ReturnStatus] = None,
    action: Optional[ReturnAction] = None,
    session: Session = Depends(get_session)
):
    """Get all returns with optional filtering"""
    query = select(Return)

    if status:
        query = query.where(Return.status == status)

    if action:
        query = query.where(Return.action_taken == action)

    return session.exec(query.offset(skip).limit(limit)).all()

@router.post("/", response_model=Return, status_code=status.HTTP_201_CREATED)
def create_return(return_item: ReturnCreate, session: Session = Depends(get_session)):
    """Create a new return"""
    # Validate product exists
    product = session.get(Product, return_item.product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    db_return = Return.from_orm(return_item)
    session.add(db_return)
    session.commit()
    session.refresh(db_return)
    return db_return

@router.get("/{return_id}", response_model=Return)
def get_return(return_id: UUID, session: Session = Depends(get_session)):
    """Get a specific return by ID"""
    return_item = session.get(Return, return_id)
    if not return_item:
        raise HTTPException(status_code=404, detail="Return not found")
    return return_item

@router.put("/{return_id}", response_model=Return)
def update_return(
    return_id: UUID,
    return_update: ReturnUpdate,
    session: Session = Depends(get_session)
):
    """Update a return"""
    return_item = session.get(Return, return_id)
    if not return_item:
        raise HTTPException(status_code=404, detail="Return not found")

    update_data = return_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(return_item, field, value)

    session.add(return_item)
    session.commit()
    session.refresh(return_item)
    return return_item

@router.delete("/{return_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_return(return_id: UUID, session: Session = Depends(get_session)):
    """Delete a return"""
    return_item = session.get(Return, return_id)
    if not return_item:
        raise HTTPException(status_code=404, detail="Return not found")

    session.delete(return_item)
    session.commit()
