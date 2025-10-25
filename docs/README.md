# 📚 Mini Inventory System - Documentation

Welcome to the Mini Inventory System documentation! This folder contains all the documentation for setting up, running, and using the system.

## 📋 Available Documentation

### 🚀 [Server Startup Guide](./STARTUP.md)
Complete guide for starting both backend and frontend servers with various startup scripts.

### 🗄️ [Neon Database Setup](./NEON_SETUP.md)
Step-by-step guide for setting up Neon PostgreSQL database for production.

### 📋 [Project Plan](./PROJECT_PLAN.md)
Detailed project planning and development roadmap.

### 📝 [Meta Plan](./meta_plan.md)
Project metadata and planning information.

**Quick Start:**
```bash
# Cross-platform (recommended)
pnpm start

# Windows PowerShell
.\start-servers.ps1
```

## 🎯 What's Included

- **Startup Scripts**: Multiple ways to start the development servers
- **Platform Support**: Windows, macOS, and Linux compatibility
- **Troubleshooting**: Common issues and solutions
- **Configuration**: Environment setup and database configuration

## 🔧 Quick Reference

### **Ports:**
- **Backend API**: `http://localhost:9000`
- **Frontend App**: `http://localhost:9001`
- **API Documentation**: `http://localhost:9000/docs`

### **Key Commands:**
```bash
# Start both servers
pnpm start

# Start individual servers
pnpm start:backend
pnpm start:frontend

# View documentation
pnpm docs
```

## 📁 Project Structure

```
mini-inventory/
├── docs/                    # 📚 Documentation
│   ├── README.md           # This file (documentation index)
│   ├── STARTUP.md          # Server startup guide
│   ├── NEON_SETUP.md       # Neon database setup
│   ├── PROJECT_PLAN.md     # Project planning
│   └── meta_plan.md        # Project metadata
├── src/                    # 🌐 Frontend (React + TypeScript)
├── api/                    # 🚀 Backend (FastAPI + Python)
├── start-servers.js        # 🚀 Cross-platform startup script
├── start-servers.ps1       # 🚀 Windows PowerShell startup script
└── README.md              # 📖 Main project README
```

## 🆘 Need Help?

1. **Startup Issues**: Check [STARTUP.md](./STARTUP.md) for troubleshooting
2. **Database Setup**: See [NEON_SETUP.md](./NEON_SETUP.md) for production database
3. **Project Planning**: Review [PROJECT_PLAN.md](./PROJECT_PLAN.md) for development roadmap
4. **General Questions**: See the main [README.md](../README.md)
5. **API Documentation**: Visit `http://localhost:9000/docs` when servers are running

---

**Happy Coding! 🎉**
