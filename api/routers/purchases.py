from fastapi import APIRouter, HTTPException, Depends, status, Query
from sqlmodel import Session, select
from typing import List, Optional
from uuid import UUID
from datetime import date

from ..database import get_session
from ..models import Purchase, PurchaseCreate, PurchaseRead, PurchaseItemRead, Product
from ..services.purchase_service import PurchaseService
from ..dependencies import get_current_user, require_manager

router = APIRouter(
    prefix="/purchases",
    tags=["purchases"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/", response_model=List[PurchaseRead])
def list_purchases(
    skip: int = 0,
    limit: int = 100,
    supplier: Optional[str] = Query(default=None),
    start_date: Optional[date] = Query(default=None),
    end_date: Optional[date] = Query(default=None),
    session: Session = Depends(get_session),
):
    query = select(Purchase)
    if supplier:
        query = query.where(Purchase.supplier.ilike(f"%{supplier}%"))  # type: ignore[union-attr]
    if start_date:
        query = query.where(Purchase.delivery_date >= start_date)
    if end_date:
        query = query.where(Purchase.delivery_date <= end_date)
    query = query.order_by(Purchase.delivery_date.desc()).offset(skip).limit(limit)  # type: ignore[union-attr]

    purchases = session.exec(query).all()
    return [PurchaseService._to_read(session, p, p.items) for p in purchases]


@router.get("/{purchase_id}", response_model=PurchaseRead)
def get_purchase(purchase_id: UUID, session: Session = Depends(get_session)):
    try:
        return PurchaseService.get_purchase(session, purchase_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/", response_model=PurchaseRead, status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(require_manager)])
def create_purchase(
    payload: PurchaseCreate,
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user),
):
    try:
        return PurchaseService.create_purchase(
            session, payload, created_by=current_user.id
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
