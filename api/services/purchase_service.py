"""
purchase_service.py
===================
All business logic for supplier purchases (stock intake).

Flow
----
create_purchase()
  └── for each PurchaseItem line
        ├── bulk (units list empty)
        │     └── StockService.move_stock(+qty, type=purchase)
        └── serialized (units list matches qty)
              ├── ProductUnit row per unit spec
              └── StockService.move_stock(+1, type=purchase, unit_id=unit.id)

Everything is atomic — one commit for the whole purchase. A failure on any
line rolls back the entire delivery.

Immutability
------------
Purchases cannot be edited or deleted after creation (same rationale as Sales).
Corrections go through a manual stock Adjustment or a new Purchase.
"""
from typing import Optional
from uuid import UUID
from datetime import date

from sqlmodel import Session

from ..models import (
    Product,
    ProductUnit,
    UnitStatus,
    Purchase,
    PurchaseItem,
    PurchaseCreate,
    PurchaseItemCreate,
    PurchaseRead,
    PurchaseItemRead,
    StockMovementType,
)
from .stock_service import StockService
from .audit_service import AuditService
from ..models import AuditAction


class PurchaseService:

    @staticmethod
    def create_purchase(
        session: Session,
        payload: PurchaseCreate,
        created_by: Optional[UUID] = None,
    ) -> PurchaseRead:
        """
        Create a purchase delivery and update stock atomically.

        Raises:
            ValueError: missing product, qty mismatch for serialized, duplicate serial/IMEI
        """
        if not payload.items:
            raise ValueError("A purchase must have at least one item")

        delivery_date = payload.delivery_date or date.today()

        # ── 1. Validate all products exist ───────────────────────────────────
        for item in payload.items:
            product = session.get(Product, item.product_id)
            if not product:
                raise ValueError(f"Product {item.product_id} not found")
            if not product.is_active:
                raise ValueError(f"Product '{product.name}' is inactive")
            if item.units:
                if len(item.units) != item.quantity:
                    raise ValueError(
                        f"Product '{product.name}': units list length ({len(item.units)}) "
                        f"must equal quantity ({item.quantity})"
                    )
                # Pre-flight: check for duplicate serials/IMEIs in this batch
                serials = [u.serial_number for u in item.units]
                if len(serials) != len(set(serials)):
                    raise ValueError(
                        f"Product '{product.name}': duplicate serial numbers in this delivery"
                    )
                imeis = [u.imei for u in item.units if u.imei]
                if len(imeis) != len(set(imeis)):
                    raise ValueError(
                        f"Product '{product.name}': duplicate IMEIs in this delivery"
                    )

        # ── 2. Create Purchase header ────────────────────────────────────────
        purchase = Purchase(
            supplier=payload.supplier,
            reference_number=payload.reference_number,
            delivery_date=delivery_date,
            transport_cost=payload.transport_cost,
            total_cost=0.0,  # computed below
            notes=payload.notes,
            created_by=created_by,
        )
        session.add(purchase)
        session.flush()  # get purchase.id

        # ── 3. Create PurchaseItems + move stock ─────────────────────────────
        running_total = payload.transport_cost
        db_items: list[PurchaseItem] = []

        for item in payload.items:
            subtotal = round(item.quantity * item.unit_cost, 2)
            running_total += subtotal

            db_item = PurchaseItem(
                purchase_id=purchase.id,
                product_id=item.product_id,
                quantity=item.quantity,
                unit_cost=item.unit_cost,
                subtotal=subtotal,
            )
            session.add(db_item)
            session.flush()  # get db_item.id
            db_items.append(db_item)

            if item.units:
                # ── Serialized intake ─────────────────────────────────────
                for spec in item.units:
                    unit = ProductUnit(
                        product_id=item.product_id,
                        serial_number=spec.serial_number,
                        imei=spec.imei,
                        color=spec.color,
                        storage=spec.storage,
                        condition=spec.condition,
                        status=UnitStatus.in_stock,
                        purchase_cost=item.unit_cost,
                        purchased_at=delivery_date,
                        notes=spec.notes,
                        created_by=created_by,
                    )
                    session.add(unit)
                    session.flush()  # get unit.id

                    StockService.move_stock(
                        session=session,
                        product_id=item.product_id,
                        unit_id=unit.id,
                        quantity_delta=1,
                        movement_type=StockMovementType.purchase,
                        reference_type="purchase",
                        reference_id=purchase.id,
                        notes=f"Received SN: {spec.serial_number}",
                        created_by=created_by,
                    )
            else:
                # ── Bulk intake ───────────────────────────────────────────
                StockService.move_stock(
                    session=session,
                    product_id=item.product_id,
                    quantity_delta=item.quantity,
                    movement_type=StockMovementType.purchase,
                    reference_type="purchase",
                    reference_id=purchase.id,
                    notes=f"Bulk receive: {item.quantity} units",
                    created_by=created_by,
                )

        # ── 4. Write total back to header ────────────────────────────────────
        purchase.total_cost = round(running_total, 2)
        session.add(purchase)

        # ── 5. Audit ─────────────────────────────────────────────────────────
        AuditService.log_sync(
            session=session,
            entity_type="purchase",
            entity_id=purchase.id,
            action=AuditAction.create,
            changed_by=created_by,
            after_state={
                "supplier": purchase.supplier,
                "delivery_date": str(purchase.delivery_date),
                "total_cost": purchase.total_cost,
                "item_count": len(db_items),
            },
        )

        session.commit()
        session.refresh(purchase)

        return PurchaseService._to_read(session, purchase, db_items)

    # ── Queries ───────────────────────────────────────────────────────────────

    @staticmethod
    def get_purchase(session: Session, purchase_id: UUID) -> PurchaseRead:
        purchase = session.get(Purchase, purchase_id)
        if not purchase:
            raise ValueError(f"Purchase {purchase_id} not found")
        items = purchase.items
        return PurchaseService._to_read(session, purchase, items)

    # ── Internal helpers ──────────────────────────────────────────────────────

    @staticmethod
    def _to_read(
        session: Session,
        purchase: Purchase,
        items: list,
    ) -> PurchaseRead:
        item_reads = []
        for it in items:
            product = session.get(Product, it.product_id)
            item_reads.append(
                PurchaseItemRead(
                    id=it.id,
                    purchase_id=it.purchase_id,
                    product_id=it.product_id,
                    quantity=it.quantity,
                    unit_cost=it.unit_cost,
                    subtotal=it.subtotal,
                    created_at=it.created_at,
                    product=product,
                )
            )
        return PurchaseRead(
            id=purchase.id,
            supplier=purchase.supplier,
            reference_number=purchase.reference_number,
            delivery_date=purchase.delivery_date,
            transport_cost=purchase.transport_cost,
            total_cost=purchase.total_cost,
            notes=purchase.notes,
            created_by=purchase.created_by,
            created_at=purchase.created_at,
            items=item_reads,
        )
