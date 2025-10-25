from sqlmodel import Session, select
from typing import Dict, Any
from datetime import date, datetime, timedelta

from ..models import (
    Product, Transaction, TransactionType, Repair, RepairStatus,
    Expense
)
from .analytics_service import AnalyticsService

class ERPService:
    @staticmethod
    def calculate_business_health_score(
        profit_margin: float,
        revenue_growth: float,
        inventory_turnover: float,
        operational_efficiency: float
    ) -> float:
        """Calculate overall business health score (0-100)"""
        # Weighted scoring system
        weights = {
            'profit_margin': 0.3,
            'revenue_growth': 0.25,
            'inventory_turnover': 0.25,
            'operational_efficiency': 0.2
        }

        # Normalize scores to 0-100 scale
        profit_score = min(100, max(0, profit_margin * 2))  # 50% margin = 100 points
        growth_score = min(100, max(0, (revenue_growth + 20) * 2))  # 30% growth = 100 points
        turnover_score = min(100, max(0, inventory_turnover * 10))  # 10x turnover = 100 points
        efficiency_score = min(100, max(0, operational_efficiency))

        health_score = (
            profit_score * weights['profit_margin'] +
            growth_score * weights['revenue_growth'] +
            turnover_score * weights['inventory_turnover'] +
            efficiency_score * weights['operational_efficiency']
        )

        return round(health_score, 1)

    @staticmethod
    def calculate_operational_efficiency(
        total_revenue: float,
        total_costs: float,
        inventory_value: float,
        total_products: int
    ) -> float:
        """Calculate operational efficiency score (0-100)"""
        if total_revenue == 0:
            return 0.0

        # Revenue efficiency (how well we convert costs to revenue)
        revenue_efficiency = min(100, (total_revenue / (total_costs + 1)) * 50)

        # Inventory efficiency (lower inventory value per product is better)
        inventory_efficiency = 0
        if total_products > 0:
            avg_inventory_per_product = inventory_value / total_products
            inventory_efficiency = min(100, max(0, 100 - (avg_inventory_per_product / 1000) * 10))

        # Overall efficiency (weighted average)
        efficiency = (revenue_efficiency * 0.7 + inventory_efficiency * 0.3)
        return round(efficiency, 1)

    @staticmethod
    def calculate_risk_score(
        low_stock_percentage: float,
        profit_margin: float,
        revenue_growth: float
    ) -> float:
        """Calculate business risk score (0-100, higher = more risk)"""
        # Stock risk (higher low stock percentage = higher risk)
        stock_risk = min(100, low_stock_percentage * 2)

        # Profit risk (lower profit margin = higher risk)
        profit_risk = max(0, 100 - (profit_margin * 2))

        # Growth risk (negative growth = higher risk)
        growth_risk = max(0, -revenue_growth * 2) if revenue_growth < 0 else 0

        # Overall risk (weighted average)
        risk_score = (stock_risk * 0.4 + profit_risk * 0.4 + growth_risk * 0.2)
        return round(risk_score, 1)

    @staticmethod
    def get_business_intelligence(session: Session, start_date: date, end_date: date) -> Dict[str, Any]:
        """Get comprehensive business intelligence data"""
        # Get financial summary
        financial_summary = AnalyticsService.get_financial_summary(session, start_date, end_date)

        # Get sales trends
        sales_trends = AnalyticsService.get_sales_trends(session, start_date, end_date)

        # Get inventory analysis
        inventory_analysis = AnalyticsService.get_inventory_analysis(session)

        # Get category performance
        category_performance = AnalyticsService.get_category_performance(session, start_date, end_date)

        # Calculate additional BI metrics with robust calculations
        total_revenue = financial_summary.total_revenue + financial_summary.total_repair_revenue
        total_costs = financial_summary.total_cogs + financial_summary.total_repair_costs + financial_summary.total_expenses

        # Revenue growth calculation with safe division
        prev_start = start_date - timedelta(days=30)
        prev_end = start_date - timedelta(days=1)
        prev_financial = AnalyticsService.get_financial_summary(session, prev_start, prev_end)
        prev_revenue = prev_financial.total_revenue + prev_financial.total_repair_revenue

        revenue_growth = AnalyticsService.calculate_growth_rate(total_revenue, prev_revenue)

        # Market share estimation (more realistic)
        market_share = min(100, max(0, (total_revenue / 1000000) * 5))  # $1M = 5% market share

        # Customer acquisition cost (more accurate)
        total_transactions = len(session.exec(
            select(Transaction).where(
                Transaction.transaction_type == TransactionType.sale,
                Transaction.transaction_date >= start_date,
                Transaction.transaction_date <= end_date
            )
        ).all())

        marketing_expenses = financial_summary.total_expenses * 0.25  # 25% of expenses for marketing
        cac = AnalyticsService.safe_divide(marketing_expenses, total_transactions, 0)

        # Customer lifetime value (more sophisticated)
        avg_order_value = AnalyticsService.safe_divide(total_revenue, total_transactions, 0)
        clv = avg_order_value * 8  # More realistic 8 orders per year

        # Calculate business health score
        inventory_turnover = AnalyticsService.calculate_inventory_turnover(
            financial_summary.total_cogs,
            inventory_analysis.get('total_inventory_value', 0)
        )

        operational_efficiency = ERPService.calculate_operational_efficiency(
            total_revenue,
            total_costs,
            inventory_analysis.get('total_inventory_value', 0),
            inventory_analysis.get('total_products', 0)
        )

        business_health_score = ERPService.calculate_business_health_score(
            financial_summary.profit_margin,
            revenue_growth,
            inventory_turnover,
            operational_efficiency
        )

        # Calculate risk score
        low_stock_percentage = AnalyticsService.calculate_percentage(
            inventory_analysis.get('low_stock_products', 0),
            inventory_analysis.get('total_products', 1)
        )

        risk_score = ERPService.calculate_risk_score(
            low_stock_percentage,
            financial_summary.profit_margin,
            revenue_growth
        )

        return {
            "financial_metrics": {
                "total_revenue": round(total_revenue, 2),
                "total_costs": round(total_costs, 2),
                "net_profit": round(financial_summary.net_profit, 2),
                "profit_margin": round(financial_summary.profit_margin, 2),
                "revenue_growth": round(revenue_growth, 2)
            },
            "operational_metrics": {
                "total_transactions": total_transactions,
                "average_order_value": round(avg_order_value, 2),
                "customer_acquisition_cost": round(cac, 2),
                "customer_lifetime_value": round(clv, 2),
                "market_share": round(market_share, 2),
                "operational_efficiency": operational_efficiency
            },
            "inventory_metrics": {
                "total_inventory_value": round(inventory_analysis.get("total_inventory_value", 0), 2),
                "low_stock_products": inventory_analysis.get("low_stock_products", 0),
                "low_stock_percentage": round(low_stock_percentage, 2),
                "inventory_turnover": round(inventory_turnover, 2)
            },
            "business_intelligence": {
                "business_health_score": business_health_score,
                "risk_score": risk_score,
                "growth_trend": "positive" if revenue_growth > 0 else "negative" if revenue_growth < 0 else "stable",
                "confidence_level": "high" if business_health_score >= 80 else "medium" if business_health_score >= 60 else "low"
            },
            "sales_trends": sales_trends,
            "category_performance": category_performance
        }

    @staticmethod
    def get_kpi_metrics(session: Session, start_date: date, end_date: date) -> Dict[str, Any]:
        """Get Key Performance Indicators"""
        # Get financial summary
        financial_summary = AnalyticsService.get_financial_summary(session, start_date, end_date)

        # Calculate KPIs
        total_revenue = financial_summary.total_revenue + financial_summary.total_repair_revenue
        total_costs = financial_summary.total_cogs + financial_summary.total_repair_costs + financial_summary.total_expenses

        # Revenue growth
        prev_start = start_date - timedelta(days=30)
        prev_end = start_date - timedelta(days=1)
        prev_financial = AnalyticsService.get_financial_summary(session, prev_start, prev_end)
        prev_revenue = prev_financial.total_revenue + prev_financial.total_repair_revenue

        revenue_growth = 0
        if prev_revenue > 0:
            revenue_growth = ((total_revenue - prev_revenue) / prev_revenue) * 100

        # Profit growth
        profit_growth = 0
        if prev_financial.net_profit > 0:
            profit_growth = ((financial_summary.net_profit - prev_financial.net_profit) / prev_financial.net_profit) * 100

        # Operational efficiency
        operational_efficiency = 100 - ((total_costs / total_revenue) * 100) if total_revenue > 0 else 0

        # Inventory turnover (simplified calculation)
        inventory_turnover = 4.2  # This would be calculated from actual data

        # Customer satisfaction (simplified - based on return rate)
        total_sales = len(session.exec(
            select(Transaction).where(
                Transaction.transaction_type == TransactionType.sale,
                Transaction.transaction_date >= start_date,
                Transaction.transaction_date <= end_date
            )
        ).all())

        # Note: TransactionType.return doesn't exist, using a placeholder for now
        total_returns = 0  # This would need to be implemented when return transaction type is added

        customer_satisfaction = max(0, 100 - ((total_returns / max(total_sales, 1)) * 100))

        return {
            "financial_kpis": {
                "revenue_growth": revenue_growth,
                "profit_growth": profit_growth,
                "profit_margin": financial_summary.profit_margin,
                "operational_efficiency": operational_efficiency
            },
            "operational_kpis": {
                "inventory_turnover": inventory_turnover,
                "customer_satisfaction": customer_satisfaction,
                "order_fulfillment_rate": 95.5,  # This would be calculated from actual data
                "average_processing_time": 2.3  # Days
            },
            "growth_kpis": {
                "monthly_recurring_revenue": total_revenue,
                "customer_acquisition_rate": 15.2,  # This would be calculated from actual data
                "market_penetration": 12.8,  # This would be calculated from actual data
                "brand_awareness": 45.6  # This would be calculated from actual data
            }
        }

    @staticmethod
    def get_operational_efficiency(session: Session, start_date: date, end_date: date) -> Dict[str, Any]:
        """Get operational efficiency metrics"""
        # Get financial summary
        financial_summary = AnalyticsService.get_financial_summary(session, start_date, end_date)

        # Calculate efficiency metrics
        total_revenue = financial_summary.total_revenue + financial_summary.total_repair_revenue
        total_costs = financial_summary.total_cogs + financial_summary.total_repair_costs + financial_summary.total_expenses

        # Cost efficiency
        cost_to_revenue_ratio = (total_costs / total_revenue * 100) if total_revenue > 0 else 0
        expense_to_revenue_ratio = (financial_summary.total_expenses / total_revenue * 100) if total_revenue > 0 else 0

        # Resource utilization
        total_products = len(session.exec(select(Product).where(Product.is_active)).all())
        low_stock_products = len(session.exec(
            select(Product).where(
                Product.is_active,
                Product.current_stock <= Product.low_stock_threshold
            )
        ).all())

        inventory_utilization = ((total_products - low_stock_products) / total_products * 100) if total_products > 0 else 0

        # Repair efficiency
        total_repairs = len(session.exec(
            select(Repair).where(
                Repair.created_at >= start_date,
                Repair.created_at <= end_date
            )
        ).all())

        completed_repairs = len(session.exec(
            select(Repair).where(
                Repair.created_at >= start_date,
                Repair.created_at <= end_date,
                Repair.repair_status == RepairStatus.completed
            )
        ).all())

        repair_efficiency = (completed_repairs / total_repairs * 100) if total_repairs > 0 else 0

        return {
            "cost_efficiency": {
                "cost_to_revenue_ratio": cost_to_revenue_ratio,
                "expense_to_revenue_ratio": expense_to_revenue_ratio,
                "gross_profit_margin": financial_summary.profit_margin
            },
            "resource_utilization": {
                "inventory_utilization": inventory_utilization,
                "staff_productivity": 78.5,  # This would be calculated from actual data
                "equipment_utilization": 82.3,  # This would be calculated from actual data
                "space_utilization": 91.2  # This would be calculated from actual data
            },
            "process_efficiency": {
                "order_processing_time": 2.3,  # Days
                "repair_completion_rate": repair_efficiency,
                "return_processing_time": 1.8,  # Days
                "inventory_accuracy": 96.8  # This would be calculated from actual data
            },
            "overall_efficiency_score": ERPService._calculate_efficiency_score(
                cost_to_revenue_ratio, inventory_utilization, repair_efficiency
            )
        }

    @staticmethod
    def get_market_analysis(session: Session, start_date: date, end_date: date) -> Dict[str, Any]:
        """Get market analysis and trends"""
        # Get category performance
        category_performance = AnalyticsService.get_category_performance(session, start_date, end_date)

        # Get top products
        top_products = AnalyticsService.get_top_selling_products(session, start_date, end_date, 10)

        # Market trends analysis
        categories = category_performance.get("categories", [])
        total_revenue = sum(cat["total_revenue"] for cat in categories)

        # Market share by category
        category_market_share = [
            {
                "category": cat["name"],
                "revenue": cat["total_revenue"],
                "market_share": (cat["total_revenue"] / total_revenue * 100) if total_revenue > 0 else 0,
                "growth_potential": "High" if cat["total_revenue"] > total_revenue / len(categories) else "Medium"
            }
            for cat in categories
        ]

        # Competitive analysis (simplified)
        competitive_position = {
            "market_leader": categories[0]["name"] if categories else "Unknown",
            "market_position": "Strong" if total_revenue > 50000 else "Growing",
            "competitive_advantage": "Price" if total_revenue > 100000 else "Service",
            "threat_level": "Low" if total_revenue > 75000 else "Medium"
        }

        # Customer insights
        total_transactions = sum(cat["total_transactions"] for cat in categories)
        avg_transaction_value = total_revenue / max(total_transactions, 1)

        customer_insights = {
            "average_transaction_value": avg_transaction_value,
            "customer_segments": ["Price-conscious", "Quality-focused", "Convenience-seekers"],
            "loyalty_score": 7.8,  # This would be calculated from actual data
            "retention_rate": 85.2  # This would be calculated from actual data
        }

        return {
            "market_share": category_market_share,
            "competitive_analysis": competitive_position,
            "customer_insights": customer_insights,
            "top_performing_products": top_products[:5],
            "market_trends": {
                "growing_categories": [cat["name"] for cat in categories if cat["total_revenue"] > total_revenue / len(categories)],
                "declining_categories": [cat["name"] for cat in categories if cat["total_revenue"] < total_revenue / (len(categories) * 2)],
                "emerging_opportunities": ["Mobile Accessories", "Smart Home", "Wearables"]
            }
        }

    @staticmethod
    def get_risk_assessment(session: Session) -> Dict[str, Any]:
        """Get business risk assessment"""
        # Inventory risks
        low_stock_products = len(session.exec(
            select(Product).where(
                Product.is_active,
                Product.current_stock <= Product.low_stock_threshold
            )
        ).all())

        total_products = len(session.exec(select(Product).where(Product.is_active)).all())
        inventory_risk = (low_stock_products / total_products * 100) if total_products > 0 else 0

        # Financial risks
        current_month = datetime.now().month
        current_year = datetime.now().year

        monthly_sales = session.exec(
            select(Transaction).where(
                Transaction.transaction_type == TransactionType.sale,
                Transaction.transaction_date >= date(current_year, current_month, 1)
            )
        ).all()

        monthly_revenue = sum(t.unit_price * t.quantity for t in monthly_sales if t.unit_price)

        # Cash flow risk (simplified)
        monthly_expenses = session.exec(
            select(Expense).where(
                Expense.expense_date >= date(current_year, current_month, 1)
            )
        ).all()

        total_expenses = sum(e.amount for e in monthly_expenses)
        cash_flow_risk = "High" if total_expenses > monthly_revenue * 0.8 else "Medium" if total_expenses > monthly_revenue * 0.6 else "Low"

        # Operational risks
        pending_repairs = len(session.exec(
            select(Repair).where(Repair.repair_status == RepairStatus.pending)
        ).all())

        total_repairs = len(session.exec(select(Repair)).all())
        operational_risk = (pending_repairs / total_repairs * 100) if total_repairs > 0 else 0

        return {
            "inventory_risks": {
                "low_stock_percentage": inventory_risk,
                "risk_level": "High" if inventory_risk > 20 else "Medium" if inventory_risk > 10 else "Low",
                "recommendations": ["Increase safety stock", "Improve demand forecasting", "Optimize reorder points"]
            },
            "financial_risks": {
                "cash_flow_risk": cash_flow_risk,
                "debt_to_equity_ratio": 0.3,  # This would be calculated from actual data
                "recommendations": ["Diversify revenue streams", "Improve cash flow management", "Build emergency fund"]
            },
            "operational_risks": {
                "pending_repairs_percentage": operational_risk,
                "risk_level": "High" if operational_risk > 30 else "Medium" if operational_risk > 15 else "Low",
                "recommendations": ["Improve repair processes", "Increase repair capacity", "Implement quality control"]
            },
            "overall_risk_score": ERPService._calculate_risk_score(inventory_risk, operational_risk, cash_flow_risk)
        }

    @staticmethod
    def get_forecasting(session: Session, months: int) -> Dict[str, Any]:
        """Get business forecasting data"""
        # Get historical data for the last 6 months
        end_date = date.today()

        # Get monthly revenue data
        monthly_revenue = []
        for i in range(6):
            month_start = end_date - timedelta(days=30 * (i + 1))
            month_end = end_date - timedelta(days=30 * i)

            sales = session.exec(
                select(Transaction).where(
                    Transaction.transaction_type == TransactionType.sale,
                    Transaction.transaction_date >= month_start,
                    Transaction.transaction_date <= month_end
                )
            ).all()

            revenue = sum(t.unit_price * t.quantity for t in sales if t.unit_price)
            monthly_revenue.append({
                "month": month_start.strftime("%Y-%m"),
                "revenue": revenue
            })

        # Simple linear regression for forecasting
        revenues = [m["revenue"] for m in monthly_revenue]
        if len(revenues) >= 2:
            # Calculate trend
            x_values = list(range(len(revenues)))
            n = len(revenues)
            sum_x = sum(x_values)
            sum_y = sum(revenues)
            sum_xy = sum(x * y for x, y in zip(x_values, revenues))
            sum_x2 = sum(x * x for x in x_values)

            slope = (n * sum_xy - sum_x * sum_y) / (n * sum_x2 - sum_x * sum_x)
            intercept = (sum_y - slope * sum_x) / n

            # Forecast next months
            forecasts = []
            for i in range(months):
                future_month = end_date + timedelta(days=30 * (i + 1))
                forecasted_revenue = slope * (len(revenues) + i) + intercept
                forecasts.append({
                    "month": future_month.strftime("%Y-%m"),
                    "revenue": max(0, forecasted_revenue),
                    "confidence": max(60, 100 - (i * 10))  # Decreasing confidence over time
                })
        else:
            # Fallback: use average growth
            avg_revenue = sum(revenues) / len(revenues) if revenues else 0
            growth_rate = 0.05  # 5% monthly growth assumption

            forecasts = []
            for i in range(months):
                future_month = end_date + timedelta(days=30 * (i + 1))
                forecasted_revenue = avg_revenue * ((1 + growth_rate) ** (i + 1))
                forecasts.append({
                    "month": future_month.strftime("%Y-%m"),
                    "revenue": forecasted_revenue,
                    "confidence": max(60, 100 - (i * 10))
                })

        return {
            "historical_data": monthly_revenue,
            "forecasts": forecasts,
            "growth_trend": slope if len(revenues) >= 2 else 0.05,
            "confidence_level": "High" if len(revenues) >= 4 else "Medium" if len(revenues) >= 2 else "Low"
        }

    @staticmethod
    def get_benchmarking(session: Session, start_date: date, end_date: date) -> Dict[str, Any]:
        """Get industry benchmarking data"""
        # Get financial summary
        financial_summary = AnalyticsService.get_financial_summary(session, start_date, end_date)

        # Industry benchmarks (simplified - these would come from industry data)
        industry_benchmarks = {
            "profit_margin": {
                "industry_average": 15.0,
                "top_quartile": 25.0,
                "your_value": financial_summary.profit_margin,
                "performance": "Above Average" if financial_summary.profit_margin > 20 else "Average" if financial_summary.profit_margin > 15 else "Below Average"
            },
            "inventory_turnover": {
                "industry_average": 6.0,
                "top_quartile": 8.0,
                "your_value": 4.2,  # This would be calculated from actual data
                "performance": "Below Average"
            },
            "operational_efficiency": {
                "industry_average": 75.0,
                "top_quartile": 85.0,
                "your_value": 78.5,  # This would be calculated from actual data
                "performance": "Average"
            },
            "customer_satisfaction": {
                "industry_average": 80.0,
                "top_quartile": 90.0,
                "your_value": 85.2,  # This would be calculated from actual data
                "performance": "Above Average"
            }
        }

        # Performance gaps
        performance_gaps = []
        for metric, data in industry_benchmarks.items():
            gap = data["top_quartile"] - data["your_value"]
            if gap > 0:
                performance_gaps.append({
                    "metric": metric.replace("_", " ").title(),
                    "gap": gap,
                    "priority": "High" if gap > 10 else "Medium" if gap > 5 else "Low"
                })

        return {
            "benchmarks": industry_benchmarks,
            "performance_gaps": performance_gaps,
            "overall_performance": "Above Average" if financial_summary.profit_margin > 20 else "Average",
            "improvement_opportunities": [
                "Increase inventory turnover",
                "Improve operational efficiency",
                "Enhance customer experience",
                "Optimize pricing strategy"
            ]
        }

    @staticmethod
    def get_strategic_insights(session: Session, start_date: date, end_date: date) -> Dict[str, Any]:
        """Get strategic business insights and recommendations"""
        # Get various analytics data
        financial_summary = AnalyticsService.get_financial_summary(session, start_date, end_date)
        category_performance = AnalyticsService.get_category_performance(session, start_date, end_date)
        inventory_analysis = AnalyticsService.get_inventory_analysis(session)

        # Strategic insights
        insights = []

        # Revenue insights
        if financial_summary.profit_margin > 20:
            insights.append({
                "type": "strength",
                "category": "Financial Performance",
                "insight": "Strong profit margins indicate effective cost management and pricing strategy",
                "recommendation": "Maintain current pricing strategy and consider expansion opportunities"
            })
        elif financial_summary.profit_margin < 10:
            insights.append({
                "type": "opportunity",
                "category": "Financial Performance",
                "insight": "Low profit margins suggest need for cost optimization or pricing review",
                "recommendation": "Analyze cost structure and consider price adjustments"
            })

        # Inventory insights
        low_stock_percentage = (inventory_analysis.get("low_stock_products", 0) / inventory_analysis.get("total_products", 1)) * 100
        if low_stock_percentage > 20:
            insights.append({
                "type": "risk",
                "category": "Inventory Management",
                "insight": "High percentage of low stock products may lead to stockouts",
                "recommendation": "Implement better demand forecasting and safety stock management"
            })

        # Category performance insights
        categories = category_performance.get("categories", [])
        if categories:
            top_category = categories[0]
            bottom_category = categories[-1]

            if top_category["total_revenue"] > bottom_category["total_revenue"] * 3:
                insights.append({
                    "type": "opportunity",
                    "category": "Product Mix",
                    "insight": f"Significant revenue concentration in {top_category['name']} category",
                    "recommendation": "Diversify product portfolio to reduce dependency on single category"
                })

        # Growth opportunities
        growth_opportunities = [
            "Expand into high-performing product categories",
            "Implement customer loyalty programs",
            "Develop repair and maintenance services",
            "Explore online sales channels",
            "Invest in inventory management technology"
        ]

        # Risk mitigation strategies
        risk_mitigation = [
            "Diversify supplier base",
            "Implement backup inventory systems",
            "Develop contingency plans for key suppliers",
            "Regular financial health monitoring",
            "Customer retention programs"
        ]

        return {
            "insights": insights,
            "growth_opportunities": growth_opportunities,
            "risk_mitigation": risk_mitigation,
            "strategic_priorities": [
                "Improve operational efficiency",
                "Enhance customer experience",
                "Optimize inventory management",
                "Strengthen financial performance",
                "Build competitive advantages"
            ],
            "action_items": [
                "Conduct detailed cost analysis",
                "Review pricing strategy",
                "Implement inventory optimization",
                "Develop customer feedback system",
                "Create growth roadmap"
            ]
        }

    @staticmethod
    def _calculate_business_health_score(financial_summary, revenue_growth, market_share):
        """Calculate overall business health score"""
        profit_score = min(100, financial_summary.profit_margin * 5)
        growth_score = min(100, max(0, revenue_growth + 50))
        market_score = min(100, market_share * 10)

        return (profit_score + growth_score + market_score) / 3

    @staticmethod
    def _calculate_efficiency_score(cost_ratio, inventory_util, repair_efficiency):
        """Calculate operational efficiency score"""
        cost_score = max(0, 100 - cost_ratio)
        inventory_score = inventory_util
        repair_score = repair_efficiency

        return (cost_score + inventory_score + repair_score) / 3

    @staticmethod
    def _calculate_risk_score(inventory_risk, operational_risk, cash_flow_risk):
        """Calculate overall risk score"""
        risk_score = (inventory_risk + operational_risk) / 2
        if cash_flow_risk == "High":
            risk_score += 20
        elif cash_flow_risk == "Medium":
            risk_score += 10

        return min(100, risk_score)
