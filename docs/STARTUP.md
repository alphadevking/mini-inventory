# 🚀 Server Startup Scripts

This directory contains multiple startup scripts to easily run both the backend and frontend servers for the Mini Inventory System.

## 📋 Available Scripts

### 1. **Concurrently** (Recommended)
```bash
# Using concurrently for better process management
pnpm start:concurrent
```

### 2. **Cross-Platform Node.js Script**
```bash
# Using npm/pnpm
pnpm start
# or
npm start

# Direct execution
node start-servers.js
```

### 3. **PowerShell Script** (Windows)
```powershell
.\start-servers.ps1
```

### 4. **Individual Server Scripts**
```bash
# Backend only
pnpm start:backend

# Frontend only
pnpm start:frontend
```

## 🎯 What the Scripts Do

### ✅ **Dependency Checks**
- Verifies `pipenv` is installed and available
- Verifies `pnpm` is installed and available
- Checks for `.env` file existence

### 🚀 **Server Startup**
- **Backend**: Starts FastAPI server on `http://localhost:9000`
- **Frontend**: Starts Vite dev server on `http://localhost:9001`
- **App Access**: Available at `http://localhost:9001`

### 📊 **Server Information**
- Displays server URLs and ports
- Shows helpful tips and status information
- Provides graceful shutdown with Ctrl+C

## 🔧 Prerequisites

### Required Tools
- **Python 3.8+** with pipenv installed
- **Node.js 16+** with pnpm installed
- **Git** (for cloning the repository)

### Installation Commands
```bash
# Install pipenv
pip install pipenv

# Install pnpm
npm install -g pnpm

# Install project dependencies
pipenv install
pnpm install
```

## ⚙️ Configuration

### Environment Setup
1. Copy `env.example` to `.env`
2. Configure your database settings:
   ```env
   # For local development (SQLite)
   DB_TYPE=sqlite
   DATABASE_URL=sqlite:///./test.db

   # For production (PostgreSQL/Neon)
   DB_TYPE=postgres
   DATABASE_URL=postgresql+psycopg2://[user]:[password]@[endpoint]/[dbname]?sslmode=require
   ```

### Database Migration
```bash
pipenv run alembic upgrade head
```

## 🖥️ Platform-Specific Usage

### Windows
```powershell
# Option 1: PowerShell (recommended)
.\start-servers.ps1

# Option 2: Node.js script
node start-servers.js
```

### macOS/Linux
```bash
# Node.js script (recommended)
node start-servers.js

# Or using package manager
pnpm start
```

## 🛠️ Troubleshooting

### Common Issues

#### 1. **"pipenv not found"**
```bash
pip install pipenv
```

#### 2. **"pnpm not found"**
```bash
npm install -g pnpm
```

#### 3. **Port already in use**
- Backend (9000): Change port in script or kill existing process
- Frontend (9001): Change port in script or kill existing process

#### 4. **Database connection errors**
- Check your `.env` file configuration
- Ensure database is running (if using PostgreSQL)
- Run migrations: `pipenv run alembic upgrade head`

#### 5. **PowerShell execution policy (Windows)**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Manual Server Startup
If scripts don't work, start servers manually:

**Terminal 1 (Backend):**
```bash
pipenv run uvicorn api.main:app --reload --port 9000
```

**Terminal 2 (Frontend):**
```bash
pnpm dev --port 9001
```

## 📱 Accessing the Application

Once both servers are running:

- **Frontend App**: http://localhost:9001
- **Backend API**: http://localhost:9000
- **API Documentation**: http://localhost:9000/docs

## 🛑 Stopping Servers

- **Node.js Script**: Press `Ctrl+C`
- **PowerShell**: Press `Ctrl+C` or use `Stop-Job` commands

## 💡 Tips

1. **First Time Setup**: Run `pipenv install` and `pnpm install` before using scripts
2. **Environment Variables**: Always configure your `.env` file before starting
3. **Database**: Ensure your database is properly configured and migrated
4. **Ports**: Default ports are 9000 (backend) and 9001 (frontend)
5. **Logs**: Check terminal output for any error messages

## 🔄 Development Workflow

1. **Start Development**: Run startup script
2. **Make Changes**: Edit code in your IDE
3. **Hot Reload**: Both servers support hot reloading
4. **Test Changes**: Refresh browser to see updates
5. **Stop Development**: Use Ctrl+C to stop servers

---

**Happy Coding! 🎉**
