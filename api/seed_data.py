"""
seed_data.py
============
Populates a fresh database with:
  1. One user per role (admin / manager / technician / cashier)
  2. Product categories & subcategories
  3. Sample products with initial stock
  4. Two sample repairs (one pending, one fully completed through service layer)
  5. Two sample sales (through sale_service so StockMovements are created)
  6. Two sample expenses

Run directly:
    python -m api.seed_data

Called automatically by reset_db.py after schema recreation.
"""

from datetime import date, timedelta
from uuid import UUID

from sqlmodel import Session, select

from .database import engine
from .auth import get_password_hash
from .models import (
    User,
    UserRole,
    ProductCategory,
    ProductSubcategory,
    ProductAttributeDefinition,
    Product,
    Expense,
    ExpenseCategory,
    RepairCreate,
    RepairStatus,
    PaymentStatus,
    PaymentMethod,
    SaleCreate,
    SaleItemCreate,
    StockMovementType,
)
from .services.repair_service import RepairService
from .services.sale_service import SaleService
from .services.stock_service import StockService


# ---------------------------------------------------------------------------
# Credentials printed to console on first run — change via env / admin UI
# ---------------------------------------------------------------------------
USERS = [
    {
        "username": "admin",
        "email": "admin@store.local",
        "full_name": "System Administrator",
        "password": "Admin@123",
        "role": UserRole.admin,
    },
    {
        "username": "manager",
        "email": "manager@store.local",
        "full_name": "Store Manager",
        "password": "Manager@123",
        "role": UserRole.manager,
    },
    {
        "username": "technician",
        "email": "tech@store.local",
        "full_name": "Lead Technician",
        "password": "Tech@123",
        "role": UserRole.technician,
    },
    {
        "username": "cashier",
        "email": "cashier@store.local",
        "full_name": "Front Desk Cashier",
        "password": "Cashier@123",
        "role": UserRole.cashier,
    },
]


def _seed_users(session: Session) -> dict[str, UUID]:
    """Create one user per role if they don't already exist.
    Returns a mapping of username → user ID."""
    ids: dict[str, UUID] = {}
    for u in USERS:
        existing = session.exec(
            select(User).where(User.username == u["username"])
        ).first()
        if existing:
            ids[u["username"]] = existing.id
            continue
        user = User(
            username=u["username"],
            email=u["email"],
            full_name=u["full_name"],
            role=u["role"],
            is_active=True,
            hashed_password=get_password_hash(u["password"]),
            user_metadata={},
        )
        session.add(user)
        session.flush()
        ids[u["username"]] = user.id
        print(
            f"  Created user '{u['username']}' ({u['role'].value}) — password: {u['password']}"
        )
    return ids


def _seed_categories(session: Session) -> dict[str, UUID]:
    """Seed categories + subcategories. Returns category name → ID map."""
    existing = session.exec(select(ProductCategory)).first()
    if existing:
        cats = session.exec(select(ProductCategory)).all()
        return {c.name: c.id for c in cats}

    print("  Seeding categories...")
    categories_data = [
        {
            "name": "Smartphones",
            "description": "Mobile phones and accessories",
            "icon": "smartphone",
            "color": "#3B82F6",
            "subcategories": [
                {
                    "name": "iPhone",
                    "description": "Apple iPhones",
                    "icon": "smartphone",
                },
                {
                    "name": "Android",
                    "description": "Android smartphones",
                    "icon": "smartphone",
                },
            ],
        },
        {
            "name": "Laptops",
            "description": "Portable computers and accessories",
            "icon": "laptop",
            "color": "#10B981",
            "subcategories": [
                {"name": "MacBook", "description": "Apple laptops", "icon": "laptop"},
                {
                    "name": "Windows Laptop",
                    "description": "Windows laptops",
                    "icon": "laptop",
                },
            ],
        },
        {
            "name": "Accessories",
            "description": "Cables, cases, chargers, and peripherals",
            "icon": "plug",
            "color": "#F59E0B",
            "subcategories": [
                {
                    "name": "Chargers",
                    "description": "Charging cables and adapters",
                    "icon": "plug",
                },
                {"name": "Cases", "description": "Protective cases", "icon": "shield"},
            ],
        },
        {
            "name": "Repair Parts",
            "description": "Spare parts used in repairs",
            "icon": "wrench",
            "color": "#EF4444",
            "subcategories": [
                {
                    "name": "Screens",
                    "description": "Replacement screens",
                    "icon": "monitor",
                },
                {
                    "name": "Batteries",
                    "description": "Replacement batteries",
                    "icon": "battery",
                },
            ],
        },
    ]

    cat_ids: dict[str, UUID] = {}
    for cat_data in categories_data:
        category = ProductCategory(
            name=cat_data["name"],
            description=cat_data["description"],
            icon=cat_data["icon"],
            color=cat_data["color"],
        )
        session.add(category)
        session.flush()
        cat_ids[cat_data["name"]] = category.id

        for sub_data in cat_data["subcategories"]:
            session.add(
                ProductSubcategory(
                    name=sub_data["name"],
                    description=sub_data["description"],
                    icon=sub_data["icon"],
                    category_id=category.id,
                )
            )

    print(f"  Seeded {len(categories_data)} categories.")
    return cat_ids


