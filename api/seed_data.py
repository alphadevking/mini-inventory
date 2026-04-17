"""
seed_data.py
============
Populates a fresh database with realistic demo data that mirrors the actual
application flow.  Every stock change is a CONSEQUENCE of a business action:

  Products created  → no stock yet
  Purchase recorded → PurchaseService creates ProductUnits + StockMovements
  Sale recorded     → SaleService deducts stock, marks units sold
  Return recorded   → ReturnService restores stock, unit marked returned
  Status overrides  → in_repair / reserved applied directly (no stock change)

Flow
----
[1]  Users
[2]  Categories & subcategories
[3]  Attribute definitions
[4]  Product models  (zero stock — placeholder definitions only)
[5]  Purchase 1 — Apple / serialized smartphones  (iPhones)
[6]  Purchase 2 — Samsung / Tech  (Galaxy S24 + MacBook Pro)
[7]  Purchase 3 — Parts & Accessories  (bulk items)
[8]  Sales  (via SaleService — stock deducted, units marked sold)
[9]  Returns  (via ReturnService — stock restored, unit marked returned)
[10] Status overrides  (in_repair, reserved)
[11] Repairs
[12] Expenses

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
    Purchase,
    PurchaseCreate,
    PurchaseItemCreate,
    ProductUnitSpec,
    Expense,
    ExpenseCategory,
    RepairCreate,
    RepairStatus,
    PaymentStatus,
    PaymentMethod,
    SaleCreate,
    SaleItemCreate,
    ReturnCreate,
    ReturnAction,
    SaleItem,
)
from .services.purchase_service import PurchaseService
from .services.repair_service import RepairService
from .services.sale_service import SaleService
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
                {"name": "iPhone",   "description": "Apple iPhones",          "icon": "smartphone"},
                {"name": "Android",  "description": "Android smartphones",    "icon": "smartphone"},
            ],
        },
        {
            "name": "Laptops",
            "description": "Portable computers",
            "icon": "laptop",
            "color": "#10B981",
            "subcategories": [
                {"name": "MacBook",         "description": "Apple laptops",   "icon": "laptop"},
                {"name": "Windows Laptop",  "description": "Windows laptops", "icon": "laptop"},
            ],
        },
        {
            "name": "Accessories",
            "description": "Cables, cases, chargers",
            "icon": "plug",
            "color": "#F59E0B",
            "subcategories": [
                {"name": "Chargers", "description": "Charging cables and adapters", "icon": "plug"},
                {"name": "Cases",    "description": "Protective cases",             "icon": "shield"},
            ],
        },
        {
            "name": "Repair Parts",
            "description": "Spare parts used in repairs",
            "icon": "wrench",
            "color": "#EF4444",
            "subcategories": [
                {"name": "Screens",    "description": "Replacement screens",    "icon": "monitor"},
                {"name": "Batteries",  "description": "Replacement batteries",  "icon": "battery"},
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
    sub = session.exec(
        select(ProductSubcategory).where(ProductSubcategory.name == name)
    ).first()
    return sub.id if sub else None


# ===========================================================================
# 3. Attribute definitions
# ===========================================================================

def _seed_attribute_definitions(session: Session) -> None:
    if session.exec(select(ProductAttributeDefinition)).first():
        return
    print("  Seeding attribute definitions...")
    attr_map = {
        "iPhone": [
            {"name": "storage",   "display_name": "Storage",   "data_type": "select",
             "options": ["128GB", "256GB", "512GB", "1TB"], "required": True},
            {"name": "color",     "display_name": "Color",     "data_type": "string", "required": True},
            {"name": "condition", "display_name": "Condition", "data_type": "select",
             "options": ["New", "Like New", "Refurbished"], "required": True},
        ],
        "Android": [
            {"name": "storage", "display_name": "Storage", "data_type": "select",
             "options": ["128GB", "256GB", "512GB"], "required": True},
            {"name": "ram",     "display_name": "RAM",     "data_type": "select",
             "options": ["8GB", "12GB", "16GB"],    "required": True},
            {"name": "color",   "display_name": "Color",   "data_type": "string", "required": True},
        ],
        "MacBook": [
            {"name": "chip",    "display_name": "Chip",    "data_type": "select",
             "options": ["M2", "M3", "M3 Pro", "M3 Max"], "required": True},
            {"name": "ram",     "display_name": "RAM",     "data_type": "select",
             "options": ["8GB", "16GB", "36GB", "48GB"],  "required": True},
            {"name": "storage", "display_name": "SSD",     "data_type": "select",
             "options": ["256GB", "512GB", "1TB", "2TB"], "required": True},
        ],
        "Screens": [
            {"name": "quality", "display_name": "Screen Quality", "data_type": "select",
             "options": ["OEM", "Premium Aftermarket", "Standard"], "required": True},
        ],
        "Batteries": [
            {"name": "capacity", "display_name": "Capacity (mAh)", "data_type": "number",
             "required": True},
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
# 4. Product models  (zero stock — stock comes from purchases)
# ===========================================================================

def _seed_products(session: Session, cat_ids: dict[str, UUID]) -> dict[str, UUID]:
    """Returns name → product_id map. No stock is set here."""
    existing = session.exec(select(Product)).first()
    if existing:
        return {p.name: p.id for p in session.exec(select(Product)).all()}

    print("  Seeding product models...")
    iphone_sub  = _get_sub_id(session, "iPhone")
    android_sub = _get_sub_id(session, "Android")
    macbook_sub = _get_sub_id(session, "MacBook")
    screen_sub  = _get_sub_id(session, "Screens")
    battery_sub = _get_sub_id(session, "Batteries")
    charger_sub = _get_sub_id(session, "Chargers")
    case_sub    = _get_sub_id(session, "Cases")

    products = [
        # ── Serialized ────────────────────────────────────────────────────────
        Product(
            name="iPhone 15 Pro 256GB Black Titanium",
            sku="IPH-15P-256-BK", barcode="194253714743",
            brand="Apple", model="iPhone 15 Pro",
            category_id=cat_ids.get("Smartphones"), subcategory_id=iphone_sub,
            last_purchase_cost=900_000, suggested_sell_price=1_099_000,
            current_stock=0, low_stock_threshold=2,
            attributes={"storage": "256GB", "color": "Black Titanium", "condition": "New"},
        ),
        Product(
            name="iPhone 14 128GB White",
            sku="IPH-14-128-WH", barcode="194253379736",
            brand="Apple", model="iPhone 14",
            category_id=cat_ids.get("Smartphones"), subcategory_id=iphone_sub,
            last_purchase_cost=650_000, suggested_sell_price=799_000,
            current_stock=0, low_stock_threshold=2,
            attributes={"storage": "128GB", "color": "White", "condition": "New"},
        ),
        Product(
            name="Samsung Galaxy S24 256GB",
            sku="SAM-S24-256-GR", barcode="8806095073361",
            brand="Samsung", model="Galaxy S24",
            category_id=cat_ids.get("Smartphones"), subcategory_id=android_sub,
            last_purchase_cost=700_000, suggested_sell_price=850_000,
            current_stock=0, low_stock_threshold=2,
            attributes={"storage": "256GB", "ram": "8GB", "color": "Marble Gray", "condition": "New"},
        ),
        Product(
            name='MacBook Pro 14" M3 Pro 18GB 512GB',
            sku="MBP-14-M3P-18-512", barcode="195949083457",
            brand="Apple", model="MacBook Pro 14-inch",
            category_id=cat_ids.get("Laptops"), subcategory_id=macbook_sub,
            last_purchase_cost=1_800_000, suggested_sell_price=2_199_000,
            current_stock=0, low_stock_threshold=1,
            attributes={"chip": "M3 Pro", "ram": "18GB", "storage": "512GB"},
        ),
        # ── Bulk ─────────────────────────────────────────────────────────────
        Product(
            name="iPhone 15 Pro OLED Screen (OEM)",
            sku="PART-IPH15P-SCR-OEM",
            brand="Apple", model="iPhone 15 Pro",
            category_id=cat_ids.get("Repair Parts"), subcategory_id=screen_sub,
            last_purchase_cost=45_000, suggested_sell_price=65_000,
            current_stock=0, low_stock_threshold=3,
            attributes={"quality": "OEM"},
        ),
        Product(
            name="iPhone 14 Battery (OEM)",
            sku="PART-IPH14-BAT-OEM",
            brand="Apple", model="iPhone 14",
            category_id=cat_ids.get("Repair Parts"), subcategory_id=battery_sub,
            last_purchase_cost=12_000, suggested_sell_price=18_000,
            current_stock=0, low_stock_threshold=4,
            attributes={"capacity": 3279},
        ),
        Product(
            name="USB-C 65W GaN Charger",
            sku="ACC-USBC-65W-GAN",
            brand="Generic", model="65W GaN",
            category_id=cat_ids.get("Accessories"), subcategory_id=charger_sub,
            last_purchase_cost=8_000, suggested_sell_price=14_500,
            current_stock=0, low_stock_threshold=5,
        ),
        Product(
            name="iPhone 15 Pro Clear Case",
            sku="ACC-IPH15P-CASE-CLR",
            brand="Generic",
            category_id=cat_ids.get("Accessories"), subcategory_id=case_sub,
            last_purchase_cost=2_500, suggested_sell_price=5_000,
            current_stock=0, low_stock_threshold=5,
        ),
    ]

    for p in products:
        session.add(p)
    session.flush()

    product_map = {p.name: p.id for p in products}
    print(f"  Seeded {len(products)} product models (0 stock — awaiting purchases).")
    return product_map


# ===========================================================================
# 5 & 6. Purchases — stock flows in through PurchaseService
#
# Purchase 1 (Apple):  iPhone 15 Pro ×5  +  iPhone 14 ×4
# Purchase 2 (Samsung/Tech):  Samsung S24 ×3  +  MacBook Pro ×2
# Purchase 3 (Parts & Accessories):  bulk items — Screen, Battery, Charger, Case
#
# For serialized items we pass a `units` list with serial / IMEI per device.
# PurchaseService creates the ProductUnit rows + StockMovements atomically.
# For bulk items no `units` list is needed — PurchaseService calls move_stock
# with the full quantity in one go.
# ===========================================================================

def _seed_purchases(
    session: Session,
    product_map: dict[str, UUID],
    admin_id: UUID,
) -> dict[str, ProductUnit]:
    """
    Returns serial_number → ProductUnit map so the sales / return / status
    override seeds can reference specific devices.
    """
    if session.exec(select(Purchase)).first():
        units = session.exec(select(ProductUnit)).all()
        return {u.serial_number: u for u in units}

    print("  Seeding purchases...")
    today      = date.today()
    intake_day = today - timedelta(days=14)   # stock arrived two weeks ago

    # ── Purchase 1: Apple — serialized smartphones ────────────────────────────
    PurchaseService.create_purchase(
        session,
        PurchaseCreate(
            supplier="Apple Distribution West Africa",
            reference_number="APL-INV-2024-001",
            delivery_date=intake_day,
            transport_cost=25_000,
            notes="Q1 iPhone stock",
            items=[
                PurchaseItemCreate(
                    product_id=product_map["iPhone 15 Pro 256GB Black Titanium"],
                    quantity=5,
                    unit_cost=900_000,
                    units=[
                        ProductUnitSpec(serial_number="IPH15P-BK-SN001", imei="354100000000001",
                                        color="Black Titanium", storage="256GB"),
                        ProductUnitSpec(serial_number="IPH15P-BK-SN002", imei="354100000000002",
                                        color="Black Titanium", storage="256GB"),
                        ProductUnitSpec(serial_number="IPH15P-BK-SN003", imei="354100000000003",
                                        color="Black Titanium", storage="256GB"),
                        ProductUnitSpec(serial_number="IPH15P-BK-SN004", imei="354100000000004",
                                        color="Black Titanium", storage="256GB"),
                        ProductUnitSpec(serial_number="IPH15P-BK-SN005", imei="354100000000005",
                                        color="Black Titanium", storage="256GB",
                                        notes="Display unit — do not sell"),
                    ],
                ),
                PurchaseItemCreate(
                    product_id=product_map["iPhone 14 128GB White"],
                    quantity=4,
                    unit_cost=650_000,
                    units=[
                        ProductUnitSpec(serial_number="IPH14-WH-SN001", imei="354200000000001",
                                        color="White", storage="128GB"),
                        ProductUnitSpec(serial_number="IPH14-WH-SN002", imei="354200000000002",
                                        color="White", storage="128GB"),
                        ProductUnitSpec(serial_number="IPH14-WH-SN003", imei="354200000000003",
                                        color="White", storage="128GB"),
                        ProductUnitSpec(serial_number="IPH14-WH-SN004", imei="354200000000004",
                                        color="White", storage="128GB",
                                        notes="Pulled for internal screen check — minor scratch"),
                    ],
                ),
            ],
        ),
        created_by=admin_id,
    )

    # ── Purchase 2: Samsung / Tech ────────────────────────────────────────────
    PurchaseService.create_purchase(
        session,
        PurchaseCreate(
            supplier="Samsung Electronics Nigeria",
            reference_number="SAM-INV-2024-001",
            delivery_date=intake_day,
            transport_cost=18_000,
            items=[
                PurchaseItemCreate(
                    product_id=product_map["Samsung Galaxy S24 256GB"],
                    quantity=3,
                    unit_cost=700_000,
                    units=[
                        ProductUnitSpec(serial_number="SAM-S24-SN001", imei="354300000000001",
                                        color="Marble Gray", storage="256GB"),
                        ProductUnitSpec(serial_number="SAM-S24-SN002", imei="354300000000002",
                                        color="Marble Gray", storage="256GB"),
                        ProductUnitSpec(serial_number="SAM-S24-SN003", imei="354300000000003",
                                        color="Marble Gray", storage="256GB"),
                    ],
                ),
                PurchaseItemCreate(
                    product_id=product_map['MacBook Pro 14" M3 Pro 18GB 512GB'],
                    quantity=2,
                    unit_cost=1_800_000,
                    units=[
                        ProductUnitSpec(serial_number="MBP14-M3P-SN001",
                                        color="Space Black", storage="512GB"),
                        ProductUnitSpec(serial_number="MBP14-M3P-SN002",
                                        color="Space Black", storage="512GB"),
                    ],
                ),
            ],
        ),
        created_by=admin_id,
    )

    # ── Purchase 3: Parts & Accessories (bulk) ────────────────────────────────
    PurchaseService.create_purchase(
        session,
        PurchaseCreate(
            supplier="TechParts Wholesale",
            reference_number="TPW-INV-2024-001",
            delivery_date=intake_day - timedelta(days=3),
            transport_cost=5_000,
            notes="Monthly parts replenishment",
            items=[
                PurchaseItemCreate(
                    product_id=product_map["iPhone 15 Pro OLED Screen (OEM)"],
                    quantity=10,
                    unit_cost=45_000,
                    # no units → bulk intake
                ),
                PurchaseItemCreate(
                    product_id=product_map["iPhone 14 Battery (OEM)"],
                    quantity=15,
                    unit_cost=12_000,
                ),
                PurchaseItemCreate(
                    product_id=product_map["USB-C 65W GaN Charger"],
                    quantity=20,
                    unit_cost=8_000,
                ),
                PurchaseItemCreate(
                    product_id=product_map["iPhone 15 Pro Clear Case"],
                    quantity=15,
                    unit_cost=2_500,
                ),
            ],
        ),
        created_by=admin_id,
    )

    # Build unit map from DB (PurchaseService committed above)
    units = session.exec(select(ProductUnit)).all()
    unit_map = {u.serial_number: u for u in units}
    print(f"  Seeded 3 purchases → {len(unit_map)} serialized units received, "
          f"bulk stock set for 4 products.")
    return unit_map


# ===========================================================================
# 8. Sales
#
# Sale 1 — Carol Davis:  1× iPhone 15 Pro SN003 (serialized)
# Sale 2 — David Okafor: 1× iPhone 14 SN003 + 1× Samsung S24 SN003 + 2× Charger (bulk)
# Sale 3 — Eve Chen:     3× iPhone 15 Pro Clear Case (bulk only)
#
# SaleService commits internally, so we capture the returned SaleRead objects
# for use in the return seed.
# ===========================================================================

def _seed_sales(
    session: Session,
    product_map: dict[str, UUID],
    unit_map: dict[str, ProductUnit],
    cashier_id: UUID,
) -> dict[str, object]:
    """Returns sale_key → SaleRead for downstream seeds."""
    from .models import Sale
    if session.exec(select(Sale)).first():
        existing = session.exec(select(Sale)).all()
        sale_map: dict[str, object] = {}
        for s in existing:
            if s.customer_name == "Carol Davis":
                sale_map["carol"] = s
        return sale_map

    print("  Seeding sales...")

    charger_id = product_map["USB-C 65W GaN Charger"]
    case_id    = product_map["iPhone 15 Pro Clear Case"]

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
                SaleItemCreate(product_id=charger_id, quantity=2),
            ],
        ),
        created_by=cashier_id,
    )

    SaleService.create_sale(
        session,
        SaleCreate(
            sale_date=date.today() - timedelta(days=1),
            customer_name="Eve Chen",
            customer_phone="08099988877",
            payment_method=PaymentMethod.card,
            payment_status=PaymentStatus.paid,
            amount_paid=15_000,
            items=[SaleItemCreate(product_id=case_id, quantity=3)],
        ),
        created_by=cashier_id,
    )

    print("  Seeded 3 sales (2 serialized, 1 bulk).")
    return {"carol": carol_sale}


# ===========================================================================
# 9. Return — Carol's iPhone 15 Pro SN003 comes back
#
# ReturnService: restores stock (+1), creates StockMovement(return_in)
# Then we mark the unit status = returned directly (ReturnService does not
# yet manage unit status — future enhancement).
# The return is fully linked: original_sale_id + original_sale_item_id + unit_id
# ===========================================================================

def _seed_returns(
    session: Session,
    unit_map: dict[str, ProductUnit],
    sale_map: dict[str, object],
    admin_id: UUID,
) -> None:
    from .models import Return
    if session.exec(select(Return)).first():
        return

    print("  Seeding return...")
    returned_unit = unit_map["IPH15P-BK-SN003"]

    # Resolve Carol's sale and specific line item
    carol_sale    = sale_map.get("carol")
    carol_sale_id: UUID | None = None
    carol_item_id: UUID | None = None

    if carol_sale is not None:
        carol_sale_id = carol_sale.id  # type: ignore[union-attr]
        carol_item = session.exec(
            select(SaleItem).where(
                SaleItem.sale_id == carol_sale_id,
                SaleItem.unit_id == returned_unit.id,
            )
        ).first()
        if carol_item:
            carol_item_id = carol_item.id

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
            original_sale_item_id=carol_item_id,
            unit_id=returned_unit.id,
        ),
        created_by=admin_id,
    )

    # Mark the unit as returned (ReturnService restores stock but doesn't
    # update unit.status yet — direct override here)
    session.refresh(returned_unit)
    returned_unit.status = UnitStatus.returned
    returned_unit.updated_at = datetime.utcnow()
    session.add(returned_unit)
    session.flush()

    print("  Seeded 1 return — Carol's iPhone 15 Pro back in stock as 'returned'.")


# ===========================================================================
# 10. Unit status overrides
#
# in_repair : IPH14-WH-SN004 — internal screen check (no stock movement needed;
#             unit was already counted in during purchase intake)
# reserved  : IPH15P-BK-SN005 — display / demo unit
# ===========================================================================

def _apply_unit_status_overrides(
    session: Session,
    unit_map: dict[str, ProductUnit],
) -> None:
    overrides = {
        "IPH14-WH-SN004":  UnitStatus.in_repair,
        "IPH15P-BK-SN005": UnitStatus.reserved,
    }
    for sn, new_status in overrides.items():
        unit = unit_map.get(sn)
        if unit:
            session.refresh(unit)
            unit.status     = new_status
            unit.updated_at = datetime.utcnow()
            session.add(unit)
    session.flush()
    print("  Applied unit status overrides: 1× in_repair, 1× reserved.")


# ===========================================================================
# 11. Repairs
# ===========================================================================

def _seed_repairs(session: Session, admin_id: UUID, technician_id: UUID) -> None:
    from .models import Repair
    if session.exec(select(Repair)).first():
        return

    print("  Seeding repairs...")

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
        ),
        created_by=admin_id,
    )

    wip = RepairService.create_repair(
        session,
        RepairCreate(
            customer_name="Bob Williams",
            customer_phone="08087654321",
            phone_model="iPhone 14",
            issue_description="Battery draining fast — less than 4 hours screen-on time",
            payment_status=PaymentStatus.paid,
            labor_cost=8_000,
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
# 12. Expenses
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
        user_ids      = _seed_users(session)
        session.commit()
        admin_id      = user_ids["admin"]
        technician_id = user_ids["technician"]
        cashier_id    = user_ids["cashier"]

        print("\n[2/8] Categories & attribute definitions")
        cat_ids = _seed_categories(session)
        _seed_attribute_definitions(session)
        session.commit()

        print("\n[3/8] Product models  (zero stock)")
        product_map = _seed_products(session, cat_ids)
        session.commit()

        print("\n[4/8] Purchases  (stock flows in here)")
        unit_map = _seed_purchases(session, product_map, admin_id)
        # PurchaseService commits each purchase internally

        print("\n[5/8] Sales")
        sale_map = _seed_sales(session, product_map, unit_map, cashier_id)
        # SaleService commits internally

        print("\n[6/8] Returns & unit status overrides")
        _seed_returns(session, unit_map, sale_map, admin_id)
        # ReturnService commits internally
        _apply_unit_status_overrides(session, unit_map)
        session.commit()

        print("\n[7/8] Repairs")
        _seed_repairs(session, admin_id, technician_id)
        # RepairService commits internally

        print("\n[8/8] Expenses")
        _seed_expenses(session)
        session.commit()

    print("\n=== Seeding complete ===")
    print("\nWhat was created:")
    print("  Purchase 1  : Apple — iPhone 15 Pro ×5 + iPhone 14 ×4  (serialized)")
    print("  Purchase 2  : Samsung — Galaxy S24 ×3 + MacBook Pro ×2  (serialized)")
    print("  Purchase 3  : TechParts — Screen ×10, Battery ×15, Charger ×20, Case ×15  (bulk)")
    print("  Unit statuses: in_stock ×8, sold ×3, returned ×1, in_repair ×1, reserved ×1")
    print("  Sales       : 3  (Carol — iPhone 15 Pro; David — iPhone 14 + S24 + Chargers; Eve — Cases)")
    print("  Returns     : 1  (Carol's iPhone 15 Pro — fully linked to sale + unit)")
    print("  Repairs     : 2  (1 pending, 1 completed)")
    print("  Expenses    : 3")
    print("\nDefault credentials:")
    for u in USERS:
        print(f"  {u['role'].value:12s}  username={u['username']}  password={u['password']}")
    print()


if __name__ == "__main__":
    seed_database()
