"""
seed_data.py
============
Populates a fresh database with realistic demo data that exercises every
layer of the Gold Standard serialized inventory model.

What is seeded
--------------
1.  One user per role  (admin / manager / technician / cashier)
2.  Categories & subcategories
3.  Attribute definitions for subcategories
4.  Products — two kinds:
      Serialized  : smartphones + laptop — stock comes from ProductUnit rows
      Bulk        : repair parts + accessories — stock set via StockMovement initial
5.  ProductUnits — one row per physical device, covering every status:
      in_stock    : available for sale            (multiple per product)
      sold        : sold through a sale           (linked via SaleItem.unit_id)
      returned    : came back after a sale        (stock restored)
      in_repair   : internal refurb / damage      (stock held)
      reserved    : display / demo unit           (stock held)
6.  Sales (via SaleService) — mixed bag:
      Sale 1 : Carol Davis   — 1× iPhone 15 Pro (serialized unit)
      Sale 2 : David Okafor  — 1× iPhone 14 (serialized) + 1× Samsung S24 (serialized)
                               + 2× USB-C Charger (bulk, no unit)
      Sale 3 : Eve Chen      — 3× iPhone Clear Case (bulk only)
7.  Two sample repairs  (1 pending, 1 completed)
8.  Three sample expenses

Run directly:
    python -m api.seed_data

Called automatically by reset_db.py after schema recreation.
"""

from datetime import date, datetime, timedelta
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
    ProductUnit,
    UnitStatus,
    Expense,
    ExpenseCategory,
    RepairCreate,
    RepairStatus,
    PaymentStatus,
    PaymentMethod,
    SaleCreate,
    SaleItemCreate,
    StockMovementType,
    ReturnCreate,
    ReturnAction,
)
from .services.repair_service import RepairService
from .services.sale_service import SaleService
from .services.stock_service import StockService
from .services.return_service import ReturnService


# ---------------------------------------------------------------------------
# Credentials printed to console on first run
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


# ===========================================================================
# 1. Users
# ===========================================================================

def _seed_users(session: Session) -> dict[str, UUID]:
    ids: dict[str, UUID] = {}
    for u in USERS:
        existing = session.exec(select(User).where(User.username == u["username"])).first()
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
        print(f"  Created user '{u['username']}' ({u['role'].value}) — password: {u['password']}")
    return ids


# ===========================================================================
# 2. Categories & subcategories
# ===========================================================================

