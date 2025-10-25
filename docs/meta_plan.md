# 📦 Gadget + Repair + Accessory Inventory System

**Author:** Alphadevking
**Date:** 2025-08-07
**Tech Stack:** FastAPI · PostgreSQL (NeonDB) · Pipenv · Vercel · HTML/CSS/JS

---

## 🧭 Overview

This system combines inventory and operations management for:

- Gadget and accessory sales
- Repair parts tracking and repair job logging
- Profit/loss, expenses, and returns
- Debtors and supplier information

---

## 🧱 System Modules

| Module | Description |
|--------|-------------|
| **Inventory** | Unified stock system (gadgets, accessories, repair parts) |
| **Sales** | Tracks gadget + accessory sales |
| **Repairs** | Tracks repairs, assigned techs, and used parts |
| **Expenses** | Operational and repair costs |
| **Profit & Loss** | Auto-calculated summaries |
| **Returns** | Logs refunds, returns, repairs |
| **Debtors** | Tracks customers with outstanding balances |
| **Suppliers** | Logs who supplies what, at what cost |
| **Low Stock Alerts** | Flags items below threshold |
| **Dashboard** | Summarized overview |
| **User Roles (Optional)** | Admin, Technician, Sales roles (future-proof) |

---

## ⚙️ Tech Stack

| Layer | Tool |
|-------|------|
| Backend | FastAPI + SQLModel |
| Frontend | HTML/CSS/Vanilla JS |
| Database | PostgreSQL (NeonDB) |
| Virtual Environment | Pipenv |
| Deployment | Vercel |
| Environment Config | python-dotenv |

---

## 🧪 Pipenv Setup

```bash
pip install pipenv
pipenv --python 3.11
pipenv install fastapi uvicorn sqlmodel psycopg2-binary python-dotenv
pipenv shell
```

---

## 🗃️ Database Schema (NeonDB)

### products

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT CHECK (category IN ('gadget', 'accessory', 'repair_part')),
  brand_model TEXT,
  variant TEXT DEFAULT '',
  supplier TEXT,
  quantity INTEGER NOT NULL DEFAULT 0,
  min_threshold INTEGER NOT NULL DEFAULT 3,
  cost_price NUMERIC(10, 2),
  selling_price NUMERIC(10, 2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### sales

```sql
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id),
  date DATE DEFAULT CURRENT_DATE,
  quantity INTEGER,
  unit_price NUMERIC(10,2),
  total_price NUMERIC(10,2),
  customer TEXT,
  payment_status TEXT CHECK (payment_status IN ('paid', 'owing')),
  amount_paid NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### repairs

```sql
CREATE TABLE repairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer TEXT,
  phone_model TEXT,
  issue_description TEXT,
  technician TEXT,
  parts_used UUID[],
  repair_status TEXT CHECK (repair_status IN ('pending', 'in_progress', 'done')),
  date_received DATE,
  date_completed DATE,
  amount_charged NUMERIC(10,2),
  payment_status TEXT CHECK (payment_status IN ('paid', 'pending')),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### expenses

```sql
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE DEFAULT CURRENT_DATE,
  description TEXT,
  amount NUMERIC(10,2),
  category TEXT,
  ref_no TEXT
);
```

### returns

```sql
CREATE TABLE returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id),
  reason TEXT,
  action_taken TEXT CHECK (action_taken IN ('refund', 'repair', 'exchange')),
  customer TEXT,
  status TEXT CHECK (status IN ('resolved', 'pending')),
  date DATE DEFAULT CURRENT_DATE
);
```

---

## 📁 Project Structure

```
gadget-inventory/
├── api/
│   ├── main.py
│   ├── database.py
│   ├── models.py
│   ├── crud/
│   │   ├── inventory.py
│   │   ├── sales.py
│   │   ├── repairs.py
│   │   ├── expenses.py
│   │   └── returns.py
│   └── .env.example
├── public/
│   ├── index.html
│   ├── repairs.html
│   ├── sales.html
│   ├── js/
│   └── css/
├── Pipfile
├── Pipfile.lock
├── vercel.json
└── README.md
```

---

## 🚀 Deployment (Vercel)

### `vercel.json`

```json
{
  "version": 2,
  "builds": [
    { "src": "api/main.py", "use": "@vercel/python" },
    { "src": "public/**/*", "use": "@vercel/static" }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "api/main.py" },
    { "src": "/(.*)", "dest": "/public/$1" }
  ]
}
```

Set `DATABASE_URL` in Vercel environment settings.

---

## ✨ Advanced Features

| Feature | Priority |
|---------|----------|
| Dashboard Widgets | ✅ High |
| Barcode Scanning | 🔄 Medium |
| User Roles | 🔄 Optional |
| CSV Export | ✅ High |
| Product Images | 🔄 Low |

---

## 🧠 API Endpoint Ideas

- `GET /dashboard`
- `GET /summary/financial`
- `POST /repairs/`
- `GET /products/low-stock`
- `GET /sales/debtors`

---

## ✅ Next Steps

1. Finalize DB schema in NeonDB
2. Scaffold FastAPI app with Pipenv
3. Connect FastAPI to NeonDB
4. Build frontend templates (HTML + JS)
5. Deploy to Vercel

---

*End of meta plan.*
