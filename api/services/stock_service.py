"""
stock_service.py
================
Single entry point for ALL stock mutations in the system.

Nothing else should touch Product.current_stock directly.
Every stock change flows through move_stock(), which:
  1. Acquires an optimistic lock on the product row (version check)
  2. Validates the resulting balance won't go negative
  3. Updates current_stock atomically
  4. Appends an immutable StockMovement record

Callers that need to deduct stock across multiple products (e.g. a multi-item
sale) must call move_stock() for each product inside the SAME db transaction
so that a failure on any item rolls back all deductions.

Horizontal scale note
---------------------
Optimistic locking (version field) handles concurrent writes from multiple app
instances. If two servers race to deduct the last unit, one will see
rows_affected=0 and retry with a fresh read. After MAX_RETRIES failures the
call raises a 409 Conflict so the client can surface a meaningful message.

PostgreSQL-specific: replace the Python-level retry loop with
SELECT ... FOR UPDATE SKIP LOCKED for even tighter guarantees in production.
SQLite (dev): no true concurrent writers, so the retry loop is a safety net
only.
"""
from typing import Optional
from uuid import UUID
from sqlmodel import Session, select
import sqlalchemy as sa

from ..models import (
    Product,
    StockMovement,
    StockMovementType,
)

MAX_RETRIES = 5


class InsufficientStockError(Exception):
    def __init__(self, product_id: UUID, available: int, requested: int):
        self.product_id = product_id
        self.available = available
        self.requested = requested
        super().__init__(
            f"Insufficient stock for product {product_id}. "
            f"Available: {available}, Requested: {abs(requested)}"
        )


class ConcurrentModificationError(Exception):
    """Raised when optimistic lock retries are exhausted."""
    pass


class StockService:

    @staticmethod
    def move_stock(
        session: Session,
        product_id: UUID,
        quantity_delta: int,           # positive = in, negative = out
        movement_type: StockMovementType,
        reference_type: str,
        reference_id: Optional[UUID] = None,
        notes: Optional[str] = None,
        created_by: Optional[UUID] = None,
    ) -> StockMovement:
        """
        The ONLY way stock should change anywhere in the system.

        quantity_delta > 0  → stock increases (purchase, return_in, adjustment+)
        quantity_delta < 0  → stock decreases (sale, repair_part, return_out, adjustment-)

        Returns the StockMovement record created.
        Raises InsufficientStockError if deduction would take stock below 0.
        Raises ConcurrentModificationError after MAX_RETRIES optimistic conflicts.
        """
        for attempt in range(MAX_RETRIES):
            product = session.get(Product, product_id)
            if not product:
                raise ValueError(f"Product {product_id} not found")

            new_balance = product.current_stock + quantity_delta

            if new_balance < 0:
                raise InsufficientStockError(
                    product_id=product_id,
                    available=product.current_stock,
                    requested=quantity_delta,
                )

            expected_version = product.version

            # Atomic update with version check (optimistic locking)
            result = session.exec(
                sa.update(Product)  # type: ignore[arg-type]
                .where(
                    Product.id == product_id,  # type: ignore[arg-type]
                    Product.version == expected_version,  # type: ignore[arg-type]
                )
                .values(
                    current_stock=new_balance,
                    version=expected_version + 1,
                )
                .execution_options(synchronize_session="fetch")
            )

            rows_affected = result.rowcount  # type: ignore[union-attr]

            if rows_affected == 0:
                # Another writer modified the row — refresh and retry
                session.expire(product)
                continue

            # Append immutable ledger entry
            movement = StockMovement(
                product_id=product_id,
                quantity_delta=quantity_delta,
                balance_after=new_balance,
                movement_type=movement_type,
                reference_type=reference_type,
                reference_id=reference_id,
                notes=notes,
                created_by=created_by,
            )
            session.add(movement)
            session.flush()  # get movement.id without committing — caller commits
            return movement

        raise ConcurrentModificationError(
            f"Could not update stock for product {product_id} after "
            f"{MAX_RETRIES} retries. Too much concurrent activity."
        )

    @staticmethod
    def get_balance(session: Session, product_id: UUID) -> int:
        """Fast read of current stock from the denormalized field."""
        product = session.get(Product, product_id)
        if not product:
            raise ValueError(f"Product {product_id} not found")
        return product.current_stock

    @staticmethod
    def get_movements(
        session: Session,
        product_id: UUID,
        limit: int = 100,
        offset: int = 0,
    ):
        """Paginated stock movement history for a product."""
        return session.exec(
            select(StockMovement)
            .where(StockMovement.product_id == product_id)
            .order_by(StockMovement.created_at.desc())  # type: ignore[attr-defined]
            .offset(offset)
            .limit(limit)
        ).all()

    @staticmethod
    def get_low_stock_products(session: Session):
        """Products where current_stock <= low_stock_threshold."""
        products = session.exec(
            select(Product).where(Product.is_active == True)  # noqa: E712
        ).all()
        return [p for p in products if p.current_stock <= p.low_stock_threshold]

    @staticmethod
    def manual_adjustment(
        session: Session,
        product_id: UUID,
        new_balance: int,
        reason: str,
        created_by: Optional[UUID] = None,
    ) -> StockMovement:
        """
        Set stock to an explicit value (stock-take correction).
        The delta is calculated from the current balance.
        Always creates an AuditLog entry — the caller is responsible for that.
        """
        product = session.get(Product, product_id)
        if not product:
            raise ValueError(f"Product {product_id} not found")

        delta = new_balance - product.current_stock
        return StockService.move_stock(
            session=session,
            product_id=product_id,
            quantity_delta=delta,
            movement_type=StockMovementType.adjustment,
            reference_type="manual",
            notes=reason,
            created_by=created_by,
        )