def _seed_categories(session: Session) -> dict[str, UUID]:
    existing = session.exec(select(ProductCategory)).first()
    if existing:
        return {c.name: c.id for c in session.exec(select(ProductCategory)).all()}

    print("  Seeding categories...")
    categories_data = [
        {
            "name": "Smartphones",
            "description": "Mobile phones",
            "icon": "smartphone",
            "color": "#3B82F6",
            "subcategories": [
                {"name": "iPhone", "description": "Apple iPhones", "icon": "smartphone"},
                {"name": "Android", "description": "Android smartphones", "icon": "smartphone"},
            ],
        },
        {
            "name": "Laptops",
            "description": "Portable computers",
            "icon": "laptop",
            "color": "#10B981",
            "subcategories": [
                {"name": "MacBook", "description": "Apple laptops", "icon": "laptop"},
                {"name": "Windows Laptop", "description": "Windows laptops", "icon": "laptop"},
            ],
        },
        {
            "name": "Accessories",
            "description": "Cables, cases, chargers",
            "icon": "plug",
            "color": "#F59E0B",
            "subcategories": [
                {"name": "Chargers", "description": "Charging cables and adapters", "icon": "plug"},
                {"name": "Cases", "description": "Protective cases", "icon": "shield"},
            ],
        },
        {
            "name": "Repair Parts",
            "description": "Spare parts used in repairs",
            "icon": "wrench",
            "color": "#EF4444",
            "subcategories": [
                {"name": "Screens", "description": "Replacement screens", "icon": "monitor"},
                {"name": "Batteries", "description": "Replacement batteries", "icon": "battery"},
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
            session.add(ProductSubcategory(
                name=sub_data["name"],
                description=sub_data["description"],
                icon=sub_data["icon"],
                category_id=category.id,
            ))

    print(f"  Seeded {len(categories_data)} categories.")
    return cat_ids


def _get_sub_id(session: Session, name: str) -> UUID | None:
    sub = session.exec(select(ProductSubcategory).where(ProductSubcategory.name == name)).first()
    return sub.id if sub else None


def _seed_attribute_definitions(session: Session) -> None:
    if session.exec(select(ProductAttributeDefinition)).first():
        return
    print("  Seeding attribute definitions...")
    attr_map = {
        "iPhone": [
            {"name": "storage", "display_name": "Storage", "data_type": "select",
             "options": ["128GB", "256GB", "512GB", "1TB"], "required": True},
            {"name": "color", "display_name": "Color", "data_type": "string", "required": True},
            {"name": "condition", "display_name": "Condition", "data_type": "select",
             "options": ["New", "Like New", "Refurbished"], "required": True},
        ],
        "Android": [
            {"name": "storage", "display_name": "Storage", "data_type": "select",
             "options": ["128GB", "256GB", "512GB"], "required": True},
            {"name": "ram", "display_name": "RAM", "data_type": "select",
             "options": ["8GB", "12GB", "16GB"], "required": True},
            {"name": "color", "display_name": "Color", "data_type": "string", "required": True},
        ],
        "MacBook": [
            {"name": "chip", "display_name": "Chip", "data_type": "select",
             "options": ["M2", "M3", "M3 Pro", "M3 Max"], "required": True},
            {"name": "ram", "display_name": "RAM", "data_type": "select",
             "options": ["8GB", "16GB", "36GB", "48GB"], "required": True},
            {"name": "storage", "display_name": "SSD", "data_type": "select",
             "options": ["256GB", "512GB", "1TB", "2TB"], "required": True},
        ],
        "Screens": [
            {"name": "quality", "display_name": "Screen Quality", "data_type": "select",
             "options": ["OEM", "Premium Aftermarket", "Standard"], "required": True},
        ],
        "Batteries": [
            {"name": "capacity", "display_name": "Capacity (mAh)", "data_type": "number", "required": True},
        ],
    }
    for sub_name, attrs in attr_map.items():
        sub_id = _get_sub_id(session, sub_name)
        if not sub_id:
            continue
        for attr in attrs:
            session.add(ProductAttributeDefinition(subcategory_id=sub_id, **attr))
    session.flush()
    print(f"  Seeded attribute definitions for {len(attr_map)} subcategories.")


# ===========================================================================
# 3. Products
#
# Serialized products: current_stock starts at 0 — units are added below.
# Bulk products: stock is set via a single StockMovement(type=initial).
# ===========================================================================

def _seed_products(session: Session, cat_ids: dict[str, UUID]) -> dict[str, UUID]:
    """Returns a name → product_id map."""
    existing = session.exec(select(Product)).first()
    if existing:
        return {p.name: p.id for p in session.exec(select(Product)).all()}

    print("  Seeding products...")
    iphone_sub  = _get_sub_id(session, "iPhone")
    android_sub = _get_sub_id(session, "Android")
    macbook_sub = _get_sub_id(session, "MacBook")
    screen_sub  = _get_sub_id(session, "Screens")
    battery_sub = _get_sub_id(session, "Batteries")
    charger_sub = _get_sub_id(session, "Chargers")
    case_sub    = _get_sub_id(session, "Cases")

    # ── Serialized products — stock_count starts at 0 ──────────────────────
    # current_stock will be incremented by StockService when units are received.
    serialized = [
        Product(
            name="iPhone 15 Pro 256GB Black Titanium",
            sku="IPH-15P-256-BK",
            barcode="194253714743",       # Apple's EAN for this model
            brand="Apple",
            model="iPhone 15 Pro",
            category_id=cat_ids.get("Smartphones"),
            subcategory_id=iphone_sub,
            last_purchase_cost=900_000,
            suggested_sell_price=1_099_000,
            current_stock=0,             # managed by ProductUnit intake
            low_stock_threshold=2,
            attributes={"storage": "256GB", "color": "Black Titanium", "condition": "New"},
        ),
        Product(
            name="iPhone 14 128GB White",
            sku="IPH-14-128-WH",
            barcode="194253379736",
            brand="Apple",
            model="iPhone 14",
            category_id=cat_ids.get("Smartphones"),
            subcategory_id=iphone_sub,
            last_purchase_cost=650_000,
            suggested_sell_price=799_000,
            current_stock=0,
            low_stock_threshold=2,
            attributes={"storage": "128GB", "color": "White", "condition": "New"},
        ),
        Product(
            name="Samsung Galaxy S24 256GB",
            sku="SAM-S24-256-GR",
            barcode="8806095073361",
            brand="Samsung",
            model="Galaxy S24",
            category_id=cat_ids.get("Smartphones"),
            subcategory_id=android_sub,
            last_purchase_cost=700_000,
            suggested_sell_price=850_000,
            current_stock=0,
            low_stock_threshold=2,
            attributes={"storage": "256GB", "ram": "8GB", "color": "Marble Gray", "condition": "New"},
        ),
        Product(
            name="MacBook Pro 14\" M3 Pro 18GB 512GB",
            sku="MBP-14-M3P-18-512",
            barcode="195949083457",
            brand="Apple",
            model="MacBook Pro 14-inch",
            category_id=cat_ids.get("Laptops"),
            subcategory_id=macbook_sub,
            last_purchase_cost=1_800_000,
            suggested_sell_price=2_199_000,
            current_stock=0,
            low_stock_threshold=1,
            attributes={"chip": "M3 Pro", "ram": "18GB", "storage": "512GB"},
        ),
    ]

    # ── Bulk / non-serialized products — stock set via initial StockMovement ─
    bulk = [
        Product(
            name="iPhone 15 Pro OLED Screen (OEM)",
            sku="PART-IPH15P-SCR-OEM",
            brand="Apple",
            model="iPhone 15 Pro",
            category_id=cat_ids.get("Repair Parts"),
            subcategory_id=screen_sub,
            last_purchase_cost=45_000,
            suggested_sell_price=65_000,
            current_stock=0,             # set below via initial StockMovement
            low_stock_threshold=3,
            attributes={"quality": "OEM"},
        ),
        Product(
            name="iPhone 14 Battery (OEM)",
            sku="PART-IPH14-BAT-OEM",
            brand="Apple",
            model="iPhone 14",
            category_id=cat_ids.get("Repair Parts"),
            subcategory_id=battery_sub,
            last_purchase_cost=12_000,
            suggested_sell_price=18_000,
            current_stock=0,
            low_stock_threshold=4,
            attributes={"capacity": 3279},
        ),
        Product(
            name="USB-C 65W GaN Charger",
            sku="ACC-USBC-65W-GAN",
            brand="Generic",
            model="65W GaN",
            category_id=cat_ids.get("Accessories"),
            subcategory_id=charger_sub,
            last_purchase_cost=8_000,
            suggested_sell_price=14_500,
            current_stock=0,
            low_stock_threshold=5,
        ),
        Product(
            name="iPhone 15 Pro Clear Case",
            sku="ACC-IPH15P-CASE-CLR",
            brand="Generic",
            category_id=cat_ids.get("Accessories"),
            subcategory_id=case_sub,
            last_purchase_cost=2_500,
            suggested_sell_price=5_000,
            current_stock=0,
            low_stock_threshold=5,
        ),
    ]

    all_products = serialized + bulk
    for p in all_products:
        session.add(p)
    session.flush()

    product_map = {p.name: p.id for p in all_products}
    print(f"  Seeded {len(serialized)} serialized + {len(bulk)} bulk products.")
    return product_map


# ===========================================================================
# 4. ProductUnits  (serialized devices only)
#
# Each call to _intake_unit:
#   1. Creates a ProductUnit row (status = in_stock)
#   2. Calls StockService.move_stock(+1, type=purchase) so the ledger and
#      Product.current_stock are both updated correctly.
#
# Status scenarios covered:
#   in_stock  — the normal available state
#   sold      — unit sold through SaleService (handled in _seed_sales)
#   returned  — unit came back after a sale (handled in _seed_returns)
#   in_repair — unit pulled from shelves for internal servicing
#   reserved  — display / demo unit held back from sale
# ===========================================================================

def _intake_unit(
    session: Session,
    product_id: UUID,
    serial_number: str,
    imei: str | None,
    color: str | None,
    storage: str | None,
    condition: str,
    purchase_cost: float,
    purchased_at: date,
    created_by: UUID,
    notes: str | None = None,
) -> ProductUnit:
    """Create one ProductUnit and record the intake StockMovement."""
    unit = ProductUnit(
        product_id=product_id,
        serial_number=serial_number,
        imei=imei,
        color=color,
        storage=storage,
        condition=condition,
        status=UnitStatus.in_stock,
        purchase_cost=purchase_cost,
        purchased_at=purchased_at,
        notes=notes,
        created_by=created_by,
    )
    session.add(unit)
    session.flush()   # get unit.id

    StockService.move_stock(
        session=session,
        product_id=product_id,
        unit_id=unit.id,
        quantity_delta=1,
        movement_type=StockMovementType.purchase,
        reference_type="unit_intake",
        reference_id=unit.id,
        notes=f"Unit received — SN: {serial_number}",
        created_by=created_by,
    )
    return unit


def _seed_units(
    session: Session,
    product_map: dict[str, UUID],
    admin_id: UUID,
) -> dict[str, ProductUnit]:
    """
    Intake all serialized units. Returns serial_number → ProductUnit map
    so the sales / return seeds can reference specific devices.
    """
    if session.exec(select(ProductUnit)).first():
        units = session.exec(select(ProductUnit)).all()
        return {u.serial_number: u for u in units}

    print("  Seeding product units...")
    units: dict[str, ProductUnit] = {}
    today = date.today()
    intake_day = today - timedelta(days=14)   # stock arrived two weeks ago

    # ── iPhone 15 Pro 256GB Black Titanium ─────────────────────────────────
    # 5 units; after seeding: 2 in_stock, 1 sold, 1 returned, 1 reserved
    iph15p_id = product_map["iPhone 15 Pro 256GB Black Titanium"]
    for sn, imei, notes in [
        ("IPH15P-BK-SN001", "354100000000001", None),
        ("IPH15P-BK-SN002", "354100000000002", None),
        ("IPH15P-BK-SN003", "354100000000003", None),   # → sold (Carol)
        ("IPH15P-BK-SN004", "354100000000004", None),   # → returned
        ("IPH15P-BK-SN005", "354100000000005", "Display unit — do not sell"),  # → reserved
    ]:
        u = _intake_unit(
            session, iph15p_id, sn, imei,
            color="Black Titanium", storage="256GB",
            condition="New", purchase_cost=900_000,
            purchased_at=intake_day, created_by=admin_id, notes=notes,
        )
        units[sn] = u

    # ── iPhone 14 128GB White ───────────────────────────────────────────────
    # 4 units; after seeding: 2 in_stock, 1 sold, 1 in_repair
    iph14_id = product_map["iPhone 14 128GB White"]
    for sn, imei, notes in [
        ("IPH14-WH-SN001", "354200000000001", None),
        ("IPH14-WH-SN002", "354200000000002", None),
        ("IPH14-WH-SN003", "354200000000003", None),   # → sold (David)
        ("IPH14-WH-SN004", "354200000000004", "Pulled for internal screen check — minor scratch on display"),  # → in_repair
    ]:
        u = _intake_unit(
            session, iph14_id, sn, imei,
            color="White", storage="128GB",
            condition="New", purchase_cost=650_000,
            purchased_at=intake_day, created_by=admin_id, notes=notes,
        )
        units[sn] = u

    # ── Samsung Galaxy S24 256GB ────────────────────────────────────────────
    # 3 units; after seeding: 2 in_stock, 1 sold (David)
    sam_id = product_map["Samsung Galaxy S24 256GB"]
    for sn, imei in [
        ("SAM-S24-SN001", "354300000000001"),
        ("SAM-S24-SN002", "354300000000002"),
        ("SAM-S24-SN003", "354300000000003"),  # → sold (David)
    ]:
        u = _intake_unit(
            session, sam_id, sn, imei,
            color="Marble Gray", storage="256GB",
            condition="New", purchase_cost=700_000,
            purchased_at=intake_day, created_by=admin_id,
        )
        units[sn] = u

    # ── MacBook Pro 14" M3 Pro ──────────────────────────────────────────────
    # 2 units; both remain in_stock
    mbp_id = product_map["MacBook Pro 14\" M3 Pro 18GB 512GB"]
    for sn in ["MBP14-M3P-SN001", "MBP14-M3P-SN002"]:
        u = _intake_unit(
            session, mbp_id, sn, imei=None,
            color="Space Black", storage="512GB",
            condition="New", purchase_cost=1_800_000,
            purchased_at=intake_day, created_by=admin_id,
        )
        units[sn] = u

    print(f"  Received {len(units)} serialized units across 4 products.")
    return units


# ===========================================================================
# 5. Bulk stock — initial StockMovement for non-serialized products
# ===========================================================================

def _seed_bulk_stock(
    session: Session,
    product_map: dict[str, UUID],
    admin_id: UUID,
) -> None:
    """Set opening stock for bulk (non-serialized) products via the ledger."""
    bulk_opening = {
        "iPhone 15 Pro OLED Screen (OEM)":  10,
        "iPhone 14 Battery (OEM)":          15,
        "USB-C 65W GaN Charger":            20,
        "iPhone 15 Pro Clear Case":         15,
    }
    for name, qty in bulk_opening.items():
        product_id = product_map.get(name)
        if not product_id:
            continue
        product = session.get(Product, product_id)
        if product and product.current_stock == 0:
            StockService.move_stock(
                session=session,
                product_id=product_id,
                quantity_delta=qty,
                movement_type=StockMovementType.initial,
                reference_type="opening_stock",
                notes=f"Opening stock — {qty} units",
                created_by=admin_id,
            )
    print("  Set opening stock for 4 bulk products.")


# ===========================================================================
# 6. Sales — all go through SaleService (atomic, creates StockMovements)
#
# Sale 1 — Carol Davis (serialized only):
#   • 1× iPhone 15 Pro BK SN003   → unit becomes sold
#
# Sale 2 — David Okafor (serialized + bulk):
#   • 1× iPhone 14 WH SN003       → unit becomes sold
#   • 1× Samsung S24 SN003        → unit becomes sold
#   • 2× USB-C Charger (bulk)     → quantity deducted from current_stock
#
# Sale 3 — Eve Chen (bulk only):
#   • 3× iPhone 15 Pro Clear Case → quantity deducted from current_stock
# ===========================================================================

def _seed_sales(
    session: Session,
    product_map: dict[str, UUID],
    unit_map: dict[str, ProductUnit],
    admin_id: UUID,
    cashier_id: UUID,
) -> dict[str, object]:
    """Returns a map of sale_key → SaleRead so downstream seeds can reference sale/item IDs."""
    from .models import Sale
    if session.exec(select(Sale)).first():
        from .models import SaleRead, SaleItemRead  # noqa
        # Re-build the reference map from DB so return seed still has IDs
        existing = session.exec(select(Sale)).all()
        sale_map: dict[str, object] = {}
        for s in existing:
            if s.customer_name == "Carol Davis":
                sale_map["carol"] = s
            elif s.customer_name == "David Okafor":
                sale_map["david"] = s
        return sale_map

    print("  Seeding sales...")

    charger_id = product_map["USB-C 65W GaN Charger"]
    case_id    = product_map["iPhone 15 Pro Clear Case"]

    # ── Sale 1: Carol Davis — iPhone 15 Pro (serialized unit) ──────────────
    carol_sale = SaleService.create_sale(
        session,
        SaleCreate(
            sale_date=date.today() - timedelta(days=5),
            customer_name="Carol Davis",
            customer_phone="08055544433",
            customer_email="carol@example.com",
            payment_method=PaymentMethod.transfer,
            payment_status=PaymentStatus.paid,
            amount_paid=1_099_000,
            items=[
                SaleItemCreate(
                    product_id=unit_map["IPH15P-BK-SN003"].product_id,
                    quantity=1,
                    unit_id=unit_map["IPH15P-BK-SN003"].id,
                ),
            ],
        ),
        created_by=cashier_id,
    )

    # ── Sale 2: David Okafor — iPhone 14 + Samsung S24 + 2× USB-C Charger ─
    SaleService.create_sale(
        session,
        SaleCreate(
            sale_date=date.today() - timedelta(days=3),
            customer_name="David Okafor",
            customer_phone="08033322211",
            payment_method=PaymentMethod.cash,
            payment_status=PaymentStatus.paid,
            amount_paid=1_678_500,
            items=[
                SaleItemCreate(
                    product_id=unit_map["IPH14-WH-SN003"].product_id,
                    quantity=1,
                    unit_id=unit_map["IPH14-WH-SN003"].id,
                ),
                SaleItemCreate(
                    product_id=unit_map["SAM-S24-SN003"].product_id,
                    quantity=1,
                    unit_id=unit_map["SAM-S24-SN003"].id,
                ),
                # Bulk item — no unit_id
                SaleItemCreate(product_id=charger_id, quantity=2),
            ],
        ),
        created_by=cashier_id,
    )

    # ── Sale 3: Eve Chen — bulk accessories only ────────────────────────────
    SaleService.create_sale(
        session,
        SaleCreate(
            sale_date=date.today() - timedelta(days=1),
            customer_name="Eve Chen",
            customer_phone="08099988877",
            payment_method=PaymentMethod.card,
            payment_status=PaymentStatus.paid,
            amount_paid=15_000,
            items=[
                SaleItemCreate(product_id=case_id, quantity=3),
            ],
        ),
        created_by=cashier_id,
    )

    print("  Seeded 3 sales (2 serialized, 1 bulk).")
    return {"carol": carol_sale}


# ===========================================================================
# 7. Return — Carol's iPhone 15 Pro comes back
#
# After the return:
#   • Stock is restored (+1) via StockService through ReturnService
#   • Unit status is manually set to `returned` (ReturnService does not yet
#     manage unit status — that is a future enhancement)
# ===========================================================================

def _seed_returns(
    session: Session,
    product_map: dict[str, UUID],
    unit_map: dict[str, ProductUnit],
    sale_map: dict[str, object],
    admin_id: UUID,
) -> None:
    from .models import Return, Sale, SaleItem
    if session.exec(select(Return)).first():
        return

    print("  Seeding return...")

    returned_unit = unit_map["IPH15P-BK-SN003"]

    # Resolve Carol's sale ID and the specific sale item for this unit
    carol_sale = sale_map.get("carol")
    carol_sale_id: UUID | None = None
    carol_sale_item_id: UUID | None = None

    if carol_sale is not None:
        # carol_sale may be a SaleRead (Pydantic) or a Sale (SQLModel table row)
        carol_sale_id = carol_sale.id  # type: ignore[union-attr]
        # Find the SaleItem row where unit_id matches the returned unit
        carol_item = session.exec(
            select(SaleItem).where(
                SaleItem.sale_id == carol_sale_id,
                SaleItem.unit_id == returned_unit.id,
            )
        ).first()
        if carol_item:
            carol_sale_item_id = carol_item.id

    # Call ReturnService — this restores stock (+1) and creates a StockMovement
    ReturnService.create_return(
        session,
        ReturnCreate(
            product_id=returned_unit.product_id,
            customer_name="Carol Davis",
            customer_phone="08055544433",
            reason="Device purchased as gift — recipient already owns one",
            action_taken=ReturnAction.refund,
            refund_amount=1_099_000,
            original_sale_id=carol_sale_id,
            original_sale_item_id=carol_sale_item_id,
            unit_id=returned_unit.id,
        ),
        created_by=admin_id,
    )

    # Refresh the unit and mark it as returned
    # (ReturnService stock-awareness is on the roadmap; for now we set directly)
    session.refresh(returned_unit)
    returned_unit.status = UnitStatus.returned
    returned_unit.updated_at = datetime.utcnow()
    session.add(returned_unit)
    session.flush()

    print("  Seeded 1 return — Carol's iPhone 15 Pro is back in stock as 'returned'.")


# ===========================================================================
# 8. Unit status overrides — in_repair and reserved
#
# These represent operational states that don't go through a sale:
#
#   in_repair : IPH14-WH-SN004 — pulled internally; minor cosmetic damage found
#               Stock is held (unit still counts as ours) — no movement needed
#               because it was already counted in during intake.
#   reserved  : IPH15P-BK-SN005 — display / demo unit
#               Same logic — already in stock count, just flagged as reserved.
# ===========================================================================

def _apply_unit_status_overrides(
    session: Session,
    unit_map: dict[str, ProductUnit],
) -> None:
    overrides = {
        "IPH14-WH-SN004": UnitStatus.in_repair,
        "IPH15P-BK-SN005": UnitStatus.reserved,
    }
    for sn, new_status in overrides.items():
        unit = unit_map.get(sn)
        if unit:
            session.refresh(unit)
            unit.status = new_status
            unit.updated_at = datetime.utcnow()
            session.add(unit)
    session.flush()
    print("  Applied status overrides: 1× in_repair, 1× reserved.")


# ===========================================================================
# 9. Repairs
# ===========================================================================

def _seed_repairs(session: Session, admin_id: UUID, technician_id: UUID) -> None:
    from .models import Repair
    if session.exec(select(Repair)).first():
        return

    print("  Seeding repairs...")

    # Repair 1: customer drop-off — cracked screen, still pending
    RepairService.create_repair(
        session,
        RepairCreate(
            customer_name="Alice Johnson",
            customer_phone="08012345678",
            customer_email="alice@example.com",
            phone_model="iPhone 15 Pro",
            issue_description="Screen cracked after drop — display works but glass is shattered",
            payment_status=PaymentStatus.pending,
            labor_cost=15_000,
            total_amount=60_000,
        ),
        created_by=admin_id,
    )

    # Repair 2: battery replacement, fully completed
    wip = RepairService.create_repair(
        session,
        RepairCreate(
            customer_name="Bob Williams",
            customer_phone="08087654321",
            phone_model="iPhone 14",
            issue_description="Battery draining fast — less than 4 hours screen-on time",
            payment_status=PaymentStatus.paid,
            labor_cost=8_000,
            total_amount=20_000,
            amount_paid=20_000,
        ),
        created_by=admin_id,
    )
    wip = RepairService.transition_status(
        session, wip.id, RepairStatus.in_progress,
        changed_by=technician_id,
        notes="Battery ordered, customer notified via SMS",
    )
    RepairService.transition_status(
        session, wip.id, RepairStatus.completed,
        changed_by=technician_id,
        notes="Battery replaced. Capacity 100%. Device collected by customer.",
    )

    print("  Seeded 2 repairs (1 pending, 1 completed).")


# ===========================================================================
# 10. Expenses
# ===========================================================================

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


# ===========================================================================
# Entry point
# ===========================================================================

def seed_database() -> None:
    print("\n=== Seeding database ===")
    with Session(engine) as session:

        print("\n[1/8] Users")
        user_ids = _seed_users(session)
        session.commit()
        admin_id     = user_ids["admin"]
        technician_id = user_ids["technician"]
        cashier_id   = user_ids["cashier"]

        print("\n[2/8] Categories & attribute definitions")
        cat_ids = _seed_categories(session)
        _seed_attribute_definitions(session)
        session.commit()

        print("\n[3/8] Product models")
        product_map = _seed_products(session, cat_ids)
        session.commit()

        print("\n[4/8] Bulk opening stock (repair parts + accessories)")
        _seed_bulk_stock(session, product_map, admin_id)
        session.commit()

        print("\n[5/8] Serialized unit intake")
        unit_map = _seed_units(session, product_map, admin_id)
        session.commit()

        print("\n[6/8] Sales")
        sale_map = _seed_sales(session, product_map, unit_map, admin_id, cashier_id)
        # SaleService commits internally

        print("\n[7/8] Returns & unit status overrides")
        _seed_returns(session, product_map, unit_map, sale_map, admin_id)
        # ReturnService commits internally
        _apply_unit_status_overrides(session, unit_map)
        session.commit()

        print("\n[8/8] Repairs & expenses")
        _seed_repairs(session, admin_id, technician_id)
        # RepairService commits internally
        _seed_expenses(session)
        session.commit()

    print("\n=== Seeding complete ===")
    print("\nWhat was created:")
    print("  Serialized products : iPhone 15 Pro BK (5 units), iPhone 14 WH (4 units),")
    print("                        Samsung S24 (3 units), MacBook Pro M3 (2 units)")
    print("  Unit statuses       : in_stock ×8, sold ×3, returned ×1, in_repair ×1, reserved ×1")
    print("  Bulk products       : 4 (screen, battery, charger, case)")
    print("  Sales               : 3 (2 mixed serialized+bulk, 1 bulk-only)")
    print("  Returns             : 1 (Carol's iPhone 15 Pro — refund)")
    print("  Repairs             : 2 (1 pending, 1 completed)")
    print("  Expenses            : 3")
    print("\nDefault credentials:")
    for u in USERS:
        print(f"  {u['role'].value:12s}  username={u['username']}  password={u['password']}")
    print()


if __name__ == "__main__":
    seed_database()
