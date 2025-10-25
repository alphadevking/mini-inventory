from typing import List, Optional, Sequence
from uuid import UUID
from fastapi import HTTPException, status
from sqlmodel import Session, select
from ..models import Sale, SaleCreate, SaleUpdate, RepairPaymentStatus, Product

def create_sale(session: Session, sale_in: SaleCreate) -> Sale:
    product = session.get(Product, sale_in.product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found for this sale.")

    # Update product quantity
    if product.quantity < sale_in.quantity:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Not enough stock for this sale.")
    product.quantity -= sale_in.quantity
    session.add(product)

    db_sale = Sale.model_validate(sale_in)
    session.add(db_sale)
    session.commit()
    session.refresh(db_sale)
    session.refresh(product) # Refresh product to reflect quantity change
    return db_sale

def get_all_sales(session: Session) -> Sequence[Sale]:
    sales = session.exec(select(Sale)).all()
    return sales

def get_sale_by_id(session: Session, sale_id: UUID) -> Optional[Sale]:
    sale = session.get(Sale, sale_id)
    return sale

def update_sale(session: Session, sale_id: UUID, sale_in: SaleUpdate) -> Sale:
    db_sale = session.get(Sale, sale_id)
    if not db_sale:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sale not found")

    # Handle quantity change if updated
    if sale_in.quantity is not None and sale_in.quantity != db_sale.quantity:
        product = session.get(Product, db_sale.product_id)
        if not product:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found for this sale.")

        quantity_difference = sale_in.quantity - db_sale.quantity
        if product.quantity < quantity_difference:
             raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Not enough stock for this updated sale quantity.")

        product.quantity -= quantity_difference
        session.add(product)

    sale_data = sale_in.model_dump(exclude_unset=True)
    for key, value in sale_data.items():
        setattr(db_sale, key, value)
    session.add(db_sale)
    session.commit()
    session.refresh(db_sale)
    if 'product' in locals(): # Refresh product if it was modified
        session.refresh(product)
    return db_sale

def delete_sale(session: Session, sale_id: UUID):
    sale = session.get(Sale, sale_id)
    if not sale:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sale not found")

    # Return quantity to product stock
    product = session.get(Product, sale.product_id)
    if product:
        product.quantity += sale.quantity
        session.add(product)

    session.delete(sale)
    session.commit()
    if product:
        session.refresh(product) # Refresh product to reflect quantity change
    return {"ok": True}

def get_debtor_sales(session: Session) -> Sequence[Sale]:
    debtor_sales = session.exec(
        select(Sale).where(Sale.payment_status == RepairPaymentStatus.pending)
    ).all()
    return debtor_sales