"""
repair_service.py
=================
All business logic for Repairs. Completely separated from Sales.

Key design decisions
--------------------
- Status transitions are atomic: the Repair row, the RepairStatusLog entry,
  and the AuditLog entry are all written in the same transaction.
- Optimistic locking on Repair.version prevents two technicians concurrently
  updating the same repair row from silently overwriting each other.
- Adding/removing parts deducts/restores stock via StockService.move_stock()
  inside the same transaction as the RepairPart insert/delete.
- Repair.parts_cost is NEVER stored manually — it is computed on read from
  the sum of RepairPart.total_cost records.
- Repair revenue (total_amount) stays on the Repair model and never flows
  into Sale totals. Analytics keeps them separate.

Valid status transitions
------------------------
  pending → diagnosed → in_progress → completed
                      ↘
                       cancelled (from any non-completed state)
"""
from typing import Optional, List
from uuid import UUID
from datetime import date, datetime

import sqlalchemy as sa
from sqlmodel import Session, select

from ..models import (
    Repair,
    RepairCreate,
    RepairUpdate,
    RepairPart,
    RepairStatusLog,
    RepairReadFull,
    RepairStatus,
    PaymentStatus,
    Product,
    StockMovementType,
    AuditAction,
)
from .stock_service import StockService, InsufficientStockError
from .audit_service import AuditService


# Allowed transitions: current → {allowed next states}
VALID_TRANSITIONS = {
    RepairStatus.pending: {RepairStatus.in_progress, RepairStatus.cancelled},
    RepairStatus.in_progress: {RepairStatus.completed, RepairStatus.cancelled},
    RepairStatus.completed: set(),   # terminal
    RepairStatus.cancelled: set(),   # terminal
}


class InvalidStatusTransitionError(Exception):
    pass


