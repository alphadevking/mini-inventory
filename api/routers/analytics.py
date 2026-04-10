from fastapi import APIRouter, Depends
from sqlmodel import Session
from typing import Optional
from datetime import date, timedelta

from ..database import get_session
from ..models import FinancialSummaryV2, DashboardStats

from ..dependencies import get_current_user, require_manager

router = APIRouter(
    prefix="/analytics", tags=["analytics"], dependencies=[Depends(require_manager)]
)


@router.get("/dashboard/stats", response_model=DashboardStats)
def get_dashboard_stats(session: Session = Depends(get_session)):
    """Get dashboard statistics"""
    from ..services.analytics_service import AnalyticsService

    return AnalyticsService.get_dashboard_stats(session)


@router.get("/financial-summary", response_model=FinancialSummaryV2)
def get_financial_summary(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    session: Session = Depends(get_session),
):
    """Get financial summary for a date range"""
    from ..services.analytics_service import AnalyticsService

    # Type cast to resolve Optional[date] -> date issue
    return AnalyticsService.get_financial_summary(session, start_date, end_date)


@router.get("/sales/trends")
def get_sales_trends(days: int = 30, session: Session = Depends(get_session)):
    """Get sales trends over time"""
    from ..services.analytics_service import AnalyticsService

    end_date = date.today()
    start_date = end_date - timedelta(days=days)
    return AnalyticsService.get_sales_trends(session, start_date, end_date)


@router.get("/inventory/analysis")
def get_inventory_analysis(session: Session = Depends(get_session)):
    """Get inventory analysis and insights"""
    from ..services.analytics_service import AnalyticsService

    return AnalyticsService.get_inventory_analysis(session)


@router.get("/products/top-selling")
def get_top_selling_products(
    limit: int = 10,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    session: Session = Depends(get_session),
):
    """Get top selling products"""
    from ..services.analytics_service import AnalyticsService

    if not start_date:
        start_date = date.today() - timedelta(days=30)
    if not end_date:
        end_date = date.today()
    return AnalyticsService.get_top_selling_products(
        session, start_date, end_date, limit
    )


@router.get("/categories/performance")
def get_category_performance(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    session: Session = Depends(get_session),
):
    """Get category performance analysis"""
    from ..services.analytics_service import AnalyticsService

    if not start_date:
        start_date = date.today() - timedelta(days=30)
    if not end_date:
        end_date = date.today()
    return AnalyticsService.get_category_performance(session, start_date, end_date)


@router.get("/revenue/breakdown")
def get_revenue_breakdown(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    session: Session = Depends(get_session),
):
    """Get revenue breakdown by source"""
    from ..services.analytics_service import AnalyticsService

    if not start_date:
        start_date = date.today() - timedelta(days=30)
    if not end_date:
        end_date = date.today()
    return AnalyticsService.get_revenue_breakdown(session, start_date, end_date)


@router.get("/expenses/breakdown")
def get_expenses_breakdown(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    session: Session = Depends(get_session),
):
    """Get expenses breakdown by category"""
    from ..services.analytics_service import AnalyticsService

    if not start_date:
        start_date = date.today() - timedelta(days=30)
    if not end_date:
        end_date = date.today()
    return AnalyticsService.get_expenses_breakdown(session, start_date, end_date)


@router.get("/profitability/analysis")
def get_profitability_analysis(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    session: Session = Depends(get_session),
):
    """Get profitability analysis"""
    from ..services.analytics_service import AnalyticsService

    if not start_date:
        start_date = date.today() - timedelta(days=30)
    if not end_date:
        end_date = date.today()
    return AnalyticsService.get_profitability_analysis(session, start_date, end_date)
