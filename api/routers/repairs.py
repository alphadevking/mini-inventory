from fastapi import APIRouter, HTTPException, Depends, status
from sqlmodel import Session, select
from typing import List, Optional
from uuid import UUID

from ..database import get_session
from ..models import (
    Repair, RepairCreate, RepairUpdate, RepairRead,
    RepairPart, Product, Transaction, TransactionType,
    RepairStatus, PaymentStatus
)

router = APIRouter(prefix="/repairs", tags=["repairs"])

@router.get("/", response_model=List[RepairRead])
def get_repairs(
    skip: int = 0,
    limit: int = 100,
    status: Optional[RepairStatus] = None,
    payment_status: Optional[PaymentStatus] = None,
    session: Session = Depends(get_session)
):
    """Get all repairs with optional filtering"""
    query = select(Repair)

    if status:
        query = query.where(Repair.repair_status == status)

    if payment_status:
        query = query.where(Repair.payment_status == payment_status)

    repairs = session.exec(query.offset(skip).limit(limit)).all()

    # Include parts used
    result = []
    for repair in repairs:
        parts_used = session.exec(
            select(RepairPart).where(RepairPart.repair_id == repair.id)
        ).all()

        result.append(RepairRead(
            **repair.dict(),
            parts_used=list(parts_used)
        ))

    return result

@router.post("/", response_model=Repair, status_code=status.HTTP_201_CREATED)
def create_repair(repair: RepairCreate, session: Session = Depends(get_session)):
    """Create a new repair"""
    db_repair = Repair.from_orm(repair)
    session.add(db_repair)
    session.commit()
    session.refresh(db_repair)
    return db_repair

@router.get("/{repair_id}", response_model=RepairRead)
def get_repair(repair_id: UUID, session: Session = Depends(get_session)):
    """Get a specific repair by ID"""
    repair = session.get(Repair, repair_id)
    if not repair:
        raise HTTPException(status_code=404, detail="Repair not found")

    parts_used = session.exec(
        select(RepairPart).where(RepairPart.repair_id == repair.id)
    ).all()

    return RepairRead(**repair.dict(), parts_used=list(parts_used))

@router.put("/{repair_id}", response_model=Repair)
def update_repair(
    repair_id: UUID,
    repair_update: RepairUpdate,
    session: Session = Depends(get_session)
):
    """Update a repair"""
    repair = session.get(Repair, repair_id)
    if not repair:
        raise HTTPException(status_code=404, detail="Repair not found")

    update_data = repair_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(repair, field, value)

    session.add(repair)
    session.commit()
    session.refresh(repair)
    return repair

@router.delete("/{repair_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_repair(repair_id: UUID, session: Session = Depends(get_session)):
    """Delete a repair"""
    repair = session.get(Repair, repair_id)
    if not repair:
        raise HTTPException(status_code=404, detail="Repair not found")

    # Delete associated repair parts first
    repair_parts = session.exec(
        select(RepairPart).where(RepairPart.repair_id == repair_id)
    ).all()

    for part in repair_parts:
        session.delete(part)

    session.delete(repair)
    session.commit()

# Repair Parts endpoints
@router.post("/{repair_id}/parts/", response_model=RepairPart, status_code=status.HTTP_201_CREATED)
def add_repair_part(
    repair_id: UUID,
    part: dict,  # Simplified for now
    session: Session = Depends(get_session)
):
    """Add a part to a repair"""
    repair = session.get(Repair, repair_id)
    if not repair:
        raise HTTPException(status_code=404, detail="Repair not found")

    product = session.get(Product, part["product_id"])
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Check if enough stock is available
    purchases = session.exec(
        select(Transaction).where(
            Transaction.product_id == part["product_id"],
            Transaction.transaction_type == TransactionType.purchase
        )
    ).all()

    sales = session.exec(
        select(Transaction).where(
            Transaction.product_id == part["product_id"],
            Transaction.transaction_type == TransactionType.sale
        )
    ).all()

    repair_parts = session.exec(
        select(RepairPart).where(RepairPart.product_id == part["product_id"])
    ).all()

    total_purchased = sum(t.quantity for t in purchases)
    total_sold = sum(t.quantity for t in sales)
    total_used_in_repairs = sum(rp.quantity_used for rp in repair_parts)

    available_stock = total_purchased - total_sold - total_used_in_repairs

    if available_stock < part["quantity_used"]:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient stock. Available: {available_stock}, Requested: {part['quantity_used']}"
        )

    repair_part = RepairPart(
        repair_id=repair_id,
        product_id=part["product_id"],
        quantity_used=part["quantity_used"],
        unit_cost=part["unit_cost"],
        total_cost=part["quantity_used"] * part["unit_cost"]
    )

    session.add(repair_part)
    session.commit()
    session.refresh(repair_part)
    return repair_part
