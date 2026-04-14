"""
product_units.py — Serialized Inventory Router
===============================================
GET    /products/{product_id}/units          List all units for a product model
POST   /products/{product_id}/units          Intake a single unit (receive one device)
POST   /products/{product_id}/units/batch    Bulk intake (receive many devices at once)
GET    /product-units/{unit_id}              Get a single unit by ID
GET    /product-units/by-serial/{serial}     Look up a unit by serial number
GET    /product-units/by-imei/{imei}         Look up a unit by IMEI
PATCH  /product-units/{unit_id}              Update notes, condition, etc.
"""
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from ..database import get_session
from ..dependencies import get_current_user, require_manager
from ..models import (
    Product,
    ProductUnit,
    ProductUnitCreate,
    ProductUnitBatchCreate,
    ProductUnitRead,
    ProductUnitUpdate,
    UnitStatus,
    UserRead,
    StockMovementType,
)
from ..services.stock_service import StockService

router = APIRouter(
    tags=["product-units"],
    dependencies=[Depends(get_current_user)],
)


def _to_read(unit: ProductUnit) -> ProductUnitRead:
    return ProductUnitRead(
        id=unit.id,
        product_id=unit.product_id,
        serial_number=unit.serial_number,
        imei=unit.imei,
        color=unit.color,
        storage=unit.storage,
        condition=unit.condition,
        status=unit.status,
        purchase_cost=unit.purchase_cost,
        purchased_at=unit.purchased_at,
        sold_at=unit.sold_at,
        notes=unit.notes,
        created_at=unit.created_at,
        updated_at=unit.updated_at,
    )


# ── List units for a product ───────────────────────────────────────────────────

@router.get("/products/{product_id}/units", response_model=List[ProductUnitRead])
def list_units(
    product_id: UUID,
    status_filter: Optional[UnitStatus] = None,
    skip: int = 0,
    limit: int = 200,
    session: Session = Depends(get_session),
):
    """List all physical units for a product model, optionally filtered by status."""
    product = session.get(Product, product_id)
    if not product or not product.is_active:
        raise HTTPException(status_code=404, detail="Product not found")

    query = select(ProductUnit).where(ProductUnit.product_id == product_id)
    if status_filter:
        query = query.where(ProductUnit.status == status_filter)

    query = query.order_by(ProductUnit.created_at.desc())  # type: ignore[attr-defined]
    units = session.exec(query.offset(skip).limit(limit)).all()
    return [_to_read(u) for u in units]


# ── Intake a single unit ───────────────────────────────────────────────────────

@router.post(
    "/products/{product_id}/units",
    response_model=ProductUnitRead,
    status_code=status.HTTP_201_CREATED,
)
def intake_unit(
    product_id: UUID,
    payload: ProductUnitCreate,
    session: Session = Depends(get_session),
    current_user: UserRead = Depends(require_manager),
):
    """
    Receive one physical unit into stock.

    This increments Product.current_stock by 1 via StockService (so the
    StockMovement ledger always has a record) and creates the ProductUnit row
    with status=in_stock.
    """
    product = session.get(Product, product_id)
    if not product or not product.is_active:
        raise HTTPException(status_code=404, detail="Product not found")

    # Guard duplicate serial
    existing = session.exec(
        select(ProductUnit).where(ProductUnit.serial_number == payload.serial_number)
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Serial number '{payload.serial_number}' already exists",
        )

    # Guard duplicate IMEI if provided
    if payload.imei:
        existing_imei = session.exec(
            select(ProductUnit).where(ProductUnit.imei == payload.imei)
        ).first()
        if existing_imei:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"IMEI '{payload.imei}' already exists",
            )

    from datetime import date
    unit = ProductUnit(
        product_id=product_id,
        serial_number=payload.serial_number,
        imei=payload.imei,
        color=payload.color,
        storage=payload.storage,
        condition=payload.condition or "New",
        status=UnitStatus.in_stock,
        purchase_cost=payload.purchase_cost,
        purchased_at=payload.purchased_at or date.today(),
        notes=payload.notes,
        created_by=current_user.id,
    )
    session.add(unit)
    session.flush()  # get unit.id before stock move

    # Increment stock via the ledger
    StockService.move_stock(
        session=session,
        product_id=product_id,
        unit_id=unit.id,
        quantity_delta=1,
        movement_type=StockMovementType.purchase,
        reference_type="unit_intake",
        reference_id=unit.id,
        notes=f"Unit intake — SN: {payload.serial_number}",
        created_by=current_user.id,
    )

    session.commit()
    session.refresh(unit)
    return _to_read(unit)


# ── Batch intake ───────────────────────────────────────────────────────────────

@router.post(
    "/products/{product_id}/units/batch",
    response_model=List[ProductUnitRead],
    status_code=status.HTTP_201_CREATED,
)
def batch_intake_units(
    product_id: UUID,
    payload: ProductUnitBatchCreate,
    session: Session = Depends(get_session),
    current_user: UserRead = Depends(require_manager),
):
    """
    Receive multiple physical units in one request.
    All units are validated first; if any duplicate is found the whole batch fails.
    """
    if not payload.units:
        raise HTTPException(status_code=400, detail="Batch must contain at least one unit")

    product = session.get(Product, product_id)
    if not product or not product.is_active:
        raise HTTPException(status_code=404, detail="Product not found")

    # Pre-flight: check for duplicate serials/IMEIs within batch and in DB
    serials_in_batch = [u.serial_number for u in payload.units]
    if len(serials_in_batch) != len(set(serials_in_batch)):
        raise HTTPException(status_code=400, detail="Duplicate serial numbers within the batch")

    imeis_in_batch = [u.imei for u in payload.units if u.imei]
    if len(imeis_in_batch) != len(set(imeis_in_batch)):
        raise HTTPException(status_code=400, detail="Duplicate IMEIs within the batch")

    existing_serials = session.exec(
        select(ProductUnit.serial_number).where(ProductUnit.serial_number.in_(serials_in_batch))  # type: ignore[attr-defined]
    ).all()
    if existing_serials:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Serial numbers already exist: {', '.join(existing_serials)}",
        )

    if imeis_in_batch:
        existing_imeis = session.exec(
            select(ProductUnit.imei).where(ProductUnit.imei.in_(imeis_in_batch))  # type: ignore[attr-defined]
        ).all()
        if existing_imeis:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"IMEIs already exist: {', '.join(str(i) for i in existing_imeis)}",
            )

    from datetime import date
    created_units: List[ProductUnit] = []
    for item in payload.units:
        unit = ProductUnit(
            product_id=product_id,
            serial_number=item.serial_number,
            imei=item.imei,
            color=item.color,
            storage=item.storage,
            condition=item.condition or "New",
            status=UnitStatus.in_stock,
            purchase_cost=item.purchase_cost,
            purchased_at=item.purchased_at or date.today(),
            notes=item.notes,
            created_by=current_user.id,
        )
        session.add(unit)
        session.flush()

        StockService.move_stock(
            session=session,
            product_id=product_id,
            unit_id=unit.id,
            quantity_delta=1,
            movement_type=StockMovementType.purchase,
            reference_type="unit_intake",
            reference_id=unit.id,
            notes=f"Batch intake — SN: {item.serial_number}",
            created_by=current_user.id,
        )
        created_units.append(unit)

    session.commit()
    for u in created_units:
        session.refresh(u)

    return [_to_read(u) for u in created_units]


# ── Get / look up a single unit ────────────────────────────────────────────────

@router.get("/product-units/{unit_id}", response_model=ProductUnitRead)
def get_unit(unit_id: UUID, session: Session = Depends(get_session)):
    unit = session.get(ProductUnit, unit_id)
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    return _to_read(unit)


@router.get("/product-units/by-serial/{serial_number}", response_model=ProductUnitRead)
def get_unit_by_serial(serial_number: str, session: Session = Depends(get_session)):
    unit = session.exec(
        select(ProductUnit).where(ProductUnit.serial_number == serial_number)
    ).first()
    if not unit:
        raise HTTPException(status_code=404, detail=f"No unit with serial '{serial_number}'")
    return _to_read(unit)


@router.get("/product-units/by-imei/{imei}", response_model=ProductUnitRead)
def get_unit_by_imei(imei: str, session: Session = Depends(get_session)):
    unit = session.exec(
        select(ProductUnit).where(ProductUnit.imei == imei)
    ).first()
    if not unit:
        raise HTTPException(status_code=404, detail=f"No unit with IMEI '{imei}'")
    return _to_read(unit)


# ── Update a unit (notes, condition, status correction) ───────────────────────

@router.patch("/product-units/{unit_id}", response_model=ProductUnitRead)
def update_unit(
    unit_id: UUID,
    payload: ProductUnitUpdate,
    session: Session = Depends(get_session),
    current_user: UserRead = Depends(require_manager),
):
    """
    Update mutable fields on a unit: notes, condition, color, storage.
    Status can only be set to 'reserved' via this endpoint; lifecycle
    transitions (in_stock → sold, sold → returned, etc.) happen automatically
    through sales and returns workflows.
    """
    unit = session.get(ProductUnit, unit_id)
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")

    update_data = payload.dict(exclude_unset=True)

    # Guard: prevent forcing sold/in_repair status via PATCH — those are
    # lifecycle states owned by the sale/repair workflows.
    if "status" in update_data and update_data["status"] in (
        UnitStatus.sold, UnitStatus.in_repair
    ):
        raise HTTPException(
            status_code=400,
            detail="Use the sales or repairs workflow to set 'sold' or 'in_repair' status.",
        )

    for field, value in update_data.items():
        setattr(unit, field, value)

    unit.updated_at = datetime.utcnow()
    session.add(unit)
    session.commit()
    session.refresh(unit)
    return _to_read(unit)
