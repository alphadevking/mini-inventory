# models.py
# SQLModel models (to be implemented)
from datetime import date, datetime
from typing import Optional, List
from uuid import UUID, uuid4
from sqlmodel import Field, SQLModel, Relationship, Column, Enum, ForeignKey
import enum

# --- Enums ---
class TransactionType(str, enum.Enum):
    purchase = "purchase"
    sale = "sale"

# --- Product Models ---
class ProductBase(SQLModel):
    phone_model: str
    part_type: str
    variant: str = Field(default="")
    last_purchase_cost: float
    suggested_sell_price: float
    low_stock_threshold: int = Field(default=3)

class Product(ProductBase, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    transactions: List["Transaction"] = Relationship(back_populates="product")

class ProductCreate(ProductBase):
    pass

class ProductUpdate(SQLModel):
    phone_model: Optional[str] = None
    part_type: Optional[str] = None
    variant: Optional[str] = None
    last_purchase_cost: Optional[float] = None
    suggested_sell_price: Optional[float] = None
    low_stock_threshold: Optional[int] = None

# --- Transaction Models ---
class TransactionBase(SQLModel):
    product_id: UUID = Field(foreign_key="product.id")
    transaction_date: date = Field(default_factory=date.today)
    transaction_type: TransactionType = Field(sa_column=Column(Enum(TransactionType), nullable=False))
    quantity: int
    unit_cost: Optional[float] = None
    unit_price: Optional[float] = None
    party_name: Optional[str] = None
    transport_other_cost: float = Field(default=0.00)

class Transaction(TransactionBase, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    product: Optional[Product] = Relationship(back_populates="transactions")

class TransactionCreate(TransactionBase):
    pass

# --- Response Models (no relationships) ---
class ProductReadWithStock(SQLModel):
    id: UUID
    phone_model: str
    part_type: str
    variant: str
    last_purchase_cost: float
    suggested_sell_price: float
    low_stock_threshold: int
    created_at: datetime
    updated_at: datetime
    current_stock: int
    status: str

class TransactionRead(SQLModel):
    id: UUID
    product_id: UUID
    transaction_date: date
    transaction_type: TransactionType
    quantity: int
    unit_cost: Optional[float] = None
    unit_price: Optional[float] = None
    party_name: Optional[str] = None
    transport_other_cost: float = 0.0
    created_at: datetime

class FinancialSummary(SQLModel):
    total_revenue: float
    total_cogs: float
    total_gross_profit: float
    total_transport_other_costs: float
    net_profit: float