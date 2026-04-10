"""
sale_service.py
===============
All business logic for Sales. Routers are thin — they parse HTTP and call here.

Atomicity guarantee
-------------------
create_sale() performs ALL of the following inside a single DB transaction:
  1. Validate every item has sufficient stock
  2. Lock prices (unit_price, unit_cost) from the product at this moment
  3. Generate sale_number (MAX + 1 within the transaction)
  4. Create the Sale header
  5. Create each SaleItem
  6. Deduct stock via StockService.move_stock() for each item
  7. Commit

If anything fails at any step, the entire transaction rolls back:
no partial sales, no phantom stock deductions.

Immutability
------------
Sales cannot be updated or deleted after creation. This is enforced at the
router level (no PUT/DELETE endpoints). Corrections go through the Return
workflow which creates its own StockMovement and AuditLog.

Sale numbers
------------
Dev/SQLite: MAX(sale_number) + 1 computed inside the transaction.
Production/PostgreSQL: swap to SELECT nextval('sale_number_seq') — atomic and
gap-free without the lock overhead of MAX+1.
"""
from typing import List, Optional
from uuid import UUID
from datetime import datetime

import sqlalchemy as sa
from sqlmodel import Session, select

from ..models import (
    Product,
    Sale,
    SaleBase,
    SaleCreate,
    SaleItem,
    SaleItemCreate,
    SaleRead,
    SaleItemRead,
    StockMovementType,
    PaymentStatus,
    ReturnStatus,
)
from .stock_service import StockService, InsufficientStockError


