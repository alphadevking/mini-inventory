from typing import List
from uuid import UUID
from fastapi import HTTPException, status
from sqlmodel import Session, select
from datetime import datetime

from ..models import Product, ProductCreate, ProductUpdate, ProductReadWithStock

def calculate_product_stock_and_status(product: Product, session: Session) -> dict:
    current_stock = product.quantity
    status_text = "LOW" if current_stock <= product.min_threshold else "OK"
    return {"current_stock": current_stock, "status": status_text}

def create_product(session: Session, product_in: ProductCreate) -> Product:
    db_product = Product.model_validate(product_in)
    session.add(db_product)
    session.commit()
    session.refresh(db_product)
    return db_product

def get_all_products(session: Session) -> List[ProductReadWithStock]:
    products = session.exec(select(Product)).all()
    products_with_stock = []
    for product in products:
        stock_data = calculate_product_stock_and_status(product, session)
        products_with_stock.append(ProductReadWithStock.model_validate(product.model_dump() | stock_data))
    return products_with_stock

def get_product_by_id(session: Session, product_id: UUID) -> ProductReadWithStock:
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    stock_data = calculate_product_stock_and_status(product, session)
    return ProductReadWithStock.model_validate(product.model_dump() | stock_data)

def update_product(session: Session, product_id: UUID, product_in: ProductUpdate) -> Product:
    db_product = session.get(Product, product_id)
    if not db_product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    product_data = product_in.model_dump(exclude_unset=True)
    for key, value in product_data.items():
        setattr(db_product, key, value)
    db_product.updated_at = datetime.utcnow()
    session.add(db_product)
    session.commit()
    session.refresh(db_product)
    return db_product

def delete_product(session: Session, product_id: UUID):
    # No longer checking for ItemTransaction as it's replaced by Sale.
    # Sales will decrease product.quantity directly.
    # If a product has associated sales, its quantity will be impacted.
    # We allow deletion of products, but recommend archiving or setting quantity to 0
    # if there are historical sales data tied to it.

    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    session.delete(product)
    session.commit()
    return {"ok": True}

def get_low_stock_products(session: Session) -> List[ProductReadWithStock]:
    products = session.exec(select(Product)).all()
    low_stock_items = []
    for product in products:
        stock_data = calculate_product_stock_and_status(product, session)
        if stock_data["status"] == "LOW":
            low_stock_items.append(ProductReadWithStock.model_validate(product.model_dump() | stock_data))
    return low_stock_items