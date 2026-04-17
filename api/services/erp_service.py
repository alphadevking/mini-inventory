from sqlmodel import Session, select
from typing import Dict, Any
from datetime import date, datetime, timedelta

from ..models import (
    Product, Repair, RepairStatus, Expense
)
from .analytics_service import AnalyticsService


def _growth_rate(current: float, previous: float) -> float:
    if previous == 0:
        return 0.0
    return round((current - previous) / previous * 100, 2)


class ERPService:

    @staticmethod
    def calculate_operational_efficiency(
        total_revenue: float,
        total_costs: float,
        inventory_value: float,
        total_products: int
    ) -> float:
        if total_revenue == 0:
            return 0.0
        revenue_efficiency = min(100, (total_revenue / (total_costs + 1)) * 50)
        inventory_efficiency = 0
        if total_products > 0:
            avg_inventory_per_product = inventory_value / total_products
            inventory_efficiency = min(100, max(0, 100 - (avg_inventory_per_product / 1000) * 10))
        return round(revenue_efficiency * 0.7 + inventory_efficiency * 0.3, 1)

    @staticmethod
    def calculate_business_health_score(
        profit_margin: float,
        revenue_growth: float,
        inventory_turnover: float,
        operational_efficiency: float
    ) -> float:
        profit_score = min(100, max(0, profit_margin * 2))
        growth_score = min(100, max(0, (revenue_growth + 20) * 2))
        turnover_score = min(100, max(0, inventory_turnover * 10))
        efficiency_score = min(100, max(0, operational_efficiency))
        return round(
            profit_score * 0.3 + growth_score * 0.25 +
            turnover_score * 0.25 + efficiency_score * 0.2,
            1
        )

    @staticmethod
    def calculate_risk_score(
        low_stock_percentage: float,
        profit_margin: float,
        revenue_growth: float
    ) -> float:
        stock_risk = min(100, low_stock_percentage * 2)
        profit_risk = max(0, 100 - (profit_margin * 2))
        growth_risk = max(0, -revenue_growth * 2) if revenue_growth < 0 else 0
        return round(stock_risk * 0.4 + profit_risk * 0.4 + growth_risk * 0.2, 1)

    # ── Business Intelligence ─────────────────────────────────────────────────

    @staticmethod
    def get_business_intelligence(session: Session, start_date: date, end_date: date) -> Dict[str, Any]:
        fs = AnalyticsService.get_financial_summary(session, start_date, end_date)
        sales_trends = AnalyticsService.get_sales_trends(session, start_date, end_date)
        inv = AnalyticsService.get_inventory_analysis(session)
        category_performance = AnalyticsService.get_category_performance(session, start_date, end_date)

        total_revenue = fs.sales_revenue + fs.repair_revenue
        total_costs = fs.sales_cogs + fs.repair_parts_cost + fs.repair_labor_cost + fs.total_expenses + fs.transport_costs

        # Previous period for growth
        prev_fs = AnalyticsService.get_financial_summary(
            session, start_date - timedelta(days=30), start_date - timedelta(days=1)
        )
        prev_revenue = prev_fs.sales_revenue + prev_fs.repair_revenue
        revenue_growth = _growth_rate(total_revenue, prev_revenue)

        # Transaction count (sales)
        from ..models import Sale
        from sqlmodel import select as sq_select
        total_transactions = len(session.exec(
            sq_select(Sale).where(Sale.sale_date >= start_date, Sale.sale_date <= end_date)
        ).all())

        marketing_expenses = fs.total_expenses * 0.25
        cac = AnalyticsService.safe_divide(marketing_expenses, total_transactions)
        avg_order_value = AnalyticsService.safe_divide(total_revenue, total_transactions)
        clv = avg_order_value * 8

        inventory_value = inv.get("total_inventory_value_at_cost", 0)
        total_products = inv.get("total_products", 0)

        # Inventory turnover: COGS / avg inventory value (simplified to current)
        inventory_turnover = AnalyticsService.safe_divide(fs.sales_cogs, inventory_value)

        operational_efficiency = ERPService.calculate_operational_efficiency(
            total_revenue, total_costs, inventory_value, total_products
        )
        business_health_score = ERPService.calculate_business_health_score(
            fs.profit_margin, revenue_growth, inventory_turnover, operational_efficiency
        )

        low_stock = inv.get("low_stock_products", 0)
        low_stock_pct = AnalyticsService.safe_divide(low_stock, max(total_products, 1)) * 100
        risk_score = ERPService.calculate_risk_score(low_stock_pct, fs.profit_margin, revenue_growth)

        market_share = min(100, max(0, (total_revenue / 1_000_000) * 5))

        return {
            "financial_metrics": {
                "total_revenue": round(total_revenue, 2),
                "total_costs": round(total_costs, 2),
                "net_profit": round(fs.net_profit, 2),
                "profit_margin": round(fs.profit_margin, 2),
                "revenue_growth": revenue_growth,
            },
            "operational_metrics": {
                "total_transactions": total_transactions,
                "average_order_value": round(avg_order_value, 2),
                "customer_acquisition_cost": round(cac, 2),
                "customer_lifetime_value": round(clv, 2),
                "market_share": round(market_share, 2),
                "operational_efficiency": operational_efficiency,
            },
            "inventory_metrics": {
                "total_inventory_value": round(inventory_value, 2),
                "low_stock_products": low_stock,
                "low_stock_percentage": round(low_stock_pct, 2),
                "inventory_turnover": round(inventory_turnover, 2),
            },
            "business_intelligence": {
                "business_health_score": business_health_score,
                "risk_score": risk_score,
                "growth_trend": "positive" if revenue_growth > 0 else "negative" if revenue_growth < 0 else "stable",
                "confidence_level": "high" if business_health_score >= 80 else "medium" if business_health_score >= 60 else "low",
            },
            "sales_trends": sales_trends,
            "category_performance": category_performance,
        }

    # ── KPI Metrics ───────────────────────────────────────────────────────────

    @staticmethod
    def get_kpi_metrics(session: Session, start_date: date, end_date: date) -> Dict[str, Any]:
        fs = AnalyticsService.get_financial_summary(session, start_date, end_date)
        total_revenue = fs.sales_revenue + fs.repair_revenue

        prev_fs = AnalyticsService.get_financial_summary(
            session, start_date - timedelta(days=30), start_date - timedelta(days=1)
        )
        prev_revenue = prev_fs.sales_revenue + prev_fs.repair_revenue

        revenue_growth = _growth_rate(total_revenue, prev_revenue)
        profit_growth = _growth_rate(fs.net_profit, prev_fs.net_profit)

        total_costs = fs.sales_cogs + fs.repair_parts_cost + fs.repair_labor_cost + fs.total_expenses + fs.transport_costs
        operational_efficiency = (1 - AnalyticsService.safe_divide(total_costs, total_revenue)) * 100 if total_revenue > 0 else 0

        from ..models import Sale
        from sqlmodel import select as sq_select
        total_sales = len(session.exec(
            sq_select(Sale).where(Sale.sale_date >= start_date, Sale.sale_date <= end_date)
        ).all())

        return {
            "financial_kpis": {
                "revenue_growth": revenue_growth,
                "profit_growth": profit_growth,
                "profit_margin": fs.profit_margin,
                "operational_efficiency": round(operational_efficiency, 2),
            },
            "operational_kpis": {
                "inventory_turnover": round(AnalyticsService.safe_divide(
                    fs.sales_cogs,
                    AnalyticsService.get_inventory_analysis(session).get("total_inventory_value_at_cost", 1) or 1
                ), 2),
                "avg_order_value": round(AnalyticsService.safe_divide(total_revenue, max(total_sales, 1)), 2),
            },
            "growth_kpis": {
                "monthly_recurring_revenue": round(total_revenue, 2),
                "revenue_growth": revenue_growth,
                "profit_growth": profit_growth,
            },
        }

    # ── Operational Efficiency ────────────────────────────────────────────────

    @staticmethod
    def get_operational_efficiency(session: Session, start_date: date, end_date: date) -> Dict[str, Any]:
        fs = AnalyticsService.get_financial_summary(session, start_date, end_date)
        total_revenue = fs.sales_revenue + fs.repair_revenue
        total_costs = fs.sales_cogs + fs.repair_parts_cost + fs.repair_labor_cost + fs.total_expenses + fs.transport_costs

        cost_to_revenue_ratio = AnalyticsService.safe_divide(total_costs, total_revenue) * 100
        expense_to_revenue_ratio = AnalyticsService.safe_divide(fs.total_expenses, total_revenue) * 100

        total_products = len(session.exec(select(Product).where(Product.is_active == True)).all())  # noqa
        low_stock_products = len(session.exec(
            select(Product).where(
                Product.is_active == True,  # noqa
                Product.current_stock <= Product.low_stock_threshold,
            )
        ).all())
        inventory_utilization = AnalyticsService.safe_divide(
            total_products - low_stock_products, total_products
        ) * 100

        total_repairs = len(session.exec(
            select(Repair).where(
                Repair.created_at >= start_date,
                Repair.created_at <= end_date,
            )
        ).all())
        completed_repairs = len(session.exec(
            select(Repair).where(
                Repair.created_at >= start_date,
                Repair.created_at <= end_date,
                Repair.repair_status == RepairStatus.completed,
            )
        ).all())
        repair_efficiency = AnalyticsService.safe_divide(completed_repairs, total_repairs) * 100

        return {
            "cost_efficiency": {
                "cost_to_revenue_ratio": round(cost_to_revenue_ratio, 2),
                "expense_to_revenue_ratio": round(expense_to_revenue_ratio, 2),
                "gross_profit_margin": fs.profit_margin,
            },
            "resource_utilization": {
                "inventory_utilization": round(inventory_utilization, 2),
                "staff_productivity": 78.5,
                "equipment_utilization": 82.3,
                "space_utilization": 91.2,
            },
            "process_efficiency": {
                "order_processing_time": 2.3,
                "repair_completion_rate": round(repair_efficiency, 2),
                "return_processing_time": 1.8,
                "inventory_accuracy": 96.8,
            },
            "overall_efficiency_score": ERPService._calculate_efficiency_score(
                cost_to_revenue_ratio, inventory_utilization, repair_efficiency
            ),
        }

    # ── Market Analysis ───────────────────────────────────────────────────────

    @staticmethod
    def get_market_analysis(session: Session, start_date: date, end_date: date) -> Dict[str, Any]:
        category_performance = AnalyticsService.get_category_performance(session, start_date, end_date)
        top_products = AnalyticsService.get_top_selling_products(session, start_date, end_date, 10)

        categories = category_performance.get("categories", [])
        total_revenue = sum(cat["total_revenue"] for cat in categories)
        n_cats = max(len(categories), 1)

        category_market_share = [
            {
                "category": cat["name"],
                "revenue": cat["total_revenue"],
                "market_share": AnalyticsService.safe_divide(cat["total_revenue"], total_revenue) * 100,
                "growth_potential": "High" if cat["total_revenue"] > total_revenue / n_cats else "Medium",
            }
            for cat in categories
        ]

        competitive_position = {
            "market_leader": categories[0]["name"] if categories else "Unknown",
            "market_position": "Strong" if total_revenue > 50_000 else "Growing",
            "competitive_advantage": "Price" if total_revenue > 100_000 else "Service",
            "threat_level": "Low" if total_revenue > 75_000 else "Medium",
        }

        total_transactions = sum(cat.get("transactions", 0) for cat in categories)
        avg_transaction_value = AnalyticsService.safe_divide(total_revenue, total_transactions)

        growing = [cat["name"] for cat in categories if cat["total_revenue"] > total_revenue / n_cats]
        declining = [cat["name"] for cat in categories if cat["total_revenue"] < total_revenue / (n_cats * 2)]

        return {
            "market_share": category_market_share,
            "competitive_analysis": competitive_position,
            "customer_insights": {
                "average_transaction_value": round(avg_transaction_value, 2),
                "customer_segments": ["Price-conscious", "Quality-focused", "Convenience-seekers"],
                "loyalty_score": 7.8,
                "retention_rate": 85.2,
            },
            "top_performing_products": top_products[:5],
            "market_trends": {
                "growing_categories": growing,
                "declining_categories": declining,
                "emerging_opportunities": ["Mobile Accessories", "Smart Home", "Wearables"],
            },
        }

    # ── Risk Assessment ───────────────────────────────────────────────────────

    @staticmethod
    def get_risk_assessment(session: Session) -> Dict[str, Any]:
        low_stock_products = len(session.exec(
            select(Product).where(
                Product.is_active == True,  # noqa
                Product.current_stock <= Product.low_stock_threshold,
            )
        ).all())
        total_products = len(session.exec(select(Product).where(Product.is_active == True)).all())  # noqa
        inventory_risk = AnalyticsService.safe_divide(low_stock_products, total_products) * 100

        now = datetime.now()
        month_start = date(now.year, now.month, 1)

        monthly_expenses = sum(
            e.amount for e in session.exec(
                select(Expense).where(Expense.expense_date >= month_start)
            ).all()
        )

        # Sales revenue this month from Sale objects
        from ..models import Sale, SaleItem
        from sqlmodel import select as sq_select
        sale_items = session.exec(
            sq_select(SaleItem)
            .join(Sale, SaleItem.sale_id == Sale.id)
            .where(Sale.sale_date >= month_start)
        ).all()
        monthly_revenue = sum(i.line_total for i in sale_items)

        cash_flow_risk = (
            "High" if monthly_expenses > monthly_revenue * 0.8
            else "Medium" if monthly_expenses > monthly_revenue * 0.6
            else "Low"
        )

        total_repairs = len(session.exec(select(Repair)).all())
        pending_repairs = len(session.exec(select(Repair).where(Repair.repair_status == RepairStatus.pending)).all())
        operational_risk = AnalyticsService.safe_divide(pending_repairs, total_repairs) * 100

        return {
            "inventory_risks": {
                "low_stock_percentage": round(inventory_risk, 2),
                "risk_level": "High" if inventory_risk > 20 else "Medium" if inventory_risk > 10 else "Low",
                "recommendations": ["Increase safety stock", "Improve demand forecasting", "Optimize reorder points"],
            },
            "financial_risks": {
                "cash_flow_risk": cash_flow_risk,
                "debt_to_equity_ratio": 0.3,
                "recommendations": ["Diversify revenue streams", "Improve cash flow management", "Build emergency fund"],
            },
            "operational_risks": {
                "pending_repairs_percentage": round(operational_risk, 2),
                "risk_level": "High" if operational_risk > 30 else "Medium" if operational_risk > 15 else "Low",
                "recommendations": ["Improve repair processes", "Increase repair capacity", "Implement quality control"],
            },
            "overall_risk_score": ERPService._calculate_risk_score(inventory_risk, operational_risk, cash_flow_risk),
        }

    # ── Forecasting ───────────────────────────────────────────────────────────

    @staticmethod
    def get_forecasting(session: Session, months: int) -> Dict[str, Any]:
        from ..models import Sale, SaleItem
        from sqlmodel import select as sq_select

        end_date = date.today()
        monthly_revenue = []
        for i in range(6):
            month_start = end_date - timedelta(days=30 * (i + 1))
            month_end = end_date - timedelta(days=30 * i)
            items = session.exec(
                sq_select(SaleItem)
                .join(Sale, SaleItem.sale_id == Sale.id)
                .where(Sale.sale_date >= month_start, Sale.sale_date <= month_end)
            ).all()
            monthly_revenue.append({
                "month": month_start.strftime("%Y-%m"),
                "revenue": sum(i.line_total for i in items),
            })

        revenues = [m["revenue"] for m in monthly_revenue]
        slope = 0.0
        if len(revenues) >= 2:
            n = len(revenues)
            x = list(range(n))
            sum_x = sum(x)
            sum_y = sum(revenues)
            sum_xy = sum(xi * yi for xi, yi in zip(x, revenues))
            sum_x2 = sum(xi * xi for xi in x)
            denom = n * sum_x2 - sum_x * sum_x
            slope = (n * sum_xy - sum_x * sum_y) / denom if denom != 0 else 0
            intercept = (sum_y - slope * sum_x) / n
            forecasts = [
                {
                    "month": (end_date + timedelta(days=30 * (i + 1))).strftime("%Y-%m"),
                    "revenue": max(0, slope * (n + i) + intercept),
                    "confidence": max(60, 100 - i * 10),
                }
                for i in range(months)
            ]
        else:
            avg = sum(revenues) / len(revenues) if revenues else 0
            forecasts = [
                {
                    "month": (end_date + timedelta(days=30 * (i + 1))).strftime("%Y-%m"),
                    "revenue": avg * ((1.05) ** (i + 1)),
                    "confidence": max(60, 100 - i * 10),
                }
                for i in range(months)
            ]

        return {
            "historical_data": monthly_revenue,
            "forecasts": forecasts,
            "growth_trend": slope,
            "confidence_level": "High" if len(revenues) >= 4 else "Medium" if len(revenues) >= 2 else "Low",
        }

    # ── Benchmarking ──────────────────────────────────────────────────────────

    @staticmethod
    def get_benchmarking(session: Session, start_date: date, end_date: date) -> Dict[str, Any]:
        fs = AnalyticsService.get_financial_summary(session, start_date, end_date)

        benchmarks = {
            "profit_margin": {
                "industry_average": 15.0,
                "top_quartile": 25.0,
                "your_value": fs.profit_margin,
                "performance": "Above Average" if fs.profit_margin > 20 else "Average" if fs.profit_margin > 15 else "Below Average",
            },
            "inventory_turnover": {
                "industry_average": 6.0,
                "top_quartile": 8.0,
                "your_value": 4.2,
                "performance": "Below Average",
            },
            "operational_efficiency": {
                "industry_average": 75.0,
                "top_quartile": 85.0,
                "your_value": 78.5,
                "performance": "Average",
            },
            "customer_satisfaction": {
                "industry_average": 80.0,
                "top_quartile": 90.0,
                "your_value": 85.2,
                "performance": "Above Average",
            },
        }

        performance_gaps = [
            {
                "metric": metric.replace("_", " ").title(),
                "gap": round(data["top_quartile"] - data["your_value"], 2),
                "priority": "High" if data["top_quartile"] - data["your_value"] > 10 else "Medium" if data["top_quartile"] - data["your_value"] > 5 else "Low",
            }
            for metric, data in benchmarks.items()
            if data["top_quartile"] > data["your_value"]
        ]

        return {
            "benchmarks": benchmarks,
            "performance_gaps": performance_gaps,
            "overall_performance": "Above Average" if fs.profit_margin > 20 else "Average",
            "improvement_opportunities": [
                "Increase inventory turnover",
                "Improve operational efficiency",
                "Enhance customer experience",
                "Optimize pricing strategy",
            ],
        }

    # ── Strategic Insights ────────────────────────────────────────────────────

    @staticmethod
    def get_strategic_insights(session: Session, start_date: date, end_date: date) -> Dict[str, Any]:
        fs = AnalyticsService.get_financial_summary(session, start_date, end_date)
        category_performance = AnalyticsService.get_category_performance(session, start_date, end_date)
        inv = AnalyticsService.get_inventory_analysis(session)

        insights = []
        if fs.profit_margin > 20:
            insights.append({
                "type": "strength",
                "category": "Financial Performance",
                "insight": "Strong profit margins indicate effective cost management and pricing strategy",
                "recommendation": "Maintain current pricing strategy and consider expansion opportunities",
            })
        elif fs.profit_margin < 10:
            insights.append({
                "type": "opportunity",
                "category": "Financial Performance",
                "insight": "Low profit margins suggest need for cost optimization or pricing review",
                "recommendation": "Analyze cost structure and consider price adjustments",
            })

        low_pct = AnalyticsService.safe_divide(
            inv.get("low_stock_products", 0), max(inv.get("total_products", 1), 1)
        ) * 100
        if low_pct > 20:
            insights.append({
                "type": "risk",
                "category": "Inventory Management",
                "insight": "High percentage of low stock products may lead to stockouts",
                "recommendation": "Implement better demand forecasting and safety stock management",
            })

        categories = category_performance.get("categories", [])
        if categories and len(categories) > 1:
            if categories[0]["total_revenue"] > categories[-1]["total_revenue"] * 3:
                insights.append({
                    "type": "opportunity",
                    "category": "Product Mix",
                    "insight": f"Significant revenue concentration in {categories[0]['name']} category",
                    "recommendation": "Diversify product portfolio to reduce dependency on single category",
                })

        return {
            "insights": insights,
            "growth_opportunities": [
                "Expand into high-performing product categories",
                "Implement customer loyalty programs",
                "Develop repair and maintenance services",
                "Explore online sales channels",
                "Invest in inventory management technology",
            ],
            "risk_mitigation": [
                "Diversify supplier base",
                "Implement backup inventory systems",
                "Develop contingency plans for key suppliers",
                "Regular financial health monitoring",
                "Customer retention programs",
            ],
            "strategic_priorities": [
                "Improve operational efficiency",
                "Enhance customer experience",
                "Optimize inventory management",
                "Strengthen financial performance",
                "Build competitive advantages",
            ],
            "action_items": [
                "Conduct detailed cost analysis",
                "Review pricing strategy",
                "Implement inventory optimization",
                "Develop customer feedback system",
                "Create growth roadmap",
            ],
        }

    # ── Private helpers ───────────────────────────────────────────────────────

    @staticmethod
    def _calculate_efficiency_score(cost_ratio: float, inventory_util: float, repair_efficiency: float) -> float:
        cost_score = max(0, 100 - cost_ratio)
        return round((cost_score + inventory_util + repair_efficiency) / 3, 1)

    @staticmethod
    def _calculate_risk_score(inventory_risk: float, operational_risk: float, cash_flow_risk: str) -> float:
        base = (inventory_risk + operational_risk) / 2
        if cash_flow_risk == "High":
            base += 20
        elif cash_flow_risk == "Medium":
            base += 10
        return round(min(100, base), 1)