def _get_subcategory_id(session: Session, name: str) -> UUID | None:
    sub = session.exec(
        select(ProductSubcategory).where(ProductSubcategory.name == name)
    ).first()
    return sub.id if sub else None


def _seed_attribute_definitions(session: Session) -> None:
    """Seed dynamic attribute definitions for subcategories."""
    if session.exec(select(ProductAttributeDefinition)).first():
        return

    print("  Seeding attribute definitions...")

    # Map subcategory names to their specific attributes
    attr_map = {
        "iPhone": [
            {
                "name": "storage",
                "display_name": "Storage",
                "data_type": "select",
                "options": ["128GB", "256GB", "512GB", "1TB"],
                "required": True,
                "unit": "GB",
            },
            {
                "name": "color",
                "display_name": "Color",
                "data_type": "string",
                "required": True,
            },
            {
                "name": "condition",
                "display_name": "Condition",
                "data_type": "select",
                "options": ["New", "Like New", "Used"],
                "required": True,
            },
        ],
        "Android": [
            {
                "name": "storage",
                "display_name": "Storage",
                "data_type": "select",
                "options": ["128GB", "256GB", "512GB"],
                "required": True,
                "unit": "GB",
            },
            {
                "name": "ram",
                "display_name": "RAM",
                "data_type": "select",
                "options": ["8GB", "12GB", "16GB"],
                "required": True,
                "unit": "GB",
            },
            {
                "name": "color",
                "display_name": "Color",
                "data_type": "string",
                "required": True,
            },
        ],
        "Screens": [
            {
                "name": "quality",
                "display_name": "Screen Quality",
                "data_type": "select",
                "options": ["OEM", "Premium Aftermarket", "Standard"],
                "required": True,
            },
            {
                "name": "warranty_period",
                "display_name": "Warranty Period",
                "data_type": "string",
                "default_value": "90 days",
            },
        ],
        "Batteries": [
            {
                "name": "capacity",
                "display_name": "Capacity",
                "data_type": "number",
                "unit": "mAh",
                "required": True,
            },
            {
                "name": "cycle_count",
                "display_name": "Cycle Count",
                "data_type": "number",
                "required": False,
            },
        ],
    }

    for sub_name, attrs in attr_map.items():
        sub_id = _get_subcategory_id(session, sub_name)
        if not sub_id:
            continue

        for attr in attrs:
            session.add(ProductAttributeDefinition(subcategory_id=sub_id, **attr))

    session.flush()
    print(f"  Seeded attribute definitions for {len(attr_map)} subcategories.")


