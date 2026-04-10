from fastapi import APIRouter, Depends
from sqlmodel import Session
from typing import Optional
from datetime import date, timedelta

from ..database import get_session

from ..dependencies import get_current_user

router = APIRouter(
    prefix="/erp", tags=["erp"], dependencies=[Depends(get_current_user)]
)


@router.get("/business-intelligence")
def get_business_intelligence(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    session: Session = Depends(get_session),
):
    """Get comprehensive business intelligence data"""
    from ..services.erp_service import ERPService

    if not start_date:
        start_date = date.today() - timedelta(days=30)
    if not end_date:
        end_date = date.today()
    return ERPService.get_business_intelligence(session, start_date, end_date)


@router.get("/kpi-metrics")
def get_kpi_metrics(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    session: Session = Depends(get_session),
):
    """Get Key Performance Indicators"""
    from ..services.erp_service import ERPService

    if not start_date:
        start_date = date.today() - timedelta(days=30)
    if not end_date:
        end_date = date.today()
    return ERPService.get_kpi_metrics(session, start_date, end_date)


@router.get("/operational-efficiency")
def get_operational_efficiency(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    session: Session = Depends(get_session),
):
    """Get operational efficiency metrics"""
    from ..services.erp_service import ERPService

    if not start_date:
        start_date = date.today() - timedelta(days=30)
    if not end_date:
        end_date = date.today()
    return ERPService.get_operational_efficiency(session, start_date, end_date)


@router.get("/market-analysis")
def get_market_analysis(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    session: Session = Depends(get_session),
):
    """Get market analysis and trends"""
    from ..services.erp_service import ERPService

    if not start_date:
        start_date = date.today() - timedelta(days=30)
    if not end_date:
        end_date = date.today()
    return ERPService.get_market_analysis(session, start_date, end_date)


@router.get("/risk-assessment")
def get_risk_assessment(session: Session = Depends(get_session)):
    """Get business risk assessment"""
    from ..services.erp_service import ERPService

    return ERPService.get_risk_assessment(session)


@router.get("/forecasting")
def get_forecasting(months: int = 3, session: Session = Depends(get_session)):
    """Get business forecasting data"""
    from ..services.erp_service import ERPService

    return ERPService.get_forecasting(session, months)


@router.get("/benchmarking")
def get_benchmarking(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    session: Session = Depends(get_session),
):
    """Get industry benchmarking data"""
    from ..services.erp_service import ERPService

    if not start_date:
        start_date = date.today() - timedelta(days=30)
    if not end_date:
        end_date = date.today()
    return ERPService.get_benchmarking(session, start_date, end_date)


@router.get("/strategic-insights")
def get_strategic_insights(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    session: Session = Depends(get_session),
):
    """Get strategic business insights and recommendations"""
    from ..services.erp_service import ERPService

    if not start_date:
        start_date = date.today() - timedelta(days=30)
    if not end_date:
        end_date = date.today()
    return ERPService.get_strategic_insights(session, start_date, end_date)
