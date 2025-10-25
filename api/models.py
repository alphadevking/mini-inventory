# models.py
# SQLModel models for comprehensive phone repair shop management system
from datetime import date, datetime
from typing import Optional, List, Dict, Any
from uuid import UUID, uuid4
from sqlmodel import Field, SQLModel, Relationship, Column, Enum
import sqlalchemy as sa
import enum

# --- Enums ---
class TransactionType(str, enum.Enum):
    purchase = "purchase"
    sale = "sale"

class RepairStatus(str, enum.Enum):
    pending = "pending"
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"

class PaymentStatus(str, enum.Enum):
    paid = "paid"
    pending = "pending"
    partial = "partial"

class ReturnAction(str, enum.Enum):
    refund = "refund"
    repair = "repair"
    exchange = "exchange"
    replacement = "replacement"

class ReturnStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    resolved = "resolved"

class ExpenseCategory(str, enum.Enum):
    rent = "rent"
    utilities = "utilities"
    supplies = "supplies"
    equipment = "equipment"
    marketing = "marketing"
    salary = "salary"
    other = "other"

class UserRole(str, enum.Enum):
    admin = "admin"
    manager = "manager"
    technician = "technician"
    cashier = "cashier"

# --- User Models (for future auth) ---
class UserBase(SQLModel):
    username: str = Field(unique=True, index=True)
    email: str = Field(unique=True, index=True)
    full_name: str
    role: UserRole = Field(default=UserRole.cashier)
    is_active: bool = Field(default=True)

class User(UserBase, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    hashed_password: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None

class UserCreate(SQLModel):
    username: str
    email: str
    full_name: str
    password: str
    role: UserRole = Field(default=UserRole.cashier)

class UserUpdate(SQLModel):
    username: Optional[str] = None
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None

# --- Product Models ---
class ProductCategory(SQLModel, table=True):
    """Dynamic product categories that users can create"""
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str = Field(unique=True, index=True)  # e.g., "Electronics", "Clothing", "Tools"
    description: Optional[str] = None
    icon: Optional[str] = None  # Icon identifier for UI
    color: Optional[str] = None  # Color for UI display
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow, sa_column_kwargs={"onupdate": datetime.utcnow})
    created_by: Optional[UUID] = None  # Future: link to User

    # Relationships
    subcategories: List["ProductSubcategory"] = Relationship(back_populates="category")
    products: List["Product"] = Relationship(back_populates="category")

class ProductSubcategory(SQLModel, table=True):
    """Dynamic product subcategories that users can create"""
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str = Field(index=True)  # e.g., "Smartphones", "Laptops", "T-shirts"
    category_id: UUID = Field(foreign_key="productcategory.id")
    description: Optional[str] = None
    icon: Optional[str] = None
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow, sa_column_kwargs={"onupdate": datetime.utcnow})
    created_by: Optional[UUID] = None

    # Relationships
    category: Optional[ProductCategory] = Relationship(back_populates="subcategories")
    products: List["Product"] = Relationship(back_populates="subcategory")
    attribute_definitions: List["ProductAttributeDefinition"] = Relationship(back_populates="subcategory")

class ProductAttributeDefinition(SQLModel, table=True):
    """Dynamic attribute definitions for product subcategories"""
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    subcategory_id: UUID = Field(foreign_key="productsubcategory.id")
    name: str = Field(index=True)  # e.g., "screen_size", "material", "size"
    display_name: str  # e.g., "Screen Size", "Material", "Size"
    data_type: str = Field(default="string")  # string, number, boolean, select, date
    required: bool = Field(default=False)
    default_value: Optional[str] = None
    validation_rules: Optional[str] = Field(default=None, sa_column=sa.Column(sa.JSON))  # JSON for validation rules
    options: Optional[str] = Field(default=None, sa_column=sa.Column(sa.JSON))  # For select type attributes
    unit: Optional[str] = None  # e.g., "inch", "GB", "lbs"
    order: int = Field(default=0)  # Display order
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow, sa_column_kwargs={"onupdate": datetime.utcnow})

    # Relationships
    subcategory: Optional[ProductSubcategory] = Relationship(back_populates="attribute_definitions")

