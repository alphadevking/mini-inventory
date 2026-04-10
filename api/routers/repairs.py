"""
repairs.py — Repairs router
============================
POST   /api/repairs                    Create repair
GET    /api/repairs                    List repairs
GET    /api/repairs/:id                Get repair (with parts + status log)
PUT    /api/repairs/:id                Update non-status fields
PATCH  /api/repairs/:id/status         Transition status (logged)
POST   /api/repairs/:id/parts          Add part (deducts stock)
DELETE /api/repairs/:id/parts/:partId  Remove part (restores stock)
GET    /api/repairs/:id/audit          Full audit trail
"""
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Header, status
from sqlmodel import Session

from ..database import get_session
from ..dependencies import get_current_user, require_technician, require_manager
from ..models import (
    RepairCreate,
    RepairUpdate,
    RepairReadFull,
    RepairStatus,
    PaymentStatus,
    AuditLogRead,
    UserRead,
    IdempotencyRecord,
)
from ..services.repair_service import (
    RepairService,
    InvalidStatusTransitionError,
    ConcurrentModificationError,
)
from ..services.audit_service import AuditService
from ..services.stock_service import InsufficientStockError
from ..models import AuditAction

router = APIRouter(
    prefix="/repairs",
    tags=["repairs"],
    dependencies=[Depends(get_current_user)],
)


@router.post("/", response_model=RepairReadFull, status_code=status.HTTP_201_CREATED)
def create_repair(
    payload: RepairCreate,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    current_user: UserRead = Depends(require_technician),
    idempotency_key: Optional[str] = Header(default=None, alias="Idempotency-Key"),
):
    """Create a new repair job."""
    # Idempotency
    if idempotency_key:
        record = session.get(IdempotencyRecord, idempotency_key)
        if record:
            return record.response_body

    try:
        repair = RepairService.create_repair(
            session=session,
            payload=payload,
            created_by=current_user.id,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    if idempotency_key:
        session.add(IdempotencyRecord(
            key=idempotency_key,
            endpoint="POST /api/repairs",
            response_status=201,
            response_body=repair.dict(),
            created_by=current_user.id,
        ))
        session.commit()

    return repair


@router.get("/", response_model=List[RepairReadFull])
def list_repairs(
    skip: int = 0,
    limit: int = 100,
    repair_status: Optional[RepairStatus] = None,
    payment_status: Optional[PaymentStatus] = None,
    session: Session = Depends(get_session),
):
    """List repairs with optional status filters."""
    return RepairService.list_repairs(
        session=session,
        skip=skip,
        limit=limit,
        status=repair_status,
        payment_status=payment_status,
    )


@router.get("/{repair_id}", response_model=RepairReadFull)
def get_repair(repair_id: UUID, session: Session = Depends(get_session)):
    """Get a repair with its full status log and parts list."""
    try:
        return RepairService.get_repair(session=session, repair_id=repair_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.put("/{repair_id}", response_model=RepairReadFull)
def update_repair(
    repair_id: UUID,
    payload: RepairUpdate,
    session: Session = Depends(get_session),
    current_user: UserRead = Depends(require_technician),
):
    """
    Update non-status fields (customer info, costs, technician, etc.).
    Status changes must go through PATCH /{repair_id}/status.
    """
    try:
        return RepairService.update_repair(
            session=session,
            repair_id=repair_id,
            payload=payload,
            changed_by=current_user.id,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


class StatusTransitionPayload:
    def __init__(self, new_status: RepairStatus, notes: Optional[str] = None, expected_version: Optional[int] = None):
        self.new_status = new_status
        self.notes = notes
        self.expected_version = expected_version


from pydantic import BaseModel

class StatusTransitionBody(BaseModel):
    new_status: RepairStatus
    notes: Optional[str] = None
    expected_version: Optional[int] = None


@router.patch("/{repair_id}/status", response_model=RepairReadFull)
def transition_status(
    repair_id: UUID,
    body: StatusTransitionBody,
    session: Session = Depends(get_session),
    current_user: UserRead = Depends(require_technician),
):
    """
    Transition a repair to a new status.
    Every transition is immutably logged with who made it and when.

    Optionally pass `expected_version` for optimistic concurrency control.
    """
    try:
        return RepairService.transition_status(
            session=session,
            repair_id=repair_id,
            new_status=body.new_status,
            changed_by=current_user.id,
            notes=body.notes,
            expected_version=body.expected_version,
        )
    except InvalidStatusTransitionError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except ConcurrentModificationError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


class AddPartBody(BaseModel):
    product_id: UUID
    quantity_used: int
    unit_cost_override: Optional[float] = None


@router.post("/{repair_id}/parts", response_model=dict, status_code=status.HTTP_201_CREATED)
def add_repair_part(
    repair_id: UUID,
    body: AddPartBody,
    session: Session = Depends(get_session),
    current_user: UserRead = Depends(require_technician),
):
    """
    Add a product from inventory as a repair part.
    Stock is deducted atomically. Unit cost is locked at the product's current
    last_purchase_cost unless unit_cost_override is provided.
    """
    try:
        part = RepairService.add_part(
            session=session,
            repair_id=repair_id,
            product_id=body.product_id,
            quantity_used=body.quantity_used,
            added_by=current_user.id,
            unit_cost_override=body.unit_cost_override,
        )
        return part.dict()
    except InsufficientStockError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/{repair_id}/parts/{part_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_repair_part(
    repair_id: UUID,
    part_id: UUID,
    session: Session = Depends(get_session),
    current_user: UserRead = Depends(require_technician),
):
    """
    Remove a repair part and restore its stock to inventory.
    """
    try:
        RepairService.remove_part(
            session=session,
            repair_id=repair_id,
            part_id=part_id,
            removed_by=current_user.id,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{repair_id}/audit", response_model=List[AuditLogRead])
def get_repair_audit(
    repair_id: UUID,
    skip: int = 0,
    limit: int = 50,
    session: Session = Depends(get_session),
):
    """Full audit trail for a specific repair."""
    return AuditService.get_entity_log(
        session=session,
        entity_type="repair",
        entity_id=repair_id,
        limit=limit,
        offset=skip,
    )
