from fastapi import APIRouter, HTTPException, Depends, status
from sqlmodel import Session, select
from typing import List
from uuid import UUID
from sqlalchemy import text

from ..database import get_session
from ..models import (
    ProductCategory, ProductSubcategory, ProductAttributeDefinition,
    ProductCategoryCreate, ProductCategoryUpdate,
    ProductSubcategoryCreate, ProductSubcategoryUpdate,
    ProductAttributeDefinitionCreate, ProductAttributeDefinitionUpdate
)

router = APIRouter(prefix="/categories", tags=["categories"])

# --- Category Management ---
@router.get("/", response_model=List[ProductCategory])
def get_categories(session: Session = Depends(get_session)):
    """Get all product categories"""
    categories = session.exec(select(ProductCategory).where(ProductCategory.is_active)).all()
    return categories

@router.post("/", response_model=ProductCategory, status_code=status.HTTP_201_CREATED)
def create_category(category: ProductCategoryCreate, session: Session = Depends(get_session)):
    """Create a new product category"""
    # Check if category name already exists
    existing = session.exec(select(ProductCategory).where(ProductCategory.name == category.name)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Category name already exists")

    db_category = ProductCategory(**category.dict())
    session.add(db_category)
    session.commit()
    session.refresh(db_category)
    return db_category

# --- Subcategory Management (moved before /{category_id} to avoid conflicts) ---
@router.get("/subcategories", response_model=List[ProductSubcategory])
def get_all_subcategories(session: Session = Depends(get_session)):
    """Get all subcategories"""
    subcategories = session.exec(
        select(ProductSubcategory)
        .where(ProductSubcategory.is_active)
    ).all()
    return subcategories

@router.get("/subcategories/{subcategory_id}", response_model=ProductSubcategory)
def get_subcategory(subcategory_id: UUID, session: Session = Depends(get_session)):
    """Get a specific subcategory by ID"""
    subcategory = session.get(ProductSubcategory, subcategory_id)
    if not subcategory:
        raise HTTPException(status_code=404, detail="Subcategory not found")
    return subcategory

@router.get("/{category_id}", response_model=ProductCategory)
def get_category(category_id: UUID, session: Session = Depends(get_session)):
    """Get a specific category by ID"""
    category = session.get(ProductCategory, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category

@router.put("/{category_id}", response_model=ProductCategory)
def update_category(
    category_id: UUID,
    category_update: ProductCategoryUpdate,
    session: Session = Depends(get_session)
):
    """Update a category"""
    category = session.get(ProductCategory, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    update_data = category_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(category, field, value)

    session.add(category)
    session.commit()
    session.refresh(category)
    return category

@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(category_id: UUID, session: Session = Depends(get_session)):
    """Delete a category (soft delete)"""
    category = session.get(ProductCategory, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    # Soft delete
    category.is_active = False
    session.add(category)
    session.commit()

# --- Subcategory Management (continued) ---
@router.get("/{category_id}/subcategories", response_model=List[ProductSubcategory])
def get_subcategories(category_id: UUID, session: Session = Depends(get_session)):
    """Get all subcategories for a specific category"""
    subcategories = session.exec(
        select(ProductSubcategory)
        .where(ProductSubcategory.category_id == category_id)
        .where(ProductSubcategory.is_active)
    ).all()
    return subcategories

@router.post("/{category_id}/subcategories", response_model=ProductSubcategory, status_code=status.HTTP_201_CREATED)
def create_subcategory(
    category_id: UUID,
    subcategory: ProductSubcategoryCreate,
    session: Session = Depends(get_session)
):
    """Create a new subcategory"""
    # Verify category exists
    category = session.get(ProductCategory, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    # Check if subcategory name already exists in this category
    existing = session.exec(
        select(ProductSubcategory)
        .where(ProductSubcategory.category_id == category_id)
        .where(ProductSubcategory.name == subcategory.name)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Subcategory name already exists in this category")

    db_subcategory = ProductSubcategory(**subcategory.dict())
    session.add(db_subcategory)
    session.commit()
    session.refresh(db_subcategory)
    return db_subcategory

@router.put("/subcategories/{subcategory_id}", response_model=ProductSubcategory)
def update_subcategory(
    subcategory_id: UUID,
    subcategory_update: ProductSubcategoryUpdate,
    session: Session = Depends(get_session)
):
    """Update a subcategory"""
    subcategory = session.get(ProductSubcategory, subcategory_id)
    if not subcategory:
        raise HTTPException(status_code=404, detail="Subcategory not found")

    update_data = subcategory_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(subcategory, field, value)

    session.add(subcategory)
    session.commit()
    session.refresh(subcategory)
    return subcategory

@router.delete("/subcategories/{subcategory_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_subcategory(subcategory_id: UUID, session: Session = Depends(get_session)):
    """Delete a subcategory (soft delete)"""
    subcategory = session.get(ProductSubcategory, subcategory_id)
    if not subcategory:
        raise HTTPException(status_code=404, detail="Subcategory not found")

    # Soft delete
    subcategory.is_active = False
    session.add(subcategory)
    session.commit()

# --- Attribute Definition Management ---
@router.get("/subcategories/{subcategory_id}/attributes", response_model=List[ProductAttributeDefinition])
def get_attribute_definitions(subcategory_id: UUID, session: Session = Depends(get_session)):
    """Get all attribute definitions for a specific subcategory"""
    attributes = session.exec(
        select(ProductAttributeDefinition)
        .where(ProductAttributeDefinition.subcategory_id == subcategory_id)
        .where(ProductAttributeDefinition.is_active)
    ).all()
    return attributes

@router.post("/subcategories/{subcategory_id}/attributes", response_model=ProductAttributeDefinition, status_code=status.HTTP_201_CREATED)
def create_attribute_definition(
    subcategory_id: UUID,
    attribute: ProductAttributeDefinitionCreate,
    session: Session = Depends(get_session)
):
    """Create a new attribute definition"""
    # Verify subcategory exists
    subcategory = session.get(ProductSubcategory, subcategory_id)
    if not subcategory:
        raise HTTPException(status_code=404, detail="Subcategory not found")

    # Check if attribute name already exists in this subcategory
    existing = session.exec(
        select(ProductAttributeDefinition)
        .where(ProductAttributeDefinition.subcategory_id == subcategory_id)
        .where(ProductAttributeDefinition.name == attribute.name)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Attribute name already exists in this subcategory")

    db_attribute = ProductAttributeDefinition(**attribute.dict())
    session.add(db_attribute)
    session.commit()
    session.refresh(db_attribute)
    return db_attribute

@router.put("/attributes/{attribute_id}", response_model=ProductAttributeDefinition)
def update_attribute_definition(
    attribute_id: UUID,
    attribute_update: ProductAttributeDefinitionUpdate,
    session: Session = Depends(get_session)
):
    """Update an attribute definition"""
    attribute = session.get(ProductAttributeDefinition, attribute_id)
    if not attribute:
        raise HTTPException(status_code=404, detail="Attribute definition not found")

    update_data = attribute_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(attribute, field, value)

    session.add(attribute)
    session.commit()
    session.refresh(attribute)
    return attribute

@router.delete("/attributes/{attribute_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_attribute_definition(attribute_id: UUID, session: Session = Depends(get_session)):
    """Delete an attribute definition (soft delete)"""
    attribute = session.get(ProductAttributeDefinition, attribute_id)
    if not attribute:
        raise HTTPException(status_code=404, detail="Attribute definition not found")

    # Soft delete
    attribute.is_active = False
    session.add(attribute)
    session.commit()

# --- Initialization ---
@router.post("/initialize", response_model=dict, status_code=status.HTTP_201_CREATED)
def initialize_default_categories(session: Session = Depends(get_session)):
    """Initialize the database with default gadget categories and subcategories"""
    # Check if categories already exist
    existing_categories = session.exec(select(ProductCategory)).all()
    if existing_categories:
        raise HTTPException(status_code=400, detail="Categories already initialized")

    # Default gadget categories with their subcategories
    categories_data = [
        {
            "name": "Smartphones",
            "description": "Mobile phones and accessories",
            "icon": "📱",
            "color": "#3B82F6",
            "subcategories": [
                {"name": "iPhone", "description": "Apple smartphones", "icon": "🍎"},
                {"name": "Samsung", "description": "Samsung Galaxy series", "icon": "📱"},
                {"name": "Google Pixel", "description": "Google Pixel phones", "icon": "🔍"},
                {"name": "OnePlus", "description": "OnePlus smartphones", "icon": "➕"},
                {"name": "Accessories", "description": "Phone cases, chargers, etc.", "icon": "🔌"}
            ]
        },
        {
            "name": "Laptops",
            "description": "Portable computers and accessories",
            "icon": "💻",
            "color": "#10B981",
            "subcategories": [
                {"name": "MacBook", "description": "Apple laptops", "icon": "🍎"},
                {"name": "Windows Laptops", "description": "Windows-based laptops", "icon": "🪟"},
                {"name": "Gaming Laptops", "description": "High-performance gaming laptops", "icon": "🎮"},
                {"name": "Business Laptops", "description": "Professional business laptops", "icon": "💼"},
                {"name": "Accessories", "description": "Laptop bags, mice, keyboards", "icon": "🖱️"}
            ]
        },
        {
            "name": "Tablets",
            "description": "Tablet devices and accessories",
            "icon": "📱",
            "color": "#F59E0B",
            "subcategories": [
                {"name": "iPad", "description": "Apple tablets", "icon": "🍎"},
                {"name": "Android Tablets", "description": "Android-based tablets", "icon": "🤖"},
                {"name": "Windows Tablets", "description": "Windows tablets and 2-in-1s", "icon": "🪟"},
                {"name": "Accessories", "description": "Tablet cases, stylus, keyboards", "icon": "✏️"}
            ]
        },
        {
            "name": "Audio Devices",
            "description": "Headphones, speakers, and audio equipment",
            "icon": "🎧",
            "color": "#8B5CF6",
            "subcategories": [
                {"name": "Headphones", "description": "Over-ear and on-ear headphones", "icon": "🎧"},
                {"name": "Earbuds", "description": "In-ear wireless earbuds", "icon": "🎵"},
                {"name": "Speakers", "description": "Bluetooth and wired speakers", "icon": "🔊"},
                {"name": "Audio Accessories", "description": "Cables, adapters, stands", "icon": "🔌"}
            ]
        },
        {
            "name": "Gaming",
            "description": "Gaming consoles, controllers, and accessories",
            "icon": "🎮",
            "color": "#06B6D4",
            "subcategories": [
                {"name": "Consoles", "description": "Gaming consoles", "icon": "🎮"},
                {"name": "Controllers", "description": "Gaming controllers and pads", "icon": "🕹️"},
                {"name": "PC Gaming", "description": "PC gaming accessories", "icon": "🖥️"},
                {"name": "VR Equipment", "description": "Virtual reality headsets and accessories", "icon": "🥽"}
            ]
        },
        {
            "name": "Wearables",
            "description": "Smartwatches, fitness trackers, and wearable tech",
            "icon": "⌚",
            "color": "#EF4444",
            "subcategories": [
                {"name": "Smartwatches", "description": "Apple Watch, Samsung Galaxy Watch", "icon": "⌚"},
                {"name": "Fitness Trackers", "description": "Fitbit, Garmin fitness devices", "icon": "🏃"},
                {"name": "Health Monitors", "description": "Health monitoring devices", "icon": "❤️"},
                {"name": "Accessories", "description": "Bands, chargers, cases", "icon": "🔗"}
            ]
        }
    ]

    created_categories = []
    created_subcategories = []

    for cat_data in categories_data:
        # Create category
        category = ProductCategory(
            name=cat_data["name"],
            description=cat_data["description"],
            icon=cat_data["icon"],
            color=cat_data["color"]
        )
        session.add(category)
        session.flush()  # Get the ID

        created_categories.append(category)

        # Create subcategories for this category
        for subcat_data in cat_data["subcategories"]:
            subcategory = ProductSubcategory(
                name=subcat_data["name"],
                description=subcat_data["description"],
                icon=subcat_data["icon"],
                category_id=category.id
            )
            session.add(subcategory)
            created_subcategories.append(subcategory)

    session.commit()

    return {
        "message": "Successfully initialized gadget categories and subcategories",
        "categories_created": len(created_categories),
        "subcategories_created": len(created_subcategories),
        "categories": [{"id": str(cat.id), "name": cat.name} for cat in created_categories]
    }

@router.post("/reset", status_code=status.HTTP_200_OK)
def reset_categories(session: Session = Depends(get_session)):
    """Reset all categories and subcategories (for development/testing)"""
    # Delete all subcategories first (foreign key constraint)
    session.query(ProductSubcategory).delete()

    # Delete all categories
    session.query(ProductCategory).delete()

    # Reset any products that reference these categories
    session.execute(text("UPDATE product SET category_id = NULL, subcategory_id = NULL"))

    session.commit()

    return {"message": "All categories and subcategories have been reset"}

# --- Utility Endpoints ---
@router.get("/{category_id}/full", response_model=dict)
def get_category_with_subcategories(category_id: UUID, session: Session = Depends(get_session)):
    """Get a category with all its subcategories and attribute definitions"""
    category = session.get(ProductCategory, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    subcategories = session.exec(
        select(ProductSubcategory)
        .where(ProductSubcategory.category_id == category_id)
        .where(ProductSubcategory.is_active)
    ).all()

    result = {
        "id": str(category.id),
        "name": category.name,
        "description": category.description,
        "icon": category.icon,
        "color": category.color,
        "subcategories": []
    }

    for subcat in subcategories:
        attributes = session.exec(
            select(ProductAttributeDefinition)
            .where(ProductAttributeDefinition.subcategory_id == subcat.id)
            .where(ProductAttributeDefinition.is_active)
        ).all()

        subcat_data = {
            "id": str(subcat.id),
            "name": subcat.name,
            "description": subcat.description,
            "icon": subcat.icon,
            "attributes": [
                {
                    "id": str(attr.id),
                    "name": attr.name,
                    "display_name": attr.display_name,
                    "data_type": attr.data_type,
                    "required": attr.required,
                    "default_value": attr.default_value,
                    "options": attr.options,
                    "unit": attr.unit,
                    "order": attr.order
                }
                for attr in attributes
            ]
        }
        result["subcategories"].append(subcat_data)

    return result
