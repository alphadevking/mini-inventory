from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime

from .config import APP_NAME, APP_VERSION, DEBUG, ALLOWED_ORIGINS
from .database import create_db_and_tables
from .middleware import RequestTimingMiddleware
from .routers import (
    products,
    transactions,
    repairs,
    expenses,
    returns,
    analytics,
    categories,
    erp,
    auth,
    sales,
)

# Create FastAPI app
app = FastAPI(
    title=APP_NAME,
    description="Comprehensive inventory and repair management system",
    version=APP_VERSION,
    debug=DEBUG,
)

# --- Middleware ---
app.add_middleware(RequestTimingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*", "X-Process-Time"],
)

# --- Routers ---
app.include_router(auth.router, prefix="/api")
app.include_router(products.router, prefix="/api")
app.include_router(sales.router, prefix="/api")          # new — immutable sales
app.include_router(transactions.router, prefix="/api")   # purchases only going forward
app.include_router(repairs.router, prefix="/api")        # rewritten — service-backed
app.include_router(expenses.router, prefix="/api")
app.include_router(returns.router, prefix="/api")        # rewritten — stock-aware
app.include_router(analytics.router, prefix="/api")
app.include_router(categories.router, prefix="/api")
app.include_router(erp.router, prefix="/api")


# --- Health check ---
@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow(), "version": APP_VERSION}


# --- Startup ---
@app.on_event("startup")
async def startup_event():
    create_db_and_tables()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=9000)