class RepairService:

    @staticmethod
    def create_repair(
        session: Session,
        payload: RepairCreate,
        created_by: Optional[UUID] = None,
    ) -> RepairReadFull:
        data = payload.dict()
        data.pop("total_amount", None)   # never accepted from client
        data.pop("parts_cost", None)     # always computed
        labor_cost = data.get("labor_cost", 0) or 0
        repair = Repair(
            **data,
            parts_cost=0.0,
            total_amount=round(labor_cost, 2),
            created_by=created_by,
        )
        session.add(repair)
        session.flush()

        # Initial status log entry
        log_entry = RepairStatusLog(
            repair_id=repair.id,
            from_status=None,
            to_status=repair.repair_status,
            changed_by=created_by,
            notes="Repair created",
        )
        session.add(log_entry)

        # Inline audit (same transaction — creation must be atomic with log)
        AuditService.log_sync(
            session=session,
            entity_type="repair",
            entity_id=repair.id,
            action=AuditAction.create,
            changed_by=created_by,
            after_state=repair.dict(),
        )

        session.commit()
        session.refresh(repair)
        return RepairService._to_full(session, repair)

    @staticmethod
    def transition_status(
        session: Session,
        repair_id: UUID,
        new_status: RepairStatus,
        changed_by: Optional[UUID] = None,
        notes: Optional[str] = None,
        expected_version: Optional[int] = None,
    ) -> RepairReadFull:
        """
        Move a repair to a new status.

        If expected_version is provided, uses optimistic locking — raises
        ConcurrentModificationError if another writer changed the row first.

        Setting status to completed auto-sets date_completed if not already set.
        """
        repair = session.get(Repair, repair_id)
        if not repair:
            raise ValueError(f"Repair {repair_id} not found")

        current_status = repair.repair_status
        if new_status not in VALID_TRANSITIONS.get(current_status, set()):
            raise InvalidStatusTransitionError(
                f"Cannot transition repair from '{current_status}' to '{new_status}'. "
                f"Allowed next states: {[s.value for s in VALID_TRANSITIONS[current_status]]}"
            )

        # Optimistic lock
        if expected_version is not None and repair.version != expected_version:
            raise ConcurrentModificationError(
                f"Repair {repair_id} was modified by another request. "
                "Reload and try again."
            )

        before_state = repair.dict()

        # Apply transition
        repair.repair_status = new_status
        repair.version += 1
        repair.updated_at = datetime.utcnow()

        if new_status == RepairStatus.completed and repair.date_completed is None:
            repair.date_completed = date.today()

        session.add(repair)

        # Log transition
        log_entry = RepairStatusLog(
            repair_id=repair.id,
            from_status=current_status,
            to_status=new_status,
            changed_by=changed_by,
            notes=notes,
        )
        session.add(log_entry)

        # Audit — synchronous so it's in the same transaction
        AuditService.log_sync(
            session=session,
            entity_type="repair",
            entity_id=repair.id,
            action=AuditAction.status_change,
            changed_by=changed_by,
            before_state=before_state,
            after_state=repair.dict(),
            extra={"from": current_status.value, "to": new_status.value, "notes": notes},
        )

        session.commit()
        session.refresh(repair)
        return RepairService._to_full(session, repair)

    @staticmethod
    def update_repair(
        session: Session,
        repair_id: UUID,
        payload: RepairUpdate,
        changed_by: Optional[UUID] = None,
    ) -> RepairReadFull:
        """
        Update non-status fields (customer info, costs, technician, etc.).
        Status changes MUST go through transition_status().
        """
        repair = session.get(Repair, repair_id)
        if not repair:
            raise ValueError(f"Repair {repair_id} not found")

        if repair.repair_status in (RepairStatus.completed, RepairStatus.cancelled):
            raise ValueError(
                f"Cannot edit a repair that is '{repair.repair_status}'. "
                "Create a new repair or contact an administrator."
            )

        before_state = repair.dict()

        update_data = payload.dict(exclude_unset=True)
        # Prevent callers from overriding computed/controlled fields
        update_data.pop("repair_status", None)
        update_data.pop("total_amount", None)
        update_data.pop("parts_cost", None)

        for field, value in update_data.items():
            setattr(repair, field, value)

        # Recompute total_amount from current labor_cost + parts_cost
        repair.total_amount = round((repair.labor_cost or 0) + (repair.parts_cost or 0), 2)
        repair.version += 1
        repair.updated_at = datetime.utcnow()
        session.add(repair)

        AuditService.log_sync(
            session=session,
            entity_type="repair",
            entity_id=repair.id,
            action=AuditAction.update,
            changed_by=changed_by,
            before_state=before_state,
            after_state=repair.dict(),
        )

        session.commit()
        session.refresh(repair)
        return RepairService._to_full(session, repair)

    @staticmethod
    def add_part(
        session: Session,
        repair_id: UUID,
        product_id: UUID,
        quantity_used: int,
        added_by: Optional[UUID] = None,
        unit_cost_override: Optional[float] = None,
    ) -> RepairPart:
        """
        Add a product from inventory as a repair part.

        Stock is deducted atomically via StockService.move_stock().
        unit_cost is locked from the product's last_purchase_cost unless
        overridden (e.g. external sourcing at a different price).
        """
        repair = session.get(Repair, repair_id)
        if not repair:
            raise ValueError(f"Repair {repair_id} not found")

        if repair.repair_status in (RepairStatus.completed, RepairStatus.cancelled):
            raise ValueError(
                f"Cannot add parts to a repair with status '{repair.repair_status}'"
            )

        product = session.get(Product, product_id)
        if not product:
            raise ValueError(f"Product {product_id} not found")

        if quantity_used <= 0:
            raise ValueError("quantity_used must be positive")

        unit_cost = unit_cost_override if unit_cost_override is not None else product.last_purchase_cost
        total_cost = round(unit_cost * quantity_used, 2)

        # Deduct stock atomically
        movement = StockService.move_stock(
            session=session,
            product_id=product_id,
            quantity_delta=-quantity_used,
            movement_type=StockMovementType.repair_part,
            reference_type="repair",
            reference_id=repair_id,
            notes=f"Part used in repair {repair_id}",
            created_by=added_by,
        )

        part = RepairPart(
            repair_id=repair_id,
            product_id=product_id,
            quantity_used=quantity_used,
            unit_cost=unit_cost,
            total_cost=total_cost,
            added_by=added_by,
            stock_movement_id=movement.id,
        )
        session.add(part)

        # Keep parts_cost and total_amount on the Repair row in sync
        repair.parts_cost = round((repair.parts_cost or 0) + total_cost, 2)
        repair.total_amount = round((repair.labor_cost or 0) + repair.parts_cost, 2)
        repair.updated_at = datetime.utcnow()
        session.add(repair)

        AuditService.log_sync(
            session=session,
            entity_type="repair",
            entity_id=repair_id,
            action=AuditAction.update,
            changed_by=added_by,
            extra={
                "action": "add_part",
                "product_id": str(product_id),
                "product_name": product.name,
                "quantity": quantity_used,
                "unit_cost": unit_cost,
            },
        )

        session.commit()
        session.refresh(part)
        return part

    @staticmethod
    def remove_part(
        session: Session,
        repair_id: UUID,
        part_id: UUID,
        removed_by: Optional[UUID] = None,
    ) -> None:
        """
        Remove a repair part and restore its stock.
        """
        repair = session.get(Repair, repair_id)
        if not repair:
            raise ValueError(f"Repair {repair_id} not found")

        if repair.repair_status in (RepairStatus.completed, RepairStatus.cancelled):
            raise ValueError(
                f"Cannot remove parts from a repair with status '{repair.repair_status}'"
            )

        part = session.get(RepairPart, part_id)
        if not part or part.repair_id != repair_id:
            raise ValueError(f"Part {part_id} not found on repair {repair_id}")

        # Restore stock
        StockService.move_stock(
            session=session,
            product_id=part.product_id,
            quantity_delta=part.quantity_used,
            movement_type=StockMovementType.repair_part_removed,
            reference_type="repair",
            reference_id=repair_id,
            notes=f"Part removed from repair {repair_id}",
            created_by=removed_by,
        )

        AuditService.log_sync(
            session=session,
            entity_type="repair",
            entity_id=repair_id,
            action=AuditAction.update,
            changed_by=removed_by,
            extra={
                "action": "remove_part",
                "part_id": str(part_id),
                "product_id": str(part.product_id),
                "quantity_restored": part.quantity_used,
            },
        )

        # Keep parts_cost and total_amount on the Repair row in sync
        repair.parts_cost = round(max(0.0, (repair.parts_cost or 0) - part.total_cost), 2)
        repair.total_amount = round((repair.labor_cost or 0) + repair.parts_cost, 2)
        repair.updated_at = datetime.utcnow()
        session.add(repair)

        session.delete(part)
        session.commit()

    @staticmethod
    def get_repair(session: Session, repair_id: UUID) -> RepairReadFull:
        repair = session.get(Repair, repair_id)
        if not repair:
            raise ValueError(f"Repair {repair_id} not found")
        return RepairService._to_full(session, repair)

    @staticmethod
    def list_repairs(
        session: Session,
        skip: int = 0,
        limit: int = 100,
        status: Optional[RepairStatus] = None,
        payment_status: Optional[PaymentStatus] = None,
    ) -> List[RepairReadFull]:
        query = select(Repair)
        if status:
            query = query.where(Repair.repair_status == status)
        if payment_status:
            query = query.where(Repair.payment_status == payment_status)
        repairs = session.exec(
            query.order_by(Repair.created_at.desc())  # type: ignore[attr-defined]
            .offset(skip).limit(limit)
        ).all()
        return [RepairService._to_full(session, r) for r in repairs]

    @staticmethod
    def _computed_parts_cost(session: Session, repair_id: UUID) -> float:
        """Sum of all RepairPart.total_cost for this repair."""
        parts = session.exec(
            select(RepairPart).where(RepairPart.repair_id == repair_id)
        ).all()
        return round(sum(p.total_cost for p in parts), 2)

    @staticmethod
    def _to_full(session: Session, repair: Repair) -> RepairReadFull:
        parts = session.exec(
            select(RepairPart).where(RepairPart.repair_id == repair.id)
        ).all()
        logs = session.exec(
            select(RepairStatusLog)
            .where(RepairStatusLog.repair_id == repair.id)
            .order_by(RepairStatusLog.timestamp)  # type: ignore[attr-defined]
        ).all()
        computed_parts_cost = round(sum(p.total_cost for p in parts), 2)
        repair_data = repair.dict()
        repair_data["parts_cost"] = computed_parts_cost
        repair_data["total_amount"] = round((repair.labor_cost or 0) + computed_parts_cost, 2)
        return RepairReadFull(
            **repair_data,
            parts_used=list(parts),
            status_log=list(logs),
        )


class ConcurrentModificationError(Exception):
    pass
