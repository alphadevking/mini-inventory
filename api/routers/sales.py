"""
sales.py — Sales router
========================
POST /api/sales              Create a sale (atomic multi-item)
GET  /api/sales              List sales
GET  /api/sales/:id          Get single sale with line items
GET  /api/sales/:id/audit    Audit trail for a sale

No PUT or DELETE — sales are immutable. Corrections go through /returns.
"""
from typing import List, Optional
from uuid import UUID
from datetime import date

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Header, status
from sqlmodel import Session

from ..database import get_session
from ..dependencies import get_current_user, require_cashier, require_manager
from ..models import (
    SaleCreate,
    SaleRead,
    AuditLogRead,
    PaymentStatus,
    UserRead,
    IdempotencyRecord,
)
from ..services.sale_service import SaleService
from ..services.audit_service import AuditService
from ..services.stock_service import InsufficientStockError
from ..models import AuditAction

router = APIRouter(
    prefix="/sales",
    tags=["sales"],
    dependencies=[Depends(get_current_user)],
)


def _check_idempotency(
    session: Session,
    idempotency_key: Optional[str],
    endpoint: str,
) -> Optional[dict]:
    """
    Returns cached response if key was already processed, else None.
    """
    if not idempotency_key:
        return None
    record = session.get(IdempotencyRecord, idempotency_key)
    if record:
        return record.response_body
    return None


def _store_idempotency(
    session: Session,
    idempotency_key: Optional[str],
    endpoint: str,
    response_body: dict,
    created_by: Optional[UUID] = None,
) -> None:
    if not idempotency_key:
        return
    record = IdempotencyRecord(
        key=idempotency_key,
        endpoint=endpoint,
        response_status=201,
        response_body=response_body,
        created_by=created_by,
    )
    session.add(record)
    session.commit()


@router.post("/", response_model=SaleRead, status_code=status.HTTP_201_CREATED)
def create_sale(
    payload: SaleCreate,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    current_user: UserRead = Depends(require_cashier),
    idempotency_key: Optional[str] = Header(default=None, alias="Idempotency-Key"),
):
    """
    Create a sale. Atomic: all items are validated, prices locked, and stock
    deducted in a single transaction. If any item fails, the whole sale rolls back.

    Send `Idempotency-Key: <uuid>` header to safely retry on network timeout.
    """
    # Idempotency check
    cached = _check_idempotency(session, idempotency_key, "POST /api/sales")
    if cached:
        return cached

    try:
        sale = SaleService.create_sale(
            session=session,
            payload=payload,
            created_by=current_user.id,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except InsufficientStockError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        )

    sale_dict = sale.dict()

    # Store idempotency record
    _store_idempotency(
        session=session,
        idempotency_key=idempotency_key,
        endpoint="POST /api/sales",
        response_body=sale_dict,
        created_by=current_user.id,
    )

    # Async audit — does NOT block the response
    from ..database import engine
    background_tasks.add_task(
        AuditService.log,
        entity_type="sale",
        entity_id=sale.id,
        action=AuditAction.create,
        db_url=str(engine.url),
        changed_by=current_user.id,
        after_state=sale_dict,
    )

    return sale


@router.get("/", response_model=List[SaleRead])
def list_sales(
    skip: int = 0,
    limit: int = 100,
    customer_name: Optional[str] = None,
    payment_status: Optional[PaymentStatus] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    session: Session = Depends(get_session),
):
    """List sales with optional filters."""
    return SaleService.list_sales(
        session=session,
        skip=skip,
        limit=limit,
        customer_name=customer_name,
        payment_status=payment_status,
        start_date=start_date,
        end_date=end_date,
    )


@router.get("/{sale_id}", response_model=SaleRead)
def get_sale(sale_id: UUID, session: Session = Depends(get_session)):
    """Get a sale with all line items."""
    try:
        return SaleService.get_sale(session=session, sale_id=sale_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/{sale_id}/audit", response_model=List[AuditLogRead])
def get_sale_audit(
    sale_id: UUID,
    skip: int = 0,
    limit: int = 50,
    session: Session = Depends(get_session),
    current_user: UserRead = Depends(require_cashier),
):
    """Full audit trail for a specific sale."""
    return AuditService.get_entity_log(
        session=session,
        entity_type="sale",
        entity_id=sale_id,
        limit=limit,
        offset=skip,
    )