def _seed_products(session: Session, cat_ids: dict[str, UUID]) -> list[UUID]:
    """Seed sample products. Returns list of product IDs."""
    existing = session.exec(select(Product)).first()
    if existing:
        return [p.id for p in session.exec(select(Product)).all()]

    print("  Seeding products...")
    iphone_sub_id = _get_subcategory_id(session, "iPhone")
    android_sub_id = _get_subcategory_id(session, "Android")
    screen_sub_id = _get_subcategory_id(session, "Screens")
    battery_sub_id = _get_subcategory_id(session, "Batteries")
    charger_sub_id = _get_subcategory_id(session, "Chargers")

    products = [
        Product(
            name="iPhone 15 Pro",
            sku="IPH-15P-256-BK",
            category_id=cat_ids.get("Smartphones"),
            subcategory_id=iphone_sub_id,
            brand="Apple",
            model="15 Pro",
            last_purchase_cost=900_000,
            suggested_sell_price=1_099_000,
            current_stock=8,
            low_stock_threshold=2,
            is_active=True,
            attributes={
                "storage": "256GB",
                "color": "Black Titanium",
                "condition": "New",
            },
        ),
        Product(
            name="iPhone 14",
            sku="IPH-14-128-WH",
            category_id=cat_ids.get("Smartphones"),
            subcategory_id=iphone_sub_id,
            brand="Apple",
            model="14",
            last_purchase_cost=650_000,
            suggested_sell_price=799_000,
            current_stock=5,
            low_stock_threshold=2,
            is_active=True,
            attributes={"storage": "128GB", "color": "White", "condition": "Like New"},
        ),
        Product(
            name="Samsung Galaxy S24",
            sku="SAM-S24-256-GR",
            category_id=cat_ids.get("Smartphones"),
            subcategory_id=android_sub_id,
            brand="Samsung",
            model="Galaxy S24",
            last_purchase_cost=700_000,
            suggested_sell_price=850_000,
            current_stock=6,
            low_stock_threshold=2,
            is_active=True,
            attributes={
                "storage": "256GB",
                "ram": "8GB",
                "color": "Gray",
                "condition": "New",
            },
        ),
        Product(
            name="iPhone 15 Pro Screen (OEM)",
            sku="PART-IPH15P-SCR",
            category_id=cat_ids.get("Repair Parts"),
            subcategory_id=screen_sub_id,
            brand="Apple",
            model="15 Pro",
            last_purchase_cost=45_000,
            suggested_sell_price=65_000,
            current_stock=10,
            low_stock_threshold=3,
            is_active=True,
            attributes={"quality": "OEM"},
        ),
        Product(
            name="iPhone 14 Battery (OEM)",
            sku="PART-IPH14-BAT",
            category_id=cat_ids.get("Repair Parts"),
            subcategory_id=battery_sub_id,
            brand="Apple",
            model="14",
            last_purchase_cost=12_000,
            suggested_sell_price=18_000,
            current_stock=15,
            low_stock_threshold=4,
            is_active=True,
            attributes={"capacity": 3279, "cycle_count": 0},
        ),
        Product(
            name="USB-C Charger 65W",
            sku="ACC-USBC-65W",
            category_id=cat_ids.get("Accessories"),
            subcategory_id=charger_sub_id,
            brand="Generic",
            model="65W GaN",
            last_purchase_cost=8_000,
            suggested_sell_price=14_500,
            current_stock=20,
            low_stock_threshold=5,
            is_active=True,
        ),
    ]

    for p in products:
        session.add(p)
    session.flush()
    ids = [p.id for p in products]
    print(f"  Seeded {len(products)} products.")
    return ids


def _seed_repairs(session: Session, admin_id: UUID, technician_id: UUID) -> None:
    existing = session.exec(select(Product)).first()  # just a guard — real guard below
    from .models import Repair

    if session.exec(select(Repair)).first():
        return

    print("  Seeding repairs...")

    # ── Repair 1: pending, customer dropped off today ──────────────────────
    RepairService.create_repair(
        session,
        RepairCreate(
            customer_name="Alice Johnson",
            customer_phone="08012345678",
            customer_email="alice@example.com",
            phone_model="iPhone 15 Pro",
            issue_description="Cracked screen — display still works but glass is shattered",
            payment_status=PaymentStatus.pending,
            labor_cost=15_000,
            total_amount=60_000,  # labor + expected screen cost
        ),
        created_by=admin_id,
    )

    # ── Repair 2: completed — goes through full status lifecycle ───────────
    wip = RepairService.create_repair(
        session,
        RepairCreate(
            customer_name="Bob Williams",
            customer_phone="08087654321",
            phone_model="iPhone 14",
            issue_description="Battery draining rapidly — less than 4 hours screen-on time",
            payment_status=PaymentStatus.paid,
            labor_cost=8_000,
            total_amount=20_000,
            amount_paid=20_000,
        ),
        created_by=admin_id,
    )
    wip = RepairService.transition_status(
        session,
        wip.id,
        RepairStatus.in_progress,
        changed_by=technician_id,
        notes="Battery ordered, customer notified",
    )
    RepairService.transition_status(
        session,
        wip.id,
        RepairStatus.completed,
        changed_by=technician_id,
        notes="Battery replaced. Capacity now 100%. Customer collected device.",
    )

    print("  Seeded 2 repairs (1 pending, 1 completed).")