class ProductBase(SQLModel):
    name: str = Field(index=True)
    category_id: Optional[UUID] = Field(foreign_key="productcategory.id", default=None)
    subcategory_id: Optional[UUID] = Field(foreign_key="productsubcategory.id", default=None)
    brand: Optional[str] = None
    model: Optional[str] = None
    sku: str = Field(unique=True, index=True)
    barcode: Optional[str] = Field(unique=True, index=True, default=None)

    # Physical attributes
    dimensions: Optional[str] = None  # e.g., "10x5x2 cm" or "L:10cm W:5cm H:2cm"
    weight: Optional[float] = None
    weight_unit: Optional[str] = Field(default="g")  # g, kg, oz, lb

    # Dynamic attributes (stored as JSON)
    attributes: Optional[Dict[str, Any]] = Field(default_factory=dict, sa_column=sa.Column(sa.JSON))  # Flexible attributes per product type

    # Pricing and inventory
    last_purchase_cost: float
    suggested_sell_price: float
    low_stock_threshold: int = Field(default=3)
    current_stock: int = Field(default=0)
    status: str = Field(default="active")

    # Media and description
    image_url: Optional[str] = None
    description: Optional[str] = None
    supplier: Optional[str] = None
    is_active: bool = Field(default=True)

class Product(ProductBase, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow, sa_column_kwargs={"onupdate": datetime.utcnow})
    created_by: Optional[UUID] = None  # Future: link to User

    # Relationships
    category: Optional[ProductCategory] = Relationship(back_populates="products")
    subcategory: Optional[ProductSubcategory] = Relationship(back_populates="products")
    transactions: List["Transaction"] = Relationship(back_populates="product")
    returns: List["Return"] = Relationship(back_populates="product")

class ProductCreate(ProductBase):
    pass

class ProductUpdate(SQLModel):
    name: Optional[str] = None
    category_id: Optional[UUID] = None
    subcategory_id: Optional[UUID] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    sku: Optional[str] = None
    barcode: Optional[str] = None
    dimensions: Optional[str] = None
    weight: Optional[float] = None
    weight_unit: Optional[str] = None
    attributes: Optional[Dict[str, Any]] = None
    last_purchase_cost: Optional[float] = None
    suggested_sell_price: Optional[float] = None
    low_stock_threshold: Optional[int] = None
    image_url: Optional[str] = None
    description: Optional[str] = None
    supplier: Optional[str] = None
    is_active: Optional[bool] = None

