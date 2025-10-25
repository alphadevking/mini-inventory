from fastapi import APIRouter, HTTPException, Depends, status
from sqlmodel import Session, select
from typing import List, Optional
from uuid import UUID

from ..database import get_session
from ..models import Product, ProductCreate, ProductUpdate, ProductCategory, ProductSubcategory, ProductReadWithStock

router = APIRouter(prefix="/products", tags=["products"])

@router.get("/test")
def test_products_endpoint(session: Session = Depends(get_session)):
    """Test endpoint to check database connectivity"""
    try:
        # Simple count query
        count = session.exec(select(Product)).all()
        return {"message": "Database connection successful", "product_count": len(count)}
    except Exception as e:
        return {"error": str(e), "message": "Database connection failed"}

@router.get("/search", response_model=List[ProductReadWithStock])
def search_products(
    q: str,
    skip: int = 0,
    limit: int = 50,
    session: Session = Depends(get_session)
):
    """Search products with a query string - optimized for search"""
    from sqlalchemy import or_

    # Create search query with case-insensitive search across multiple fields
    search_filter = or_(
        Product.name.ilike(f"%{q}%"),  # type: ignore - SQLAlchemy dynamic attribute
        Product.brand.ilike(f"%{q}%"),  # type: ignore - SQLAlchemy dynamic attribute
        Product.model.ilike(f"%{q}%"),  # type: ignore - SQLAlchemy dynamic attribute
        Product.sku.ilike(f"%{q}%"),  # type: ignore - SQLAlchemy dynamic attribute
        Product.supplier.ilike(f"%{q}%"),  # type: ignore - SQLAlchemy dynamic attribute
        Product.description.ilike(f"%{q}%"),  # type: ignore - SQLAlchemy dynamic attribute
        Product.barcode.ilike(f"%{q}%")  # type: ignore - SQLAlchemy dynamic attribute
    )

    query = select(Product).where(Product.is_active).where(search_filter)
    products = session.exec(query.offset(skip).limit(limit)).all()

    # Get all unique category and subcategory IDs
    category_ids = {p.category_id for p in products if p.category_id}
    subcategory_ids = {p.subcategory_id for p in products if p.subcategory_id}

    # Load all categories and subcategories in two queries
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

    # Convert to ProductReadWithStock with pre-loaded relationships
    result = []
    for product in products:
        product_data = ProductReadWithStock(
            id=product.id,
            name=product.name,
            category_id=product.category_id,
            subcategory_id=product.subcategory_id,
            brand=product.brand,
            model=product.model,
            sku=product.sku,
            barcode=product.barcode,
            dimensions=product.dimensions,
            weight=product.weight,
            weight_unit=product.weight_unit or "g",
            last_purchase_cost=product.last_purchase_cost,
            suggested_sell_price=product.suggested_sell_price,
            low_stock_threshold=product.low_stock_threshold,
            current_stock=product.current_stock,
            status=product.status,
            image_url=product.image_url,
            description=product.description,
            supplier=product.supplier,
            is_active=product.is_active,
            attributes=product.attributes or {},
            created_at=product.created_at,
            updated_at=product.updated_at,
            category=categories.get(str(product.category_id)) if product.category_id else None,
            subcategory=subcategories.get(str(product.subcategory_id)) if product.subcategory_id else None
        )
        result.append(product_data)

    return result

@router.get("/low-stock", response_model=List[ProductReadWithStock])
def get_low_stock_products(
    skip: int = 0,
    limit: int = 100,
    session: Session = Depends(get_session)
):
    """Get products that are at or below their low stock threshold"""
    # Get products that are at or below low stock threshold
    query = select(Product).where(
        Product.is_active,
        Product.current_stock <= Product.low_stock_threshold
    )

    products = session.exec(query.offset(skip).limit(limit)).all()

    # Get all unique category and subcategory IDs
    category_ids = {p.category_id for p in products if p.category_id}
    subcategory_ids = {p.subcategory_id for p in products if p.subcategory_id}

    # Load all categories and subcategories in two queries
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

    # Convert to ProductReadWithStock with pre-loaded relationships
    result = []
    for product in products:
        product_data = ProductReadWithStock(
            id=product.id,
            name=product.name,
            category_id=product.category_id,
            subcategory_id=product.subcategory_id,
            brand=product.brand,
            model=product.model,
            sku=product.sku,
            barcode=product.barcode,
            dimensions=product.dimensions,
            weight=product.weight,
            weight_unit=product.weight_unit or "g",
            last_purchase_cost=product.last_purchase_cost,
            suggested_sell_price=product.suggested_sell_price,
            low_stock_threshold=product.low_stock_threshold,
            current_stock=product.current_stock,
            status=product.status,
            image_url=product.image_url,
            description=product.description,
            supplier=product.supplier,
            is_active=product.is_active,
            attributes=product.attributes or {},
            created_at=product.created_at,
            updated_at=product.updated_at,
            category=categories.get(str(product.category_id)) if product.category_id else None,
            subcategory=subcategories.get(str(product.subcategory_id)) if product.subcategory_id else None
        )
        result.append(product_data)

    return result

@router.get("/", response_model=List[ProductReadWithStock])
def get_products(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    session: Session = Depends(get_session)
):
    """Get all products with category and subcategory information"""
    from sqlmodel import select

    # Get products first
    query = select(Product).where(Product.is_active)

    # Implement search functionality
    if search:
        from sqlalchemy import or_
        search_filter = or_(
            Product.name.ilike(f"%{search}%"),  # type: ignore - SQLAlchemy dynamic attribute
            Product.brand.ilike(f"%{search}%"),  # type: ignore - SQLAlchemy dynamic attribute
            Product.model.ilike(f"%{search}%"),  # type: ignore - SQLAlchemy dynamic attribute
            Product.sku.ilike(f"%{search}%"),  # type: ignore - SQLAlchemy dynamic attribute
            Product.supplier.ilike(f"%{search}%"),  # type: ignore - SQLAlchemy dynamic attribute
            Product.description.ilike(f"%{search}%")  # type: ignore - SQLAlchemy dynamic attribute
        )
        query = query.where(search_filter)

    products = session.exec(query.offset(skip).limit(limit)).all()

    # Get all unique category and subcategory IDs
    category_ids = {p.category_id for p in products if p.category_id}
    subcategory_ids = {p.subcategory_id for p in products if p.subcategory_id}

    # Load all categories and subcategories in two queries
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

    # Convert to ProductReadWithStock with pre-loaded relationships
    result = []
    for product in products:
        product_data = ProductReadWithStock(
            id=product.id,
            name=product.name,
            category_id=product.category_id,
            subcategory_id=product.subcategory_id,
            brand=product.brand,
            model=product.model,
            sku=product.sku,
            barcode=product.barcode,
            dimensions=product.dimensions,
            weight=product.weight,
            weight_unit=product.weight_unit or "g",
            last_purchase_cost=product.last_purchase_cost,
            suggested_sell_price=product.suggested_sell_price,
            low_stock_threshold=product.low_stock_threshold,
            current_stock=product.current_stock,
            status=product.status,
            image_url=product.image_url,
            description=product.description,
            supplier=product.supplier,
            is_active=product.is_active,
            attributes=product.attributes or {},
            created_at=product.created_at,
            updated_at=product.updated_at,
            category=categories.get(str(product.category_id)) if product.category_id else None,
            subcategory=subcategories.get(str(product.subcategory_id)) if product.subcategory_id else None
        )
        result.append(product_data)

    return result

@router.post("/", response_model=Product, status_code=status.HTTP_201_CREATED)
def create_product(product: ProductCreate, session: Session = Depends(get_session)):
    """Create a new product"""
    db_product = Product.from_orm(product)
    session.add(db_product)
    session.commit()
    session.refresh(db_product)
    return db_product

@router.get("/id/{product_id}", response_model=ProductReadWithStock)
def get_product(product_id: UUID, session: Session = Depends(get_session)):
    """Get a specific product by ID with category and subcategory information"""
    product = session.get(Product, product_id)
    if not product or not product.is_active:
        raise HTTPException(status_code=404, detail="Product not found")

    # Load category and subcategory relationships
    category = None
    subcategory = None

    if product.category_id:
        category = session.get(ProductCategory, product.category_id)
    if product.subcategory_id:
        subcategory = session.get(ProductSubcategory, product.subcategory_id)

    # Create ProductReadWithStock object
    product_data = ProductReadWithStock(
        id=product.id,
        name=product.name,
        category_id=product.category_id,
        subcategory_id=product.subcategory_id,
        brand=product.brand,
        model=product.model,
        sku=product.sku,
        barcode=product.barcode,
        dimensions=product.dimensions,
        weight=product.weight,
        weight_unit=product.weight_unit,
        last_purchase_cost=product.last_purchase_cost,
        suggested_sell_price=product.suggested_sell_price,
        low_stock_threshold=product.low_stock_threshold,
        current_stock=product.current_stock,
        status=product.status,
        image_url=product.image_url,
        description=product.description,
        is_active=product.is_active,
        attributes=product.attributes,
        created_at=product.created_at,
        updated_at=product.updated_at,
        category=category,
        subcategory=subcategory
    )

    return product_data

@router.put("/id/{product_id}", response_model=Product)
def update_product(
    product_id: UUID,
    product_update: ProductUpdate,
    session: Session = Depends(get_session)
):
    """Update a product"""
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    update_data = product_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(product, field, value)

    session.add(product)
    session.commit()
    session.refresh(product)

    # Load category and subcategory relationships
    if product.category_id:
        product.category = session.get(ProductCategory, product.category_id)
    if product.subcategory_id:
        product.subcategory = session.get(ProductSubcategory, product.subcategory_id)

    return product

@router.delete("/id/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: UUID, session: Session = Depends(get_session)):
    """Soft delete a product (set is_active to False)"""
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    product.is_active = False
    session.add(product)
    session.commit()