def _seed_sales(session: Session, admin_id: UUID, product_ids: list[UUID]) -> None:
    from .models import Sale

    if session.exec(select(Sale)).first():
        return

    # Only proceed if we have at least 2 products
    if len(product_ids) < 2:
        return

    print("  Seeding sales...")

    SaleService.create_sale(
        session,
        SaleCreate(
            sale_date=date.today() - timedelta(days=2),
            customer_name="Carol Davis",
            customer_phone="08055544433",
            payment_method=PaymentMethod.transfer,
            payment_status=PaymentStatus.paid,
            amount_paid=1_099_000,
            items=[SaleItemCreate(product_id=product_ids[0], quantity=1)],
        ),
        created_by=admin_id,
    )

    SaleService.create_sale(
        session,
        SaleCreate(
            sale_date=date.today() - timedelta(days=1),
            customer_name="David Okafor",
            customer_phone="08033322211",
            payment_method=PaymentMethod.cash,
            payment_status=PaymentStatus.paid,
            amount_paid=1_663_500,
            items=[
                SaleItemCreate(product_id=product_ids[1], quantity=1),
                SaleItemCreate(product_id=product_ids[5], quantity=2),
            ],
        ),
        created_by=admin_id,
    )

    print("  Seeded 2 sales.")


def _seed_expenses(session: Session) -> None:
    from .models import Expense

    if session.exec(select(Expense)).first():
        return

    print("  Seeding expenses...")
    expenses = [
        Expense(
            description="Shop rent — April 2026",
            amount=120_000,
            category=ExpenseCategory.rent,
            expense_date=date.today().replace(day=1),
        ),
        Expense(
            description="Soldering station + hot air gun",
            amount=45_000,
            category=ExpenseCategory.equipment,
            expense_date=date.today() - timedelta(days=10),
        ),
        Expense(
            description="Electricity bill — March 2026",
            amount=18_000,
            category=ExpenseCategory.utilities,
            expense_date=date.today() - timedelta(days=5),
        ),
    ]
    for e in expenses:
        session.add(e)
    session.flush()
    print(f"  Seeded {len(expenses)} expenses.")


def seed_database() -> None:
    print("\n=== Seeding database ===")
    with Session(engine) as session:
        # 1. Users
        print("\n[1/5] Users")
        user_ids = _seed_users(session)
        session.commit()

        admin_id = user_ids["admin"]
        technician_id = user_ids["technician"]
        cashier_id = user_ids["cashier"]

        # 2. Categories
        print("\n[2/5] Categories")
        cat_ids = _seed_categories(session)
        _seed_attribute_definitions(session)
        session.commit()

        # 3. Products
        print("\n[3/5] Products")
        product_ids = _seed_products(session, cat_ids)
        session.commit()

        # 4. Repairs (uses service layer — creates RepairStatusLog entries)
        print("\n[4/5] Repairs")
        _seed_repairs(session, admin_id, technician_id)
        # Note: repair_service commits internally; no extra commit needed

        # 5. Sales (uses service layer — creates StockMovements)
        print("\n[5/5] Sales & Expenses")
        _seed_sales(session, cashier_id, product_ids)
        # Note: sale_service commits internally

        _seed_expenses(session)
        session.commit()

    print("\n=== Seeding complete ===")
    print("\nDefault credentials:")
    for u in USERS:
        print(
            f"  {u['role'].value:12s}  username={u['username']}  password={u['password']}"
        )
    print()


if __name__ == "__main__":
    seed_database()
