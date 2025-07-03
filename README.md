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
pnpm dev
```

### 6. Open your browser
Navigate to `http://localhost:5173`

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
- `GET /api/products/` - List all products
- `POST /api/products/` - Create new product
- `GET /api/products/{id}` - Get product by ID
- `PUT /api/products/{id}` - Update product
- `DELETE /api/products/{id}` - Delete product
- `GET /api/products/low-stock/` - Get low stock products

### Transactions
- `GET /api/transactions/` - List all transactions
- `POST /api/transactions/` - Create new transaction
- `GET /api/transactions/{id}` - Get transaction by ID
- `DELETE /api/transactions/{id}` - Delete transaction

### Financial Summary
- `GET /api/summary/` - Get financial summary

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