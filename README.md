# Mini Inventory System

A comprehensive inventory management system for phone repair parts and mobile devices with expense tracking, profit analysis, and ERP features.

## Features

- 📱 **Product Management**: Track phone models, part types, and variants with detailed attributes.
- 📂 **Multi-level Categories**: Organise products with categories and subcategories (e.g., Smartphones > iPhone).
- 📊 **Stock Tracking**: Real-time inventory monitoring with low stock alerts.
- 💰 **Financial Management**: Track purchases, sales, and expenses in Nigerian Naira (NGN).
- 📈 **ERP Dashboard**: High-level overview of business performance and financial health.
- 🔐 **User Authentication**: Secure Login and Registration with role-based access (Admin, Cashier).
- 📤 **Export Functionality**: Export reports to Excel, CSV, and PDF.
- 🌙 **Modern Design**: Responsive UI with dark mode support using Mantine 8 and Tailwind CSS 4.

## Tech Stack

### Frontend
- **Framework**: React 19
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS 4
- **Components**: Mantine 8 + Lucide Icons
- **Charts**: Recharts
- **State Management/Routing**: React Router 7

### Backend
- **Framework**: FastAPI
- **ORM**: SQLModel (SQLAlchemy + Pydantic)
- **Migrations**: Alembic
- **Database**: PostgreSQL (Neon) / SQLite (local dev)
- **Authentication**: JWT (OAuth2)

## Quick Start

### 1. Clone the repository
```bash
git clone <repository-url>
cd mini-inventory
```

### 📚 Documentation
For detailed setup and usage instructions, see the [docs/](./docs/) folder:
- **[Server Startup Guide](./docs/STARTUP.md)** - Complete guide for running the development servers
- **[Neon Database Setup](./docs/NEON_SETUP.md)** - Production database configuration
- **[Project Plan](./docs/PROJECT_PLAN.md)** - Development roadmap and planning

### 🚀 Quick Start Servers
```bash
# Cross-platform (uses start-servers.js)
pnpm start

# Windows PowerShell
.\start-servers.ps1
```

### 2. Install dependencies
```bash
# Install Python dependencies
pnpm run setup  # Runs python setup.py to install requirements

# Install Node.js dependencies
pnpm install
```

### 3. Set up database

#### Option A: Neon Database (Recommended for production)
1. Create a free account at [Neon](https://console.neon.tech)
2. Create a new project
3. Copy the connection string from your dashboard
4. Create `.env` file:
```env
DB_TYPE=postgres
DATABASE_URL=postgresql+psycopg2://[user]:[password]@[endpoint]/[dbname]?sslmode=require
```

#### Option B: SQLite (Local development)
```env
DB_TYPE=sqlite
DATABASE_URL=sqlite:///./test.db
```

### 4. Run database migrations
```bash
pipenv run alembic upgrade head
```

### 5. Start the development server
```bash
# Concurrent startup (Recommended)
pnpm start:concurrent

# Manual startup:
# Terminal 1: Start backend (Port 9000)
pnpm start:backend

# Terminal 2: Start frontend (Port 9001)
pnpm start:frontend
```

### 6. Open your browser
Navigate to `http://localhost:9001`

## Environment Variables

Copy `env.example` to `.env` and configure:

```env
# Database Configuration
DB_TYPE=postgres

# Neon Database Connection
DATABASE_URL=postgresql+psycopg2://[user]:[password]@[endpoint]/[dbname]?sslmode=require

# For local development (SQLite)
# DB_TYPE=sqlite
# DATABASE_URL=sqlite:///./test.db

# JWT Secret Key
SECRET_KEY="your-secret-key"
```

## API Endpoints

### Auth
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Authenticate and get token
- `GET /api/auth/me` - Get current user info

### Products
- `GET /api/products/` - List all products
- `POST /api/products/` - Create new product
- `GET /api/products/id/{id}` - Get product by ID
- `PUT /api/products/id/{id}` - Update product
- `DELETE /api/products/id/{id}` - Delete product
- `GET /api/products/low-stock/` - Get low stock products

### Categories & Subcategories
- `GET /api/categories/` - List all categories
- `POST /api/categories/` - Create new category
- `GET /api/categories/subcategories` - List all subcategories
- `GET /api/categories/{category_id}/subcategories` - List subcategories for category

### Transactions
- `GET /api/transactions/` - List all transactions
- `POST /api/transactions/` - Create new transaction

### ERP & Analytics
- `GET /api/erp/dashboard` - Get ERP dashboard data
- `GET /api/analytics/dashboard/stats` - Get key statistics
- `GET /api/analytics/financial-summary` - Get financial health overview

### System
- `GET /health` - API health check

## Project Structure
```
mini-inventory/
├── api/                 # FastAPI backend
│   ├── routers/        # API route handlers
│   ├── models.py       # SQLModel definitions
│   ├── auth.py         # JWT & Security logic
│   └── database.py     # Session management
├── src/                # React frontend
│   ├── components/     # Reusable UI components
│   ├── pages/          # Full page views
│   ├── lib/            # Utilities (formatters, etc.)
│   └── providers/      # Context providers (Auth, Theme)
├── alembic/            # Database migrations
└── public/             # Static assets
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.