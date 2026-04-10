"""
return_service.py
=================
All business logic for Returns. Stock actions are determined by action_taken:

  refund      → restore returned product stock (+qty)
  exchange    → restore returned product stock (+qty), deduct replacement stock (-qty)
  replacement → same as exchange
  repair      → no stock change (item stays with customer during repair)

All stock changes go through StockService.move_stock() and are therefore
tracked in the StockMovement ledger with full traceability.

Audit logging is synchronous (same transaction) so a failed audit write
rolls back the return — we never want a return without an audit trail.
"""
from typing import Optional
from uuid import UUID
from datetime import datetime

from sqlmodel import Session

from ..models import (
    Return,
    ReturnCreate,
    ReturnUpdate,
    ReturnAction,
    ReturnStatus,
    Product,
    StockMovementType,
    AuditAction,
)
from .stock_service import StockService, InsufficientStockError
from .audit_service import AuditService


class ReturnService:

    @staticmethod
    def create_return(
        session: Session,
        payload: ReturnCreate,
        created_by: Optional[UUID] = None,
    ) -> Return:
        """
        Create a return and execute stock action based on action_taken.
        All operations are atomic — fails mean no return record is created.
        """
        # Validate main product
        product = session.get(Product, payload.product_id)
        if not product:
            raise ValueError(f"Product {payload.product_id} not found")

        # Validate replacement product if needed
        replacement_product = None
        if payload.action_taken in (ReturnAction.exchange, ReturnAction.replacement):
            if not payload.replacement_product_id:
                raise ValueError(
                    f"action_taken='{payload.action_taken}' requires replacement_product_id"
                )
            replacement_product = session.get(Product, payload.replacement_product_id)
            if not replacement_product:
                raise ValueError(
                    f"Replacement product {payload.replacement_product_id} not found"
                )
            # Check replacement stock
            if replacement_product.current_stock < 1:
                raise InsufficientStockError(
                    product_id=replacement_product.id,
                    available=replacement_product.current_stock,
                    requested=1,
                )

        # Create return record
        db_return = Return(
            **payload.dict(),
            created_by=created_by,
            status=ReturnStatus.approved,  # creating a return auto-approves it
        )
        session.add(db_return)
        session.flush()  # get db_return.id

        stock_movement_id = None

        # Execute stock action
        if payload.action_taken == ReturnAction.refund:
            # Customer returns item → stock goes back in
            movement = StockService.move_stock(
                session=session,
                product_id=payload.product_id,
                quantity_delta=1,
                movement_type=StockMovementType.return_in,
                reference_type="return",
                reference_id=db_return.id,
                notes=f"Refund return: {payload.reason}",
                created_by=created_by,
            )
            stock_movement_id = movement.id

        elif payload.action_taken in (ReturnAction.exchange, ReturnAction.replacement):
            # Returned item comes back in
            in_movement = StockService.move_stock(
                session=session,
                product_id=payload.product_id,
                quantity_delta=1,
                movement_type=StockMovementType.return_in,
                reference_type="return",
                reference_id=db_return.id,
                notes=f"{payload.action_taken} return (in): {payload.reason}",
                created_by=created_by,
            )
            stock_movement_id = in_movement.id

            # Replacement item goes out
            StockService.move_stock(
                session=session,
                product_id=payload.replacement_product_id,
                quantity_delta=-1,
                movement_type=StockMovementType.return_out,
                reference_type="return",
                reference_id=db_return.id,
                notes=f"{payload.action_taken} return (out): replacement for return {db_return.id}",
                created_by=created_by,
            )

        elif payload.action_taken == ReturnAction.repair:
            # No stock change — item stays with customer
            pass

        # Link stock movement to return record
        if stock_movement_id:
            db_return.stock_movement_id = stock_movement_id
            session.add(db_return)

        # Audit — synchronous (part of same transaction)
        AuditService.log_sync(
            session=session,
            entity_type="return",
            entity_id=db_return.id,
            action=AuditAction.create,
            changed_by=created_by,
            after_state=db_return.dict(),
            extra={"action_taken": payload.action_taken.value, "stock_affected": stock_movement_id is not None},
        )

        session.commit()
        session.refresh(db_return)
        return db_return

    @staticmethod
    def update_return_status(
        session: Session,
        return_id: UUID,
        new_status: ReturnStatus,
        changed_by: Optional[UUID] = None,
        notes: Optional[str] = None,
    ) -> Return:
        """Update the status of an existing return (e.g. pending → resolved)."""
        db_return = session.get(Return, return_id)
        if not db_return:
            raise ValueError(f"Return {return_id} not found")

        before_state = db_return.dict()
        db_return.status = new_status
        db_return.updated_at = datetime.utcnow()
        session.add(db_return)

        AuditService.log_sync(
            session=session,
            entity_type="return",
            entity_id=db_return.id,
            action=AuditAction.status_change,
            changed_by=changed_by,
            before_state=before_state,
            after_state=db_return.dict(),
            extra={"notes": notes},
        )

        session.commit()
        session.refresh(db_return)
        return db_return

    @staticmethod
    def get_return(session: Session, return_id: UUID) -> Return:
        db_return = session.get(Return, return_id)
        if not db_return:
            raise ValueError(f"Return {return_id} not found")
        return db_return
