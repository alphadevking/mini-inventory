Okay, Favour, this is an excellent plan! Building this as a web application with FastAPI for the backend and HTML/CSS/JS for the frontend, hosted serverlessly on Vercel, is a solid approach. It provides a more robust and accessible solution than a spreadsheet alone.

This guide is designed for an agent (developer) and will be highly detailed, breaking down the process into phases with code examples and deployment instructions.

---

## **Project: Phone Repair Parts Inventory & Profit System**

### **Overall Architecture:**

1.  **Frontend (HTML/CSS/JS):** A single-page application (or multi-page if preferred for simplicity) to interact with the API. Basic HTML for structure, CSS for styling, and Vanilla JavaScript for making API calls and dynamically updating the UI.
2.  **Backend (FastAPI):** A Python API that handles data logic, interacts with the database, and provides endpoints for the frontend.
3.  **Database (Supabase - PostgreSQL):** A serverless PostgreSQL database to store all your inventory and transaction data. Supabase is chosen for its ease of use, generous free tier, built-in API, and good integration with serverless environments.
4.  **Hosting (Vercel):** Serverless deployment platform for both the FastAPI backend and the static HTML/CSS/JS frontend.

---

### **Phase 1: Project Setup & Prerequisites**

Before writing any code, ensure you have the necessary tools installed.

**1. Prerequisites:**
*   **Python 3.9+:** [Download Python](https://www.python.org/downloads/)
*   **Git:** [Download Git](https://git-scm.com/downloads)
*   **Node.js & npm (for Vercel CLI):** [Download Node.js](https://nodejs.org/en/download/)
*   **Vercel CLI:**
    ```bash
    npm install -g vercel
    ```
*   **Text Editor/IDE:** VS Code (recommended) or your preferred editor.

**2. Create Project Directory Structure:**

```
phone-inventory/
├── api/                  # FastAPI backend
│   ├── __init__.py
│   ├── main.py           # FastAPI application
│   ├── models.py         # Pydantic/SQLModel models
│   ├── database.py       # Database connection
│   └── .env.example      # Example environment variables
├── public/               # Frontend static files (HTML, CSS, JS)
│   ├── index.html        # Dashboard/main view
│   ├── inventory.html    # Manage products
│   ├── transactions.html # Record purchases/sales
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── app.js        # Main JavaScript logic
├── .gitignore            # Git ignore file
├── requirements.txt      # Python dependencies
├── vercel.json           # Vercel deployment configuration
└── README.md
```

---

### **Phase 2: Database Setup (Supabase)**

Supabase offers a PostgreSQL database with a powerful web interface.

**1. Create a Supabase Project:**
*   Go to [Supabase.com](https://supabase.com/) and sign up/log in.
*   Click "New project".
*   Choose an organization, name your project (e.g., `phone-inventory-db`), set a strong database password, and select a region closest to you.
*   Click "Create new project." This might take a few minutes.

**2. Get Database Connection String:**
*   Once your project is created, navigate to "Project Settings" (gear icon in the left sidebar) -> "Database".
*   Under "Connection String," find the `URI` (or `Connection string` in newer Supabase UI). It will look something like:
    `postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`
*   Copy this. You'll need it for your FastAPI application. **Replace `[YOUR-PASSWORD]` with your actual database password!**

**3. Define Database Schema (SQL):**

Go to your Supabase project dashboard, click "SQL Editor" (left sidebar), then "New Query." Execute the following SQL to create your tables.

**a. `products` table:**
This will store your product catalog.

```sql
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_model TEXT NOT NULL,
    part_type TEXT NOT NULL,
    variant TEXT DEFAULT '', -- Use empty string for no variant
    last_purchase_cost NUMERIC(10, 2) NOT NULL, -- Cost of the last batch purchased
    suggested_sell_price NUMERIC(10, 2) NOT NULL,
    low_stock_threshold INTEGER NOT NULL DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE UNIQUE INDEX idx_unique_product ON products (phone_model, part_type, variant);
```

**b. `transactions` table:**
This will store all purchases and sales.

```sql
CREATE TYPE transaction_type AS ENUM ('purchase', 'sale');

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    transaction_type transaction_type NOT NULL,
    quantity INTEGER NOT NULL,
    unit_cost NUMERIC(10, 2), -- Only for purchases
    unit_price NUMERIC(10, 2), -- Only for sales
    party_name TEXT, -- Supplier for purchase, Customer for sale
    transport_other_cost NUMERIC(10, 2) DEFAULT 0, -- Direct cost for this specific purchase order
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger to update product's last_purchase_cost on new purchase
CREATE OR REPLACE FUNCTION update_last_purchase_cost()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.transaction_type = 'purchase' THEN
        UPDATE products
        SET last_purchase_cost = NEW.unit_cost,
            updated_at = NOW()
        WHERE id = NEW.product_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_last_purchase_cost
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_last_purchase_cost();
```
*   **Explanation of Trigger:** When a new `purchase` transaction is inserted, the `last_purchase_cost` in the `products` table for that specific product `id` is automatically updated to the `unit_cost` of the new purchase. This automates part of the spreadsheet's manual update.

---

### **Phase 3: Backend Development (FastAPI)**

Now, let's build the API that will talk to Supabase.

**1. Create `requirements.txt`:**
In the `phone-inventory/` directory:

```
fastapi
uvicorn[standard]
sqlmodel
psycopg2-binary
python-dotenv
```

Install them:
```bash
cd phone-inventory
pip install -r requirements.txt
```

**2. Create `.env.example` (and `.env`):**
In `phone-inventory/api/`:

```
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
```
*   **Crucially:** Create a copy of this file named `.env` in the same directory and paste your actual Supabase connection string there. **Add `.env` to your `.gitignore`!**

**3. `phone-inventory/api/database.py`:**
This handles the database connection using SQLModel.

```python
from sqlmodel import create_engine, Session
import os
from dotenv import load_dotenv

load_dotenv() # Load environment variables from .env

DATABASE_URL = os.getenv("DATABASE_URL")

# Engine for database connection
engine = create_engine(DATABASE_URL, echo=False) # Set echo=True to see SQL queries in console

def create_db_and_tables():
    """Initializes the database tables (though Supabase handles this via SQL scripts).
    Useful for local testing with SQLite if needed."""
    # SQLModel.metadata.create_all(engine) # Not strictly needed if using external DB like Supabase where tables are pre-created

def get_session():
    """Dependency for FastAPI to get a database session."""
    with Session(engine) as session:
        yield session
```

**4. `phone-inventory/api/models.py`:**
Define your data models using SQLModel (which combines Pydantic and SQLAlchemy).

```python
from datetime import date, datetime
from typing import Optional
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel, Relationship, Column, Enum, TEXT
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

class ProductCreate(ProductBase):
    pass # No extra fields for creation

class ProductUpdate(ProductBase):
    # All fields optional for update, so you only send what you want to change
    phone_model: Optional[str] = None
    part_type: Optional[str] = None
    variant: Optional[str] = None
    last_purchase_cost: Optional[float] = None
    suggested_sell_price: Optional[float] = None
    low_stock_threshold: Optional[int] = None

class Product(ProductBase, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now, sa_column_kwargs={"onupdate": datetime.now})

    # Relationships (optional, but good for linking)
    transactions: list["Transaction"] = Relationship(back_populates="product")

    # This method can be used to calculate stock if not done via DB views/functions
    # For now, we'll calculate this in the endpoint or a helper function based on transactions
    # current_stock: Optional[int] = None # Not stored in DB, calculated on retrieval

# --- Transaction Models ---
class TransactionBase(SQLModel):
    product_id: UUID
    transaction_date: date = Field(default_factory=date.today)
    transaction_type: TransactionType = Field(sa_column=Column(Enum(TransactionType, name='transaction_type'), nullable=False))
    quantity: int
    unit_cost: Optional[float] = None # For purchase
    unit_price: Optional[float] = None # For sale
    party_name: Optional[str] = None # Supplier/Customer
    transport_other_cost: float = Field(default=0.00) # Only for purchase

class TransactionCreate(TransactionBase):
    pass # No extra fields for creation

class Transaction(TransactionBase, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.now)

    product: Optional[Product] = Relationship(back_populates="transactions")


# --- Response Models for Calculated Data (e.g., Stock, Profit) ---
class ProductReadWithStock(Product):
    current_stock: int
    status: str # "LOW" or "OK"

class TransactionRead(TransactionBase):
    id: UUID
    created_at: datetime
    product: Optional[Product] = None # Include product details in transaction read

class FinancialSummary(SQLModel):
    total_revenue: float
    total_cogs: float
    total_gross_profit: float
    total_transport_other_costs: float
    net_profit: float
```

**5. `phone-inventory/api/main.py`:**
This is your main FastAPI application.

```python
from typing import List
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select, func
from datetime import date, datetime
from uuid import UUID

from .database import get_session
from .models import (
    Product, ProductCreate, ProductUpdate, ProductReadWithStock,
    Transaction, TransactionCreate, TransactionType, FinancialSummary
)

app = FastAPI(
    title="Phone Inventory API",
    description="API for managing phone repair parts inventory, expenses, and profits.",
    version="1.0.0"
)

# CORS configuration (Crucial for frontend to talk to backend)
origins = [
    "http://localhost:8000", # For local frontend testing
    "http://localhost:3000", # Common for JS frameworks
    "http://127.0.0.1:8000",
    "https://your-vercel-frontend-url.vercel.app", # Replace with your Vercel frontend URL
    "*" # ONLY FOR DEVELOPMENT - REMOVE OR RESTRICT IN PRODUCTION
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Helper function for calculating product stock and status ---
def calculate_product_stock_and_status(product: Product, session: Session) -> dict:
    """Calculates current stock and status for a given product."""
    purchases = session.exec(
        select(func.sum(Transaction.quantity))
        .where(Transaction.product_id == product.id, Transaction.transaction_type == TransactionType.purchase)
    ).first() or 0

    sales = session.exec(
        select(func.sum(Transaction.quantity))
        .where(Transaction.product_id == product.id, Transaction.transaction_type == TransactionType.sale)
    ).first() or 0

    current_stock = purchases - sales
    status_text = "LOW" if current_stock <= product.low_stock_threshold else "OK"

    return {"current_stock": current_stock, "status": status_text}


# --- API Endpoints ---

@app.get("/")
async def root():
    return {"message": "Welcome to the Phone Inventory API!"}

# --- Products Endpoints ---

@app.post("/products/", response_model=Product)
async def create_product(*, session: Session = Depends(get_session), product: ProductCreate):
    db_product = Product.model_validate(product)
    session.add(db_product)
    session.commit()
    session.refresh(db_product)
    return db_product

@app.get("/products/", response_model=List[ProductReadWithStock])
async def read_products(*, session: Session = Depends(get_session)):
    products = session.exec(select(Product)).all()
    products_with_stock = []
    for product in products:
        stock_data = calculate_product_stock_and_status(product, session)
        products_with_stock.append(ProductReadWithStock.model_validate(product.model_dump() | stock_data))
    return products_with_stock

@app.get("/products/{product_id}", response_model=ProductReadWithStock)
async def read_product_by_id(*, session: Session = Depends(get_session), product_id: UUID):
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    stock_data = calculate_product_stock_and_status(product, session)
    return ProductReadWithStock.model_validate(product.model_dump() | stock_data)

@app.put("/products/{product_id}", response_model=Product)
async def update_product(*, session: Session = Depends(get_session), product_id: UUID, product: ProductUpdate):
    db_product = session.get(Product, product_id)
    if not db_product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    product_data = product.model_dump(exclude_unset=True)
    for key, value in product_data.items():
        setattr(db_product, key, value)

    db_product.updated_at = datetime.now() # Manually update updated_at

    session.add(db_product)
    session.commit()
    session.refresh(db_product)
    return db_product

@app.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(*, session: Session = Depends(get_session), product_id: UUID):
    # Check if there are any transactions linked to this product
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
async def get_low_stock_products(*, session: Session = Depends(get_session)):
    products = session.exec(select(Product)).all()
    low_stock_items = []
    for product in products:
        stock_data = calculate_product_stock_and_status(product, session)
        if stock_data["status"] == "LOW":
            low_stock_items.append(ProductReadWithStock.model_validate(product.model_dump() | stock_data))
    return low_stock_items


# --- Transactions Endpoints ---

@app.post("/transactions/", response_model=Transaction)
async def create_transaction(*, session: Session = Depends(get_session), transaction: TransactionCreate):
    # Validate product_id exists
    product = session.get(Product, transaction.product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found for this transaction.")

    db_transaction = Transaction.model_validate(transaction)
    session.add(db_transaction)
    session.commit()
    session.refresh(db_transaction)
    return db_transaction

@app.get("/transactions/", response_model=List[Transaction])
async def read_transactions(*, session: Session = Depends(get_session)):
    # Optionally load product details with each transaction
    transactions = session.exec(select(Transaction).order_by(Transaction.transaction_date.desc(), Transaction.created_at.desc())).all()
    return transactions

@app.get("/transactions/{transaction_id}", response_model=Transaction)
async def read_transaction_by_id(*, session: Session = Depends(get_session), transaction_id: UUID):
    transaction = session.get(Transaction, transaction_id)
    if not transaction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")
    return transaction

@app.delete("/transactions/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction(*, session: Session = Depends(get_session), transaction_id: UUID):
    transaction = session.get(Transaction, transaction_id)
    if not transaction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")

    session.delete(transaction)
    session.commit()
    return {"ok": True}


# --- Financial Summary Endpoint ---

@app.get("/summary/", response_model=FinancialSummary)
async def get_financial_summary(*, session: Session = Depends(get_session)):
    # Total Revenue (sum of unit_price * quantity for sales)
    total_revenue = session.exec(
        select(func.sum(Transaction.unit_price * Transaction.quantity))
        .where(Transaction.transaction_type == TransactionType.sale)
    ).first() or 0.0

    # Total COGS (sum of last_purchase_cost * quantity for sales)
    # This requires joining transactions with products to get the last_purchase_cost
    # This assumes `last_purchase_cost` from `products` table reflects the cost when sold.
    # For more accurate COGS (e.g., FIFO), a more complex ledger is needed.
    cogs_query = select(func.sum(Product.last_purchase_cost * Transaction.quantity)).join(
        Transaction, Transaction.product_id == Product.id
    ).where(Transaction.transaction_type == TransactionType.sale)
    total_cogs = session.exec(cogs_query).first() or 0.0

    total_gross_profit = total_revenue - total_cogs

    # Total Transport/Other Costs (sum from purchases)
    total_transport_other_costs = session.exec(
        select(func.sum(Transaction.transport_other_cost))
        .where(Transaction.transaction_type == TransactionType.purchase)
    ).first() or 0.0

    net_profit = total_gross_profit - total_transport_other_costs

    return FinancialSummary(
        total_revenue=total_revenue,
        total_cogs=total_cogs,
        total_gross_profit=total_gross_profit,
        total_transport_other_costs=total_transport_other_costs,
        net_profit=net_profit
    )
```

**6. Test Backend Locally:**
*   Navigate to `phone-inventory/api/` in your terminal.
*   Run the FastAPI application:
    ```bash
    uvicorn main:app --reload --host 0.0.0.0 --port 8000
    ```
*   Open your browser to `http://localhost:8000/docs` to see the FastAPI interactive documentation (Swagger UI). You can test all your endpoints here.

---

### **Phase 4: Frontend Development (HTML/CSS/JS)**

This will be a very basic, single-page application using vanilla JS to interact with your API.

**1. `phone-inventory/public/css/style.css`:**
(Example basic styling)

```css
body {
    font-family: sans-serif;
    margin: 20px;
    background-color: #f4f4f4;
    color: #333;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    background-color: #fff;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}

nav {
    margin-bottom: 20px;
    border-bottom: 1px solid #eee;
    padding-bottom: 10px;
}

nav a {
    margin-right: 15px;
    text-decoration: none;
    color: #007bff;
    font-weight: bold;
}

h1, h2 {
    color: #0056b3;
}

table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 15px;
}

table th, table td {
    border: 1px solid #ddd;
    padding: 8px;
    text-align: left;
}

table th {
    background-color: #f2f2f2;
}

.low-stock {
    background-color: #ffe0e0;
    color: #d8000c;
    font-weight: bold;
}

form {
    background-color: #f9f9f9;
    padding: 20px;
    border-radius: 8px;
    margin-top: 20px;
}

form label {
    display: block;
    margin-bottom: 5px;
    font-weight: bold;
}

form input[type="text"],
form input[type="number"],
form input[type="date"],
form select {
    width: calc(100% - 22px);
    padding: 10px;
    margin-bottom: 15px;
    border: 1px solid #ccc;
    border-radius: 4px;
}

form button {
    background-color: #28a745;
    color: white;
    padding: 10px 20px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
}

form button:hover {
    background-color: #218838;
}

.error-message {
    color: red;
    margin-bottom: 10px;
}
```

**2. `phone-inventory/public/js/app.js`:**
(Core JavaScript for API interaction and UI updates)

```javascript
// ... existing code ...
```

**3. `phone-inventory/public/index.html`:**
(Main HTML file structure)

```html
// ... existing code ...
```

**4. Test Frontend Locally:**
*   Open `phone-inventory/public/index.html` directly in your browser.
*   Ensure your FastAPI backend is running (`uvicorn main:app --reload --host 0.0.0.0 --port 8000`).
*   The frontend should now be able to communicate with your local backend.

---

### **Phase 5: Vercel Deployment**

Vercel will host your static frontend and your serverless FastAPI backend.

**1. Create `vercel.json`:**
In the root of your `phone-inventory/` directory:

```json
// ... existing code ...
```

**Explanation of `vercel.json`:**
*   `version: 2`: Specifies Vercel Build Output API v2.
*   `builds`:
    *   One build for `api/main.py` using `@vercel/python` builder. This turns your FastAPI app into a serverless function.
    *   Another build for `public/**` using `@vercel/static-build`. This tells Vercel to serve everything in your `public` directory as static assets.
*   `routes`:
    *   `src: "/api/(.*)"`: Any request starting with `/api/` will be routed to your `api/main.py` serverless function. This is why our frontend `API_BASE_URL` uses `/api`.
    *   `src: "/(.*)"`: All other requests will serve files from the `public` directory.
*   `env`: Specifies environment variables. `DATABASE_URL` will be set securely on Vercel.

**2. Set Environment Variables on Vercel:**
*   Go to your Vercel Dashboard -> Select your project -> "Settings" tab -> "Environment Variables".
*   Add a new environment variable:
    *   **Name:** `DATABASE_URL`
    *   **Value:** Paste your Supabase connection string (the one you put in `.env`).
    *   **Deployment Target:** `Production`, `Preview`, `Development` (select all).
*   Click "Add". **This is crucial for your API to connect to the database.**

**3. Deploy to Vercel:**

*   **Initial Deployment (from local):**
    ```bash
    cd phone-inventory
    vercel
    ```
    *   Follow the prompts: "Set up and deploy this project?", "Which scope?", "Link to existing project or create new?", "What's your project's name?".
    *   Vercel will detect your Python and static files based on `vercel.json` and deploy.
    *   It will give you a deployment URL (e.g., `https://your-project-name.vercel.app`).
*   **Update Frontend `API_BASE_URL`:**
    *   Once you have your Vercel deployment URL (e.g., `https://phone-inventory.vercel.app`), copy it.
    *   In `phone-inventory/public/js/app.js`, change:
        ```javascript
        const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
            ? "http://localhost:8000"
            : "https://your-vercel-backend-url.vercel.app/api"; // <-- UPDATE THIS LINE
        ```
        to:
        ```javascript
        const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
            ? "http://localhost:8000"
            : "https://phone-inventory.vercel.app/api"; // Use your actual Vercel domain + /api
        ```
    *   **Commit this change and push to Git.** Vercel typically integrates with Git repositories (GitHub, GitLab, Bitbucket). The simplest way to update is to push to your connected repo.

*   **Subsequent Deployments (Git Integration):**
    *   Connect your Vercel project to a Git repository (GitHub, GitLab, or Bitbucket) in your Vercel Dashboard.
    *   Every time you push changes to your `main` (or configured) branch, Vercel will automatically trigger a new deployment.

---

### **Phase 6: Refinement & Next Steps**

This provides a functional basic system. Here are areas for future improvement:

1.  **Error Handling & User Feedback (Frontend):** More sophisticated error messages, loading states, and success notifications in the UI.
2.  **Form Validation (Frontend & Backend):** Ensure input types and ranges are correct on both sides. FastAPI's Pydantic models handle a lot of this on the backend, but frontend validation improves user experience.
3.  **Authentication & Authorization:** Currently, anyone with the URL can access and modify data. Implement user login (e.g., using Supabase Auth or a custom FastAPI auth system) to protect your data.
4.  **Improved UI/UX:** Consider a JavaScript framework (React, Vue, Angular, Svelte) for a more interactive and dynamic user interface.
5.  **Pagination & Filtering:** For large datasets, implement pagination and filtering options on product and transaction lists.
6.  **Advanced Reporting:**
    *   Profit by product category.
    *   Sales trends over time (monthly, quarterly).
    *   Detailed expense breakdown.
7.  **Barcode Scanning:** Integrate a barcode scanner for faster inventory entry/exit.
8.  **Image Uploads:** If you want to associate product images, Vercel has an integration for image optimization, and Supabase offers storage.
9.  **Automated Low Stock Alerts:** Beyond just displaying, consider email/SMS notifications for low stock using external services.
10. **Data Export:** Add functionality to export data to CSV or Excel.

---

This detailed plan should get you or your agent started on building a powerful and scalable inventory and profit tracking system for Favour CSC! Good luck!