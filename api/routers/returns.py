"""
returns.py — Returns router
============================
POST  /api/returns              Create return (stock action executed atomically)
GET   /api/returns              List returns
GET   /api/returns/:id          Get a return
PATCH /api/returns/:id/status   Update return status (pending → resolved etc.)
GET   /api/returns/:id/audit    Audit trail for a return
"""
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select

from ..database import get_session
from ..dependencies import get_current_user, require_cashier, require_manager
from ..models import (
    Return,
    ReturnCreate,
    ReturnStatus,
    ReturnAction,
    AuditLogRead,
    UserRead,
)
from ..services.return_service import ReturnService
from ..services.audit_service import AuditService
from ..services.stock_service import InsufficientStockError

router = APIRouter(
    prefix="/returns",
    tags=["returns"],
    dependencies=[Depends(get_current_user)],
)


@router.post("/", response_model=Return, status_code=status.HTTP_201_CREATED)
def create_return(
    payload: ReturnCreate,
    session: Session = Depends(get_session),
    current_user: UserRead = Depends(require_cashier),
):
    """
    Create a return and execute the corresponding stock action.
    refund/exchange/replacement restore or swap stock atomically.
    repair action creates the return record with no stock change.
    """
    try:
        return ReturnService.create_return(
            session=session,
            payload=payload,
            created_by=current_user.id,
        )
    except InsufficientStockError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/", response_model=List[Return])
def list_returns(
    skip: int = 0,
    limit: int = 100,
    return_status: Optional[ReturnStatus] = None,
    action: Optional[ReturnAction] = None,
    session: Session = Depends(get_session),
):
    """List returns with optional filters."""
    query = select(Return)
    if return_status:
        query = query.where(Return.status == return_status)
    if action:
        query = query.where(Return.action_taken == action)
    return session.exec(query.offset(skip).limit(limit)).all()


@router.get("/{return_id}", response_model=Return)
def get_return(return_id: UUID, session: Session = Depends(get_session)):
    """Get a return by ID."""
    try:
        return ReturnService.get_return(session=session, return_id=return_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


class StatusUpdateBody(BaseModel):
    new_status: ReturnStatus
    notes: Optional[str] = None


@router.patch("/{return_id}/status", response_model=Return)
def update_return_status(
    return_id: UUID,
    body: StatusUpdateBody,
    session: Session = Depends(get_session),
    current_user: UserRead = Depends(require_manager),
):
    """Update the status of a return (e.g. pending → resolved). Manager+ only."""
    try:
        return ReturnService.update_return_status(
            session=session,
            return_id=return_id,
            new_status=body.new_status,
            changed_by=current_user.id,
            notes=body.notes,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{return_id}/audit", response_model=List[AuditLogRead])
def get_return_audit(
    return_id: UUID,
    skip: int = 0,
    limit: int = 50,
    session: Session = Depends(get_session),
):
    """Full audit trail for a specific return."""
    return AuditService.get_entity_log(
        session=session,
        entity_type="return",
        entity_id=return_id,
        limit=limit,
        offset=skip,
    )