class SaleService:

    @staticmethod
    def _next_sale_number(session: Session) -> int:
        """
        Generate next sale number atomically.
        Safe for SQLite (single writer) and PostgreSQL (serializable isolation
        on this query within the transaction).

        Production upgrade path: replace body with
            return session.exec(sa.text("SELECT nextval('sale_number_seq')")).scalar()
        """
        result = session.exec(sa.text("SELECT COALESCE(MAX(sale_number), 0) + 1 FROM sale"))  # type: ignore
        return result.scalar() or 1

    @staticmethod
    def create_sale(
        session: Session,
        payload: SaleCreate,
        created_by: Optional[UUID] = None,
    ) -> SaleRead:
        """
        Atomic sale creation — all items or nothing.

        Raises:
            ValueError: product not found, or no items provided
            InsufficientStockError: any item doesn't have enough stock
        """
        if not payload.items:
            raise ValueError("A sale must have at least one item")

        # --- 1. Validate all products exist and load prices ---
        resolved: List[tuple[SaleItemCreate, Product]] = []
        for item in payload.items:
            product = session.get(Product, item.product_id)
            if not product:
                raise ValueError(f"Product {item.product_id} not found")
            if not product.is_active:
                raise ValueError(f"Product '{product.name}' is inactive and cannot be sold")
            if item.quantity <= 0:
                raise ValueError(f"Quantity must be positive for product '{product.name}'")
            resolved.append((item, product))

        # --- 2. Pre-flight stock check (fail fast before any mutations) ---
        for item, product in resolved:
            if product.current_stock < item.quantity:
                raise InsufficientStockError(
                    product_id=product.id,
                    available=product.current_stock,
                    requested=item.quantity,
                )

        # --- 3. Build line items with locked prices ---
        sale_items_data = []
        subtotal = 0.0
        for item, product in resolved:
            unit_price = product.suggested_sell_price
            unit_cost = product.last_purchase_cost
            discount = item.discount_per_item
            line_total = (unit_price - discount) * item.quantity
            subtotal += line_total
            sale_items_data.append({
                "item": item,
                "product": product,
                "unit_price": unit_price,
                "unit_cost": unit_cost,
                "line_total": line_total,
            })

        total_amount = subtotal - payload.discount_amount + payload.tax_amount

        # --- 4. Generate sale number ---
        sale_number = SaleService._next_sale_number(session)

        # --- 5. Create Sale header ---
        sale = Sale(
            sale_number=sale_number,
            sale_date=payload.sale_date,
            customer_name=payload.customer_name,
            customer_phone=payload.customer_phone,
            customer_email=payload.customer_email,
            subtotal=round(subtotal, 2),
            discount_amount=payload.discount_amount,
            tax_amount=payload.tax_amount,
            total_amount=round(total_amount, 2),
            payment_method=payload.payment_method,
            payment_status=payload.payment_status,
            amount_paid=payload.amount_paid,
            notes=payload.notes,
            created_by=created_by,
        )
        session.add(sale)
        session.flush()  # get sale.id without committing

        # --- 6. Create SaleItems + deduct stock ---
        sale_item_reads: List[SaleItemRead] = []
        for entry in sale_items_data:
            item: SaleItemCreate = entry["item"]
            product: Product = entry["product"]

            # Deduct stock — raises InsufficientStockError if race condition hit
            movement = StockService.move_stock(
                session=session,
                product_id=product.id,
                quantity_delta=-item.quantity,
                movement_type=StockMovementType.sale,
                reference_type="sale",
                reference_id=sale.id,
                notes=f"Sale #{sale_number}",
                created_by=created_by,
            )

            sale_item = SaleItem(
                sale_id=sale.id,
                product_id=product.id,
                quantity=item.quantity,
                unit_price=entry["unit_price"],
                unit_cost=entry["unit_cost"],
                discount_per_item=item.discount_per_item,
                line_total=entry["line_total"],
                stock_movement_id=movement.id,
            )
            session.add(sale_item)
            session.flush()

            sale_item_reads.append(SaleItemRead(
                id=sale_item.id,
                product_id=sale_item.product_id,
                quantity=sale_item.quantity,
                unit_price=sale_item.unit_price,
                unit_cost=sale_item.unit_cost,
                discount_per_item=sale_item.discount_per_item,
                line_total=sale_item.line_total,
                created_at=sale_item.created_at,
            ))

        # --- 7. Commit everything atomically ---
        session.commit()
        session.refresh(sale)

        return SaleRead(
            id=sale.id,
            sale_number=sale.sale_number,
            sale_date=sale.sale_date,
            customer_name=sale.customer_name,
            customer_phone=sale.customer_phone,
            customer_email=sale.customer_email,
            subtotal=sale.subtotal,
            discount_amount=sale.discount_amount,
            tax_amount=sale.tax_amount,
            total_amount=sale.total_amount,
            payment_method=sale.payment_method,
            payment_status=sale.payment_status,
            amount_paid=sale.amount_paid,
            notes=sale.notes,
            created_by=sale.created_by,
            created_at=sale.created_at,
            items=sale_item_reads,
        )

    @staticmethod
    def get_sale(session: Session, sale_id: UUID) -> SaleRead:
        sale = session.get(Sale, sale_id)
        if not sale:
            raise ValueError(f"Sale {sale_id} not found")
        return SaleService._to_read(session, sale)

    @staticmethod
    def list_sales(
        session: Session,
        skip: int = 0,
        limit: int = 100,
        customer_name: Optional[str] = None,
        payment_status: Optional[PaymentStatus] = None,
        start_date=None,
        end_date=None,
    ) -> List[SaleRead]:
        query = select(Sale)
        if customer_name:
            query = query.where(Sale.customer_name.ilike(f"%{customer_name}%"))  # type: ignore[attr-defined]
        if payment_status:
            query = query.where(Sale.payment_status == payment_status)
        if start_date:
            query = query.where(Sale.sale_date >= start_date)
        if end_date:
            query = query.where(Sale.sale_date <= end_date)

        sales = session.exec(
            query.order_by(Sale.sale_number.desc())  # type: ignore[attr-defined]
            .offset(skip)
            .limit(limit)
        ).all()

        return [SaleService._to_read(session, s) for s in sales]

    @staticmethod
    def _to_read(session: Session, sale: Sale) -> SaleRead:
        items = session.exec(
            select(SaleItem).where(SaleItem.sale_id == sale.id)
        ).all()
        return SaleRead(
            id=sale.id,
            sale_number=sale.sale_number,
            sale_date=sale.sale_date,
            customer_name=sale.customer_name,
            customer_phone=sale.customer_phone,
            customer_email=sale.customer_email,
            subtotal=sale.subtotal,
            discount_amount=sale.discount_amount,
            tax_amount=sale.tax_amount,
            total_amount=sale.total_amount,
            payment_method=sale.payment_method,
            payment_status=sale.payment_status,
            amount_paid=sale.amount_paid,
            notes=sale.notes,
            created_by=sale.created_by,
            created_at=sale.created_at,
            items=[
                SaleItemRead(
                    id=i.id,
                    product_id=i.product_id,
                    quantity=i.quantity,
                    unit_price=i.unit_price,
                    unit_cost=i.unit_cost,
                    discount_per_item=i.discount_per_item,
                    line_total=i.line_total,
                    created_at=i.created_at,
                )
                for i in items
            ],
        )
