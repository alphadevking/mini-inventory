from sqlmodel import Session, select
from typing import List, Tuple
from uuid import UUID

from ..models import Product, Transaction, TransactionType, RepairPart

class StockService:
    @staticmethod
    def calculate_stock_levels(session: Session, product_id: UUID) -> Tuple[int, str]:
        """Calculate current stock level for a product"""
        # Get the product first to check its current_stock field
        product = session.get(Product, product_id)
        if not product:
            return 0, "NOT_FOUND"

        # Start with the static current_stock field
        base_stock = product.current_stock or 0

        # Get all purchases
        purchases = session.exec(
            select(Transaction).where(
                Transaction.product_id == product_id,
                Transaction.transaction_type == TransactionType.purchase
            )
        ).all()

        # Get all sales
        sales = session.exec(
            select(Transaction).where(
                Transaction.product_id == product_id,
                Transaction.transaction_type == TransactionType.sale
            )
        ).all()

        # Get parts used in repairs
        repair_parts = session.exec(
            select(RepairPart).where(RepairPart.product_id == product_id)
        ).all()

        # Calculate totals from transactions
        total_purchased = sum(t.quantity for t in purchases)
        total_sold = sum(t.quantity for t in sales)
        total_used_in_repairs = sum(rp.quantity_used for rp in repair_parts)

        # Calculate current stock: base_stock + purchases - sales - repairs
        current_stock = base_stock + total_purchased - total_sold - total_used_in_repairs

        # Determine status based on threshold
        status = "LOW" if current_stock <= product.low_stock_threshold else "OK"

        return current_stock, status

    @staticmethod
    def check_stock_availability(session: Session, product_id: UUID, requested_quantity: int) -> bool:
        """Check if enough stock is available for a transaction"""
        current_stock, _ = StockService.calculate_stock_levels(session, product_id)
        return current_stock >= requested_quantity

    @staticmethod
    def get_low_stock_products(session: Session) -> List[Product]:
        """Get all products that are low on stock"""
        products = session.exec(select(Product).where(Product.is_active)).all()
        low_stock_products = []

        for product in products:
            current_stock, status = StockService.calculate_stock_levels(session, product.id)
            if status == "LOW":
                low_stock_products.append(product)

        return low_stock_products

    @staticmethod
    def update_product_stock(session: Session, product_id: UUID) -> None:
        """Update the product's current_stock field based on transactions"""
        current_stock, _ = StockService.calculate_stock_levels(session, product_id)

        product = session.get(Product, product_id)
        if product:
            product.current_stock = current_stock
            session.add(product)
            session.commit()
