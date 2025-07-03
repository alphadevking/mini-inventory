# main.py
# FastAPI app entry point (to be implemented)

from typing import List
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select, func
from datetime import datetime
from uuid import UUID
from sqlalchemy import desc

from .database import get_session
from .models import (
    Product, ProductCreate, ProductUpdate, ProductReadWithStock,
    Transaction, TransactionCreate, TransactionType, FinancialSummary
)

app = FastAPI(
    title="Mini Inventory API",
    description="API for managing phone repair parts inventory, expenses, and profits.",
    version="1.0.0",
    root_path="/api"
)

# CORS configuration
origins = [
    "http://localhost:5173",
    "http://localhost:9000",
    "http://127.0.0.1:9000",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "*"  # For development only
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def calculate_product_stock_and_status(product: Product, session: Session) -> dict:
    purchases = session.exec(
        select(func.sum(Transaction.quantity)).where(
            Transaction.product_id == product.id,
            Transaction.transaction_type == TransactionType.purchase
        )
    ).first() or 0
    sales = session.exec(
        select(func.sum(Transaction.quantity)).where(
            Transaction.product_id == product.id,
            Transaction.transaction_type == TransactionType.sale
        )
    ).first() or 0
    current_stock = purchases - sales
    status_text = "LOW" if current_stock <= product.low_stock_threshold else "OK"
    return {"current_stock": current_stock, "status": status_text}

@app.get("/")
def root():
    return {"message": "Welcome to the Mini Inventory API!"}

# --- Products Endpoints ---
@app.post("/products/", response_model=Product)
def create_product(*, session: Session = Depends(get_session), product: ProductCreate):
    db_product = Product.model_validate(product)
    session.add(db_product)
    session.commit()
    session.refresh(db_product)
    return db_product

@app.get("/products/", response_model=List[ProductReadWithStock])
def read_products(*, session: Session = Depends(get_session)):
    products = session.exec(select(Product)).all()
    products_with_stock = []
    for product in products:
        stock_data = calculate_product_stock_and_status(product, session)
        products_with_stock.append(ProductReadWithStock.model_validate(product.model_dump() | stock_data))
    return products_with_stock

@app.get("/products/{product_id}", response_model=ProductReadWithStock)
def read_product_by_id(*, session: Session = Depends(get_session), product_id: UUID):
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    stock_data = calculate_product_stock_and_status(product, session)
    return ProductReadWithStock.model_validate(product.model_dump() | stock_data)

@app.put("/products/{product_id}", response_model=Product)
def update_product(*, session: Session = Depends(get_session), product_id: UUID, product: ProductUpdate):
    db_product = session.get(Product, product_id)
    if not db_product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    product_data = product.model_dump(exclude_unset=True)
    for key, value in product_data.items():
        setattr(db_product, key, value)
    db_product.updated_at = datetime.utcnow()
    session.add(db_product)
    session.commit()
    session.refresh(db_product)
    return db_product

@app.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(*, session: Session = Depends(get_session), product_id: UUID):
    existing_transactions = session.exec(select(Transaction).where(Transaction.product_id == product_id)).first()
    if existing_transactions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete product with existing transactions. Delete transactions first or archive product instead."
        )
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    session.delete(product)
    session.commit()
    return {"ok": True}

@app.get("/products/low-stock/", response_model=List[ProductReadWithStock])
def get_low_stock_products(*, session: Session = Depends(get_session)):
    products = session.exec(select(Product)).all()
    low_stock_items = []
    for product in products:
        stock_data = calculate_product_stock_and_status(product, session)
        if stock_data["status"] == "LOW":
            low_stock_items.append(ProductReadWithStock.model_validate(product.model_dump() | stock_data))
    return low_stock_items

# --- Transactions Endpoints ---
@app.post("/transactions/", response_model=Transaction)
def create_transaction(*, session: Session = Depends(get_session), transaction: TransactionCreate):
    product = session.get(Product, transaction.product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found for this transaction.")
    db_transaction = Transaction.model_validate(transaction)
    session.add(db_transaction)
    session.commit()
    session.refresh(db_transaction)
    return db_transaction

@app.get("/transactions/", response_model=List[Transaction])
def read_transactions(*, session: Session = Depends(get_session)):
    transactions = session.exec(
        select(Transaction).order_by(
            desc(getattr(Transaction, 'transaction_date')),
            desc(getattr(Transaction, 'created_at'))
        )
    ).all()
    return transactions

@app.get("/transactions/{transaction_id}", response_model=Transaction)
def read_transaction_by_id(*, session: Session = Depends(get_session), transaction_id: UUID):
    transaction = session.get(Transaction, transaction_id)
    if not transaction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")
    return transaction

@app.delete("/transactions/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(*, session: Session = Depends(get_session), transaction_id: UUID):
    transaction = session.get(Transaction, transaction_id)
    if not transaction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")
    session.delete(transaction)
    session.commit()
    return {"ok": True}

# --- Financial Summary Endpoint ---
@app.get("/summary/", response_model=FinancialSummary)
def get_financial_summary(*, session: Session = Depends(get_session)):
    total_revenue = session.exec(
        select(func.sum(func.coalesce(Transaction.unit_price, 0) * Transaction.quantity)).where(
            Transaction.transaction_type == TransactionType.sale
        )
    ).first() or 0.0
    cogs_query = select(func.sum(func.coalesce(Product.last_purchase_cost, 0) * Transaction.quantity)).select_from(Transaction).join(Product).where(
        Transaction.transaction_type == TransactionType.sale
    )
    total_cogs = session.exec(cogs_query).first() or 0.0
    total_gross_profit = total_revenue - total_cogs
    total_transport_other_costs = session.exec(
        select(func.sum(Transaction.transport_other_cost)).where(
            Transaction.transaction_type == TransactionType.purchase
        )
    ).first() or 0.0
    net_profit = total_gross_profit - total_transport_other_costs
    return FinancialSummary(
        total_revenue=total_revenue,
        total_cogs=total_cogs,
        total_gross_profit=total_gross_profit,
        total_transport_other_costs=total_transport_other_costs,
        net_profit=net_profit
    )