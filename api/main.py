from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime

from .config import APP_NAME, APP_VERSION, DEBUG, ALLOWED_ORIGINS
from .database import create_db_and_tables
from .routers import products, transactions, repairs, expenses, returns, analytics, categories, erp

# Create FastAPI app
app = FastAPI(
    title=APP_NAME,
    description="Comprehensive inventory and repair management system",
    version=APP_VERSION,
    debug=DEBUG
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(products.router)
app.include_router(transactions.router)
app.include_router(repairs.router)
app.include_router(expenses.router)
app.include_router(returns.router)
app.include_router(analytics.router)
app.include_router(categories.router)
app.include_router(erp.router)

# Health check endpoint
@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow(),
        "version": APP_VERSION
    }

# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    create_db_and_tables()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=9000)