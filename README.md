# Mini Inventory System

A comprehensive inventory management system for phone repair parts with expense tracking and profit analysis.

## Features

- 📱 Product management (phone models, part types, variants)
- 📊 Stock tracking with low stock alerts
- 💰 Purchase and sale transaction tracking
- 📈 Financial summary and profit analysis
- 📤 Export functionality (Excel, CSV, PDF)
- 🌙 Dark mode support
- 📱 Responsive design

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: FastAPI + SQLModel + Alembic
- **Database**: PostgreSQL (Neon) / SQLite (local dev)
- **Deployment**: Vercel

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
# Cross-platform (recommended)
pnpm start

# Windows PowerShell
.\start-servers.ps1
```

### 2. Install dependencies
```bash
# Install Python dependencies
pipenv install

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
# Terminal 1: Start backend
pipenv run uvicorn api.main:app --reload --port 9000

# Terminal 2: Start frontend
pnpm dev --port 9001
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

# In production (Docker/cloud):
# ALLOWED_ORIGINS="https://yourdomain.com,https://api.yourdomain.com"
```

## Database Setup

### Creating a Neon Database

1. **Sign up**: Go to [console.neon.tech](https://console.neon.tech)
2. **Create project**: Click "Create Project"
3. **Get connection string**:
   - Go to your project dashboard
   - Click "Connection Details"
   - Copy the connection string
4. **Update .env**: Replace the placeholder in your `.env` file

### Running Migrations

```bash
# Create a new migration
pipenv run alembic revision --autogenerate -m "description"

# Apply migrations
pipenv run alembic upgrade head

# Rollback migration
pipenv run alembic downgrade -1
```

## API Endpoints

### Products
- `GET /api/products/` - List all products (with optional search, pagination)
- `POST /api/products/` - Create new product
- `GET /api/products/id/{id}` - Get product by ID
- `PUT /api/products/id/{id}` - Update product
- `DELETE /api/products/id/{id}` - Delete product
- `GET /api/products/search` - Search products
- `GET /api/products/low-stock/` - Get low stock products

### Transactions
- `GET /api/transactions/` - List all transactions (with optional filtering)
- `POST /api/transactions/` - Create new transaction
- `GET /api/transactions/{id}` - Get transaction by ID
- `PUT /api/transactions/{id}` - Update transaction
- `DELETE /api/transactions/{id}` - Delete transaction

### Analytics
- `GET /api/analytics/dashboard/stats` - Get dashboard statistics
- `GET /api/analytics/financial-summary` - Get financial summary
- `GET /api/analytics/sales/trends` - Get sales trends
- `GET /api/analytics/inventory/analysis` - Get inventory analysis
- `GET /api/analytics/products/top-selling` - Get top selling products
- `GET /api/analytics/categories/performance` - Get category performance
- `GET /api/analytics/revenue/breakdown` - Get revenue breakdown
- `GET /api/analytics/expenses/breakdown` - Get expenses breakdown
- `GET /api/analytics/profitability/analysis` - Get profitability analysis

### Categories
- `GET /api/categories/` - List all categories
- `POST /api/categories/` - Create new category
- `GET /api/categories/{id}` - Get category by ID
- `PUT /api/categories/{id}` - Update category
- `DELETE /api/categories/{id}` - Delete category

### Expenses
- `GET /api/expenses/` - List all expenses
- `POST /api/expenses/` - Create new expense

### Repairs
- `GET /api/repairs/` - List all repairs
- `POST /api/repairs/` - Create new repair

### Returns
- `GET /api/returns/` - List all returns
- `POST /api/returns/` - Create new return

### ERP
- `GET /api/erp/dashboard` - Get ERP dashboard data

## Deployment

### Vercel Deployment

1. **Connect to Vercel**: Push your code to GitHub and connect to Vercel
2. **Set environment variables**: Add your `DATABASE_URL` in Vercel dashboard
3. **Deploy**: Vercel will automatically build and deploy your app

### Environment Variables for Production

In your Vercel dashboard, add:
- `DB_TYPE=postgres`
- `DATABASE_URL=your_neon_connection_string`

## Development

### Project Structure
```
mini-inventory/
├── api/                 # FastAPI backend
│   ├── main.py         # API endpoints
│   ├── models.py       # SQLModel models
│   └── database.py     # Database configuration
├── src/                # React frontend
│   ├── components/     # React components
│   ├── pages/          # Page components
│   └── lib/            # Utilities
├── alembic/            # Database migrations
└── public/             # Static assets
```

### Available Scripts

```bash
# Development
pnpm dev              # Start frontend dev server
pipenv run uvicorn api.main:app --reload  # Start backend

# Build
pnpm build            # Build frontend for production

# Database
pipenv run alembic upgrade head    # Apply migrations
pipenv run alembic revision --autogenerate -m "description"  # Create migration
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.