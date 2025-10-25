from fastapi import APIRouter, HTTPException, Depends, status
from sqlmodel import Session, select
from typing import List, Optional
from uuid import UUID
from datetime import date

from ..database import get_session
from ..models import (
    Transaction, TransactionCreate, TransactionUpdate, TransactionRead,
    Product, ProductCategory, ProductSubcategory, TransactionType
)

router = APIRouter(prefix="/transactions", tags=["transactions"])

@router.get("/", response_model=List[TransactionRead])
def get_transactions(
    skip: int = 0,
    limit: int = 100,
    transaction_type: Optional[TransactionType] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    session: Session = Depends(get_session)
):
    """Get all transactions with optional filtering"""
    query = select(Transaction)

    if transaction_type:
        query = query.where(Transaction.transaction_type == transaction_type)

    if start_date:
        query = query.where(Transaction.transaction_date >= start_date)

    if end_date:
        query = query.where(Transaction.transaction_date <= end_date)

    transactions = session.exec(query.offset(skip).limit(limit)).all()

    # Get all unique product IDs
    product_ids = {t.product_id for t in transactions}

    # Load all products with their relationships in batch
    products = {}
    if product_ids:
        products_query = select(Product).where(Product.id.in_(list(product_ids)))  # type: ignore
        for product in session.exec(products_query):
            products[str(product.id)] = product

    # Load categories and subcategories for all products
    category_ids = {p.category_id for p in products.values() if p.category_id}
    subcategory_ids = {p.subcategory_id for p in products.values() if p.subcategory_id}

    categories = {}
    if category_ids:
        categories_query = select(ProductCategory).where(ProductCategory.id.in_(list(category_ids)))  # type: ignore
        for cat in session.exec(categories_query):
            categories[str(cat.id)] = cat

    subcategories = {}
    if subcategory_ids:
        subcategories_query = select(ProductSubcategory).where(ProductSubcategory.id.in_(list(subcategory_ids)))  # type: ignore
        for subcat in session.exec(subcategories_query):
            subcategories[str(subcat.id)] = subcat

    # Attach relationships to products
    for product in products.values():
        if product.category_id:
            product.category = categories.get(str(product.category_id))
        if product.subcategory_id:
            product.subcategory = subcategories.get(str(product.subcategory_id))

    # Convert to TransactionRead with pre-loaded relationships
    result = []
    for transaction in transactions:
        product = products.get(str(transaction.product_id))
        result.append(TransactionRead(
            **transaction.dict(),
            product=product
        ))

    return result

@router.post("/", response_model=Transaction, status_code=status.HTTP_201_CREATED)
def create_transaction(transaction: TransactionCreate, session: Session = Depends(get_session)):
    """Create a new transaction"""
    # Validate product exists
    product = session.get(Product, transaction.product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # For sales, check if enough stock is available
    if transaction.transaction_type == TransactionType.sale:
        from ..services.stock_service import StockService

        if not StockService.check_stock_availability(session, transaction.product_id, transaction.quantity):
            current_stock, _ = StockService.calculate_stock_levels(session, transaction.product_id)
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock. Available: {current_stock}, Requested: {transaction.quantity}"
            )

    db_transaction = Transaction.from_orm(transaction)
    session.add(db_transaction)
    session.commit()
    session.refresh(db_transaction)

    # Update the product's current_stock field
    from ..services.stock_service import StockService
    StockService.update_product_stock(session, transaction.product_id)

    return db_transaction

@router.get("/{transaction_id}", response_model=TransactionRead)
def get_transaction(transaction_id: UUID, session: Session = Depends(get_session)):
    """Get a specific transaction by ID"""
    transaction = session.get(Transaction, transaction_id)
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    # Load product with relationships
    product = session.get(Product, transaction.product_id)
    if product:
        # Load category and subcategory
        if product.category_id:
            product.category = session.get(ProductCategory, product.category_id)
        if product.subcategory_id:
            product.subcategory = session.get(ProductSubcategory, product.subcategory_id)

    return TransactionRead(**transaction.dict(), product=product)

@router.put("/{transaction_id}", response_model=Transaction)
def update_transaction(
    transaction_id: UUID,
    transaction_update: TransactionUpdate,
    session: Session = Depends(get_session)
):
    """Update a transaction"""
    transaction = session.get(Transaction, transaction_id)
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    update_data = transaction_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(transaction, field, value)

    session.add(transaction)
    session.commit()
    session.refresh(transaction)

    # Update the product's current_stock field
    from ..services.stock_service import StockService
    StockService.update_product_stock(session, transaction.product_id)

    return transaction

@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(transaction_id: UUID, session: Session = Depends(get_session)):
    """Delete a transaction"""
    transaction = session.get(Transaction, transaction_id)
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    # Store product_id before deleting
    product_id = transaction.product_id

    session.delete(transaction)
    session.commit()

    # Update the product's current_stock field
    from ..services.stock_service import StockService
    StockService.update_product_stock(session, product_id)