# Product response model with calculated stock and category info
class ProductReadWithStock(ProductBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    category: Optional[ProductCategory] = None
    subcategory: Optional[ProductSubcategory] = None

# Category and subcategory CRUD models
class ProductCategoryCreate(SQLModel):
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None

class ProductCategoryUpdate(SQLModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    is_active: Optional[bool] = None

class ProductSubcategoryCreate(SQLModel):
    name: str
    category_id: UUID
    description: Optional[str] = None
    icon: Optional[str] = None

class ProductSubcategoryUpdate(SQLModel):
    name: Optional[str] = None
    category_id: Optional[UUID] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    is_active: Optional[bool] = None

class ProductAttributeDefinitionCreate(SQLModel):
    subcategory_id: UUID
    name: str
    display_name: str
    data_type: str = "string"
    required: bool = False
    default_value: Optional[str] = None
    validation_rules: Optional[str] = None
    options: Optional[str] = None
    unit: Optional[str] = None
    order: int = 0

class ProductAttributeDefinitionUpdate(SQLModel):
    name: Optional[str] = None
    display_name: Optional[str] = None
    data_type: Optional[str] = None
    required: Optional[bool] = None
    default_value: Optional[str] = None
    validation_rules: Optional[str] = None
    options: Optional[str] = None
    unit: Optional[str] = None
    order: Optional[int] = None
    is_active: Optional[bool] = None

# Helper functions for dynamic product management
def get_default_categories() -> List[Dict[str, Any]]:
    """Returns default gadget categories to seed the database (without subcategories)"""
    return [
        {
            "name": "Smartphones",
            "description": "Mobile phones and accessories",
            "icon": "smartphone",
            "color": "#3B82F6"
        },
        {
            "name": "Laptops",
            "description": "Portable computers and accessories",
            "icon": "laptop",
            "color": "#10B981"
        },
        {
            "name": "Tablets",
            "description": "Tablet devices and accessories",
            "icon": "tablet",
            "color": "#F59E0B"
        },
        {
            "name": "Audio Devices",
            "description": "Headphones, speakers, and audio equipment",
            "icon": "headphones",
            "color": "#8B5CF6"
        },
        {
            "name": "Gaming",
            "description": "Gaming consoles, controllers, and accessories",
            "icon": "gamepad-2",
            "color": "#06B6D4"
        },
        {
            "name": "Wearables",
            "description": "Smartwatches, fitness trackers, and wearable tech",
            "icon": "watch",
            "color": "#EF4444"
        }
    ]

def get_default_subcategories() -> List[Dict[str, Any]]:
    """Returns default gadget subcategories that can be created under existing categories"""
    return [
        # Smartphones subcategories
        {
            "name": "iPhone",
            "description": "Apple iPhone devices",
            "icon": "smartphone",
            "category_name": "Smartphones",
            "attributes": [
                {"name": "model", "display_name": "Model", "data_type": "string"},
                {"name": "storage", "display_name": "Storage", "data_type": "select", "options": ["64GB", "128GB", "256GB", "512GB", "1TB"]},
                {"name": "color", "display_name": "Color", "data_type": "string"},
                {"name": "condition", "display_name": "Condition", "data_type": "select", "options": ["New", "Used", "Refurbished"]},
                {"name": "battery_health", "display_name": "Battery Health", "data_type": "string", "unit": "%"}
            ]
        },
        {
            "name": "Android",
            "description": "Android smartphones",
            "icon": "smartphone",
            "category_name": "Smartphones",
            "attributes": [
                {"name": "brand", "display_name": "Brand", "data_type": "string"},
                {"name": "model", "display_name": "Model", "data_type": "string"},
                {"name": "storage", "display_name": "Storage", "data_type": "string"},
                {"name": "ram", "display_name": "RAM", "data_type": "string"},
                {"name": "color", "display_name": "Color", "data_type": "string"},
                {"name": "condition", "display_name": "Condition", "data_type": "select", "options": ["New", "Used", "Refurbished"]}
            ]
        },
        # Laptops subcategories
        {
            "name": "MacBook",
            "description": "Apple MacBook laptops",
            "icon": "laptop",
            "category_name": "Laptops",
            "attributes": [
                {"name": "model", "display_name": "Model", "data_type": "string"},
                {"name": "screen_size", "display_name": "Screen Size", "data_type": "string", "unit": "inch"},
                {"name": "processor", "display_name": "Processor", "data_type": "string"},
                {"name": "ram", "display_name": "RAM", "data_type": "string"},
                {"name": "storage", "display_name": "Storage", "data_type": "string"},
                {"name": "color", "display_name": "Color", "data_type": "string"},
                {"name": "condition", "display_name": "Condition", "data_type": "select", "options": ["New", "Used", "Refurbished"]}
            ]
        },
        {
            "name": "Windows Laptops",
            "description": "Windows-based laptops",
            "icon": "laptop",
            "category_name": "Laptops",
            "attributes": [
                {"name": "brand", "display_name": "Brand", "data_type": "string"},
                {"name": "model", "display_name": "Model", "data_type": "string"},
                {"name": "screen_size", "display_name": "Screen Size", "data_type": "string", "unit": "inch"},
                {"name": "processor", "display_name": "Processor", "data_type": "string"},
                {"name": "ram", "display_name": "RAM", "data_type": "string"},
                {"name": "storage", "display_name": "Storage", "data_type": "string"},
                {"name": "graphics", "display_name": "Graphics", "data_type": "string"},
                {"name": "condition", "display_name": "Condition", "data_type": "select", "options": ["New", "Used", "Refurbished"]}
            ]
        },
        # Audio Devices subcategories
        {
            "name": "Headphones",
            "description": "Over-ear and on-ear headphones",
            "icon": "headphones",
            "category_name": "Audio Devices",
            "attributes": [
                {"name": "brand", "display_name": "Brand", "data_type": "string"},
                {"name": "model", "display_name": "Model", "data_type": "string"},
                {"name": "type", "display_name": "Type", "data_type": "select", "options": ["Over-ear", "On-ear", "In-ear"]},
                {"name": "connectivity", "display_name": "Connectivity", "data_type": "select", "options": ["Wired", "Wireless", "Both"]},
                {"name": "color", "display_name": "Color", "data_type": "string"},
                {"name": "condition", "display_name": "Condition", "data_type": "select", "options": ["New", "Used", "Refurbished"]}
            ]
        },
        {
            "name": "Speakers",
            "description": "Bluetooth and wired speakers",
            "icon": "speaker",
            "category_name": "Audio Devices",
            "attributes": [
                {"name": "brand", "display_name": "Brand", "data_type": "string"},
                {"name": "model", "display_name": "Model", "data_type": "string"},
                {"name": "type", "display_name": "Type", "data_type": "select", "options": ["Portable", "Home", "Car"]},
                {"name": "connectivity", "display_name": "Connectivity", "data_type": "select", "options": ["Bluetooth", "Wired", "Both"]},
                {"name": "power", "display_name": "Power", "data_type": "string", "unit": "W"},
                {"name": "color", "display_name": "Color", "data_type": "string"},
                {"name": "condition", "display_name": "Condition", "data_type": "select", "options": ["New", "Used", "Refurbished"]}
            ]
        },
        # Gaming subcategories
        {
            "name": "Gaming Consoles",
            "description": "PlayStation, Xbox, Nintendo consoles",
            "icon": "gamepad-2",
            "category_name": "Gaming",
            "attributes": [
                {"name": "brand", "display_name": "Brand", "data_type": "select", "options": ["PlayStation", "Xbox", "Nintendo"]},
                {"name": "model", "display_name": "Model", "data_type": "string"},
                {"name": "storage", "display_name": "Storage", "data_type": "string"},
                {"name": "color", "display_name": "Color", "data_type": "string"},
                {"name": "condition", "display_name": "Condition", "data_type": "select", "options": ["New", "Used", "Refurbished"]},
                {"name": "includes_controller", "display_name": "Includes Controller", "data_type": "select", "options": ["Yes", "No"]}
            ]
        },
        {
            "name": "Gaming Accessories",
            "description": "Controllers, headsets, and gaming peripherals",
            "icon": "gamepad-2",
            "category_name": "Gaming",
            "attributes": [
                {"name": "type", "display_name": "Type", "data_type": "select", "options": ["Controller", "Headset", "Mouse", "Keyboard", "Other"]},
                {"name": "brand", "display_name": "Brand", "data_type": "string"},
                {"name": "model", "display_name": "Model", "data_type": "string"},
                {"name": "compatibility", "display_name": "Compatibility", "data_type": "string"},
                {"name": "color", "display_name": "Color", "data_type": "string"},
                {"name": "condition", "display_name": "Condition", "data_type": "select", "options": ["New", "Used", "Refurbished"]}
            ]
        }
    ]

def validate_product_attributes(product_attributes: Dict[str, Any], attribute_definitions: List[ProductAttributeDefinition]) -> Dict[str, str]:
    """Validates product attributes against their definitions"""
    errors = {}

    for attr_def in attribute_definitions:
        if attr_def.required and attr_def.name not in product_attributes:
            errors[attr_def.name] = f"{attr_def.display_name} is required"
            continue

        if attr_def.name in product_attributes:
            value = product_attributes[attr_def.name]

            # Type validation
            if attr_def.data_type == "number" and not isinstance(value, (int, float)):
                try:
                    float(value)
                except (ValueError, TypeError):
                    errors[attr_def.name] = f"{attr_def.display_name} must be a number"

            elif attr_def.data_type == "boolean" and not isinstance(value, bool):
                if value not in ["true", "false", "1", "0", True, False]:
                    errors[attr_def.name] = f"{attr_def.display_name} must be true or false"

            elif attr_def.data_type == "select" and attr_def.options:
                # Parse options from JSON string if needed
                options = attr_def.options
                if isinstance(options, str):
                    try:
                        import json
                        options = json.loads(options)
                    except (json.JSONDecodeError, TypeError):
                        options = []

                if isinstance(options, list) and value not in options:
                    errors[attr_def.name] = f"{attr_def.display_name} must be one of: {', '.join(options)}"

    return errors

# --- Transaction Models ---
class TransactionBase(SQLModel):
    product_id: UUID = Field(foreign_key="product.id")
    transaction_date: date = Field(default_factory=date.today)
    transaction_type: TransactionType = Field(sa_column=Column(Enum(TransactionType), nullable=False))
    quantity: int
    unit_cost: Optional[float] = None  # For purchase
    unit_price: Optional[float] = None  # For sale
    party_name: Optional[str] = None  # Supplier/Customer
    transport_other_cost: float = Field(default=0.00)  # Only for purchase
    reference_number: Optional[str] = None
    notes: Optional[str] = None

class Transaction(TransactionBase, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[UUID] = None  # Future: link to User
    product: Optional[Product] = Relationship(back_populates="transactions")

class TransactionCreate(TransactionBase):
    pass

class TransactionUpdate(SQLModel):
    product_id: Optional[UUID] = None
    transaction_date: Optional[date] = None
    transaction_type: Optional[TransactionType] = None
    quantity: Optional[int] = None
    unit_cost: Optional[float] = None
    unit_price: Optional[float] = None
    party_name: Optional[str] = None
    transport_other_cost: Optional[float] = None
    reference_number: Optional[str] = None
    notes: Optional[str] = None

# --- Repair Models ---
class RepairBase(SQLModel):
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = None
    phone_model: str
    issue_description: str
    technician_notes: Optional[str] = None
    repair_status: RepairStatus = Field(default=RepairStatus.pending)
    payment_status: PaymentStatus = Field(default=PaymentStatus.pending)
    date_received: date = Field(default_factory=date.today)
    estimated_completion: Optional[date] = None
    date_completed: Optional[date] = None
    labor_cost: float = Field(default=0.00)
    parts_cost: float = Field(default=0.00)
    total_amount: float = Field(default=0.00)
    amount_paid: float = Field(default=0.00)
    warranty_period: Optional[int] = None  # Days
    warranty_expiry: Optional[date] = None

class Repair(RepairBase, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow, sa_column_kwargs={"onupdate": datetime.utcnow})
    created_by: Optional[UUID] = None  # Future: link to User
    assigned_technician: Optional[UUID] = None  # Future: link to User
    parts_used: List["RepairPart"] = Relationship(back_populates="repair")

class RepairCreate(RepairBase):
    pass

class RepairUpdate(SQLModel):
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    phone_model: Optional[str] = None
    issue_description: Optional[str] = None
    technician_notes: Optional[str] = None
    repair_status: Optional[RepairStatus] = None
    payment_status: Optional[PaymentStatus] = None
    date_received: Optional[date] = None
    estimated_completion: Optional[date] = None
    date_completed: Optional[date] = None
    labor_cost: Optional[float] = None
    parts_cost: Optional[float] = None
    total_amount: Optional[float] = None
    amount_paid: Optional[float] = None
    warranty_period: Optional[int] = None
    warranty_expiry: Optional[date] = None
    assigned_technician: Optional[UUID] = None

# --- Repair Parts (Many-to-Many relationship) ---
class RepairPart(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    repair_id: UUID = Field(foreign_key="repair.id")
    product_id: UUID = Field(foreign_key="product.id")
    quantity_used: int
    unit_cost: float
    total_cost: float
    created_at: datetime = Field(default_factory=datetime.utcnow)
    repair: "Repair" = Relationship(back_populates="parts_used")

# --- Expense Models ---
class ExpenseBase(SQLModel):
    expense_date: date = Field(default_factory=date.today)
    description: str
    amount: float
    category: ExpenseCategory
    reference_number: Optional[str] = None
    vendor: Optional[str] = None
    payment_method: Optional[str] = None
    notes: Optional[str] = None
    receipt_url: Optional[str] = None  # Cloudinary URL for receipt image

class Expense(ExpenseBase, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[UUID] = None  # Future: link to User

class ExpenseCreate(ExpenseBase):
    pass

class ExpenseUpdate(SQLModel):
    expense_date: Optional[date] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    category: Optional[ExpenseCategory] = None
    reference_number: Optional[str] = None
    vendor: Optional[str] = None
    payment_method: Optional[str] = None
    notes: Optional[str] = None
    receipt_url: Optional[str] = None

# --- Return Models ---
class ReturnBase(SQLModel):
    product_id: UUID = Field(foreign_key="product.id")
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = None
    reason: str
    action_taken: ReturnAction
    status: ReturnStatus = Field(default=ReturnStatus.pending)
    return_date: date = Field(default_factory=date.today)
    original_transaction_id: Optional[UUID] = None  # Link to original sale
    refund_amount: Optional[float] = None
    replacement_product_id: Optional[UUID] = None
    notes: Optional[str] = None

class Return(ReturnBase, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow, sa_column_kwargs={"onupdate": datetime.utcnow})
    created_by: Optional[UUID] = None  # Future: link to User
    product: Optional[Product] = Relationship(back_populates="returns")

class ReturnCreate(ReturnBase):
    pass

class ReturnUpdate(SQLModel):
    product_id: Optional[UUID] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    reason: Optional[str] = None
    action_taken: Optional[ReturnAction] = None
    status: Optional[ReturnStatus] = None
    return_date: Optional[date] = None
    original_transaction_id: Optional[UUID] = None
    refund_amount: Optional[float] = None
    replacement_product_id: Optional[UUID] = None
    notes: Optional[str] = None

# --- Response Models for Calculated Data ---

class TransactionRead(TransactionBase):
    id: UUID
    created_at: datetime
    product: Optional[Product] = None

class RepairRead(RepairBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    parts_used: List[RepairPart] = []

class FinancialSummary(SQLModel):
    total_revenue: float
    total_cogs: float
    total_gross_profit: float
    total_transport_other_costs: float
    total_expenses: float
    total_repair_revenue: float
    total_repair_costs: float
    net_profit: float
    profit_margin: float  # Percentage

class DashboardStats(SQLModel):
    total_products: int
    low_stock_products: int
    total_repairs: int
    pending_repairs: int
    completed_repairs: int
    total_transactions: int
    total_expenses: float
    monthly_revenue: float
    monthly_profit: float