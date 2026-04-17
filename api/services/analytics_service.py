"""
analytics_service.py
====================
Rewritten to use clean, separated data sources:

  Sales revenue  → SaleItem aggregates only (never mixed with repair revenue)
  Repair revenue → Repair.total_amount where repair_status = completed
  COGS           → SaleItem.unit_cost * quantity (locked at point-of-sale)
  Inventory      → Product.current_stock * last_purchase_cost (cost basis, not sell price)

Key fixes from the original:
  - Profit margin formula was circular; now: net_profit / total_revenue * 100
  - Inventory value uses cost basis, not sell price
  - Repair date filtering is done in SQL, not in Python
  - No revenue stream mixing in any summary method
  - Previous-period comparison uses actual calendar months, not 30-day windows
"""
from sqlmodel import Session, select
from typing import Dict, Any, List, Optional
from datetime import date, datetime, timedelta
from collections import defaultdict
import calendar

from ..models import (
    Product,
    Purchase,
    Repair,
    RepairStatus,
    Expense,
    DashboardStats,
    FinancialSummaryV2,
    ProductCategory,
    Sale,
    SaleItem,
)
from .stock_service import StockService


class AnalyticsService:

    # -----------------------------------------------------------------------
    # Utility helpers
    # -----------------------------------------------------------------------

    @staticmethod
    def safe_divide(numerator: float, denominator: float, default: float = 0.0) -> float:
        return default if denominator == 0 else numerator / denominator

    @staticmethod
    def _round(v: float) -> float:
        return round(v, 2)

    @staticmethod
    def _previous_month(year: int, month: int):
        """Return (year, month) for the calendar month before the given one."""
        if month == 1:
            return year - 1, 12
        return year, month - 1

    # -----------------------------------------------------------------------
    # Dashboard stats
    # -----------------------------------------------------------------------

    @staticmethod
    def get_dashboard_stats(session: Session) -> DashboardStats:
        """Quick stats for the home dashboard."""
        total_products = session.exec(select(Product).where(Product.is_active == True)).all()  # noqa
        low_stock = StockService.get_low_stock_products(session)

        all_repairs = session.exec(select(Repair)).all()
        pending_repairs = [r for r in all_repairs if r.repair_status == RepairStatus.pending]
        completed_repairs = [r for r in all_repairs if r.repair_status == RepairStatus.completed]

        all_purchases = session.exec(select(Purchase)).all()

        now = datetime.now()
        month_start = date(now.year, now.month, 1)

        # Monthly sales revenue from SaleItem (new clean source)
        monthly_sale_items = session.exec(
            select(SaleItem)
            .join(Sale, SaleItem.sale_id == Sale.id)
            .where(Sale.sale_date >= month_start)
        ).all()
        monthly_revenue = sum(i.line_total for i in monthly_sale_items)

        # Monthly expenses
        monthly_expenses = session.exec(
            select(Expense).where(Expense.expense_date >= month_start)
        ).all()
        total_expenses = sum(e.amount for e in monthly_expenses)
        monthly_profit = monthly_revenue - total_expenses

        return DashboardStats(
            total_products=len(total_products),
            low_stock_products=len(low_stock),
            total_repairs=len(all_repairs),
            pending_repairs=len(pending_repairs),
            completed_repairs=len(completed_repairs),
            total_purchases=len(all_purchases),
            total_expenses=total_expenses,
            monthly_revenue=monthly_revenue,
            monthly_profit=monthly_profit,
        )

    # -----------------------------------------------------------------------
    # Financial summary (v2 — streams separated)
    # -----------------------------------------------------------------------

    @staticmethod
    def get_financial_summary(
        session: Session,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> FinancialSummaryV2:
        if not start_date:
            start_date = date.today().replace(day=1)
        if not end_date:
            end_date = date.today()

        # --- Sales stream (from SaleItem) ---
        sale_items_query = (
            select(SaleItem)
            .join(Sale, SaleItem.sale_id == Sale.id)
            .where(Sale.sale_date >= start_date, Sale.sale_date <= end_date)
        )
        sale_items = session.exec(sale_items_query).all()

        sales_revenue = sum(i.line_total for i in sale_items)
        sales_cogs = sum(i.unit_cost * i.quantity for i in sale_items)
        sales_gross_profit = sales_revenue - sales_cogs

        # --- Repair stream (from completed Repairs) ---
        repair_query = (
            select(Repair)
            .where(
                Repair.repair_status == RepairStatus.completed,
                Repair.date_completed >= start_date,
                Repair.date_completed <= end_date,
            )
        )
        repairs = session.exec(repair_query).all()

        repair_revenue = sum(r.total_amount or 0 for r in repairs)
        repair_parts_cost = sum(r.parts_cost or 0 for r in repairs)
        repair_labor_cost = sum(r.labor_cost or 0 for r in repairs)
        repair_gross_profit = repair_revenue - repair_parts_cost - repair_labor_cost

        # --- Expenses ---
        expenses = session.exec(
            select(Expense).where(
                Expense.expense_date >= start_date,
                Expense.expense_date <= end_date,
            )
        ).all()
        total_expenses = sum(e.amount for e in expenses)

        # --- Purchases / transport costs ---
        purchases = session.exec(
            select(Purchase).where(
                Purchase.delivery_date >= start_date,
                Purchase.delivery_date <= end_date,
            )
        ).all()
        transport_costs = sum(p.transport_cost or 0 for p in purchases)

        # --- Bottom line ---
        total_revenue = sales_revenue + repair_revenue
        net_profit = (
            sales_gross_profit
            + repair_gross_profit
            - total_expenses
            - transport_costs
        )

        # Correct margin: net_profit / total_revenue (not circular)
        profit_margin = AnalyticsService._round(
            AnalyticsService.safe_divide(net_profit, total_revenue) * 100
        )

        # --- Inventory value at cost (not sell price) ---
        products = session.exec(select(Product).where(Product.is_active == True)).all()  # noqa
        inventory_value = sum(
            p.current_stock * p.last_purchase_cost
            for p in products
            if p.current_stock and p.last_purchase_cost
        )

        return FinancialSummaryV2(
            sales_revenue=AnalyticsService._round(sales_revenue),
            sales_cogs=AnalyticsService._round(sales_cogs),
            sales_gross_profit=AnalyticsService._round(sales_gross_profit),
            repair_revenue=AnalyticsService._round(repair_revenue),
            repair_parts_cost=AnalyticsService._round(repair_parts_cost),
            repair_labor_cost=AnalyticsService._round(repair_labor_cost),
            repair_gross_profit=AnalyticsService._round(repair_gross_profit),
            total_expenses=AnalyticsService._round(total_expenses),
            transport_costs=AnalyticsService._round(transport_costs),
            net_profit=AnalyticsService._round(net_profit),
            profit_margin=profit_margin,
            inventory_value_at_cost=AnalyticsService._round(inventory_value),
        )

    # -----------------------------------------------------------------------
    # Sales analytics
    # -----------------------------------------------------------------------

    @staticmethod
    def get_sales_trends(session: Session, start_date: date, end_date: date) -> Dict[str, Any]:
        """Daily and weekly sales trends from SaleItem aggregates."""
        sale_items = session.exec(
            select(SaleItem)
            .join(Sale, SaleItem.sale_id == Sale.id)
            .where(Sale.sale_date >= start_date, Sale.sale_date <= end_date)
        ).all()

        daily: Dict[str, Dict] = defaultdict(lambda: {"revenue": 0.0, "transactions": 0, "units": 0})
        weekly: Dict[str, Dict] = defaultdict(lambda: {"revenue": 0.0, "transactions": 0, "units": 0})

        # Group by sale to count transactions correctly
        sale_dates: Dict[str, date] = {}
        for item in sale_items:
            sale = session.get(Sale, item.sale_id)
            if sale:
                sale_dates[str(item.sale_id)] = sale.sale_date

        for item in sale_items:
            sale_date = sale_dates.get(str(item.sale_id))
            if not sale_date:
                continue
            d = str(sale_date)
            daily[d]["revenue"] += item.line_total
            daily[d]["units"] += item.quantity

            # Week key = Monday of that week
            days_since_monday = sale_date.weekday()
            monday = sale_date - timedelta(days=days_since_monday)
            w = str(monday)
            weekly[w]["revenue"] += item.line_total
            weekly[w]["units"] += item.quantity

        # Count unique sales per day/week
        seen_sales: Dict[str, set] = defaultdict(set)
        for item in sale_items:
            sale_date = sale_dates.get(str(item.sale_id))
            if sale_date:
                seen_sales[str(sale_date)].add(str(item.sale_id))
        for d, sale_ids in seen_sales.items():
            daily[d]["transactions"] = len(sale_ids)

        daily_trends = [
            {"date": d, **data} for d, data in sorted(daily.items())
        ]
        weekly_trends = [
            {"week": w, **data} for w, data in sorted(weekly.items())
        ]

        return {"daily_trends": daily_trends, "weekly_trends": weekly_trends}

    @staticmethod
    def get_top_selling_products(
        session: Session, start_date: date, end_date: date, limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Top products by revenue — from SaleItem records."""
        sale_items = session.exec(
            select(SaleItem)
            .join(Sale, SaleItem.sale_id == Sale.id)
            .where(Sale.sale_date >= start_date, Sale.sale_date <= end_date)
        ).all()

        product_data: Dict[str, Dict] = defaultdict(lambda: {
            "name": "", "sku": "", "category": "",
            "total_quantity": 0, "total_revenue": 0.0, "total_cogs": 0.0,
        })

        for item in sale_items:
            pid = str(item.product_id)
            product = session.get(Product, item.product_id)
            if not product:
                continue
            category = session.get(ProductCategory, product.category_id) if product.category_id else None
            product_data[pid]["name"] = product.name
            product_data[pid]["sku"] = product.sku or ""
            product_data[pid]["category"] = category.name if category else "Uncategorised"
            product_data[pid]["total_quantity"] += item.quantity
            product_data[pid]["total_revenue"] += item.line_total
            product_data[pid]["total_cogs"] += item.unit_cost * item.quantity

        result = sorted(product_data.values(), key=lambda x: x["total_revenue"], reverse=True)
        return result[:limit]

    # -----------------------------------------------------------------------
    # Revenue breakdown (sales vs repairs — never summed silently)
    # -----------------------------------------------------------------------

    @staticmethod
    def get_revenue_breakdown(session: Session, start_date: date, end_date: date) -> Dict[str, Any]:
        """Sales revenue and repair revenue as distinct streams."""
        sale_items = session.exec(
            select(SaleItem)
            .join(Sale, SaleItem.sale_id == Sale.id)
            .where(Sale.sale_date >= start_date, Sale.sale_date <= end_date)
        ).all()
        sales_revenue = sum(i.line_total for i in sale_items)

        repairs = session.exec(
            select(Repair).where(
                Repair.repair_status == RepairStatus.completed,
                Repair.date_completed >= start_date,
                Repair.date_completed <= end_date,
            )
        ).all()
        repair_revenue = sum(r.total_amount or 0 for r in repairs)

        total = sales_revenue + repair_revenue
        return {
            "total_revenue": AnalyticsService._round(total),
            "sales_revenue": AnalyticsService._round(sales_revenue),
            "repair_revenue": AnalyticsService._round(repair_revenue),
            "breakdown": {
                "sales_percentage": AnalyticsService._round(
                    AnalyticsService.safe_divide(sales_revenue, total) * 100
                ),
                "repair_percentage": AnalyticsService._round(
                    AnalyticsService.safe_divide(repair_revenue, total) * 100
                ),
            },
        }

    # -----------------------------------------------------------------------
    # Profitability analysis — uses actual calendar months for comparison
    # -----------------------------------------------------------------------

    @staticmethod
    def get_profitability_analysis(session: Session, start_date: date, end_date: date) -> Dict[str, Any]:
        current = AnalyticsService.get_financial_summary(session, start_date, end_date)

        # Previous calendar month (not a rolling 30-day window)
        prev_year, prev_month = AnalyticsService._previous_month(start_date.year, start_date.month)
        last_day = calendar.monthrange(prev_year, prev_month)[1]
        prev_start = date(prev_year, prev_month, 1)
        prev_end = date(prev_year, prev_month, last_day)
        previous = AnalyticsService.get_financial_summary(session, prev_start, prev_end)

        current_revenue = current.sales_revenue + current.repair_revenue
        prev_revenue = previous.sales_revenue + previous.repair_revenue

        revenue_growth = AnalyticsService._round(
            AnalyticsService.safe_divide(
                current_revenue - prev_revenue, prev_revenue
            ) * 100
        )
        profit_growth = AnalyticsService._round(
            AnalyticsService.safe_divide(
                current.net_profit - previous.net_profit, abs(previous.net_profit) or 1
            ) * 100
        )

        total_costs = (
            current.sales_cogs
            + current.repair_parts_cost
            + current.repair_labor_cost
            + current.total_expenses
            + current.transport_costs
        )

        return {
            "current_period": {
                "revenue": current_revenue,
                "sales_revenue": current.sales_revenue,
                "repair_revenue": current.repair_revenue,
                "costs": AnalyticsService._round(total_costs),
                "net_profit": current.net_profit,
                "profit_margin": current.profit_margin,
                "inventory_value_at_cost": current.inventory_value_at_cost,
            },
            "previous_period": {
                "revenue": prev_revenue,
                "net_profit": previous.net_profit,
            },
            "growth_metrics": {
                "revenue_growth_percentage": revenue_growth,
                "profit_growth_percentage": profit_growth,
            },
            "efficiency_ratios": {
                "cost_to_revenue_ratio": AnalyticsService._round(
                    AnalyticsService.safe_divide(total_costs, current_revenue) * 100
                ),
                "expense_to_revenue_ratio": AnalyticsService._round(
                    AnalyticsService.safe_divide(current.total_expenses, current_revenue) * 100
                ),
            },
        }

    # -----------------------------------------------------------------------
    # Inventory analysis
    # -----------------------------------------------------------------------

    @staticmethod
    def get_inventory_analysis(session: Session) -> Dict[str, Any]:
        products = session.exec(select(Product).where(Product.is_active == True)).all()  # noqa

        # Cost-basis inventory value (not sell price)
        total_value = sum(
            p.current_stock * p.last_purchase_cost
            for p in products
            if p.current_stock is not None and p.last_purchase_cost is not None
        )

        low_stock = [
            p for p in products
            if p.current_stock is not None and p.current_stock <= (p.low_stock_threshold or 0)
        ]
        low_stock_value = sum(
            p.current_stock * p.last_purchase_cost
            for p in low_stock
            if p.current_stock and p.last_purchase_cost
        )

        # Category breakdown
        category_data: Dict[str, Dict] = defaultdict(
            lambda: {"count": 0, "stock": 0, "value_at_cost": 0.0}
        )
        for p in products:
            if p.category_id:
                cat = session.get(ProductCategory, p.category_id)
                if cat:
                    category_data[cat.name]["count"] += 1
                    category_data[cat.name]["stock"] += p.current_stock or 0
                    if p.current_stock and p.last_purchase_cost:
                        category_data[cat.name]["value_at_cost"] += float(
                            p.current_stock * p.last_purchase_cost
                        )

        top_by_value = sorted(
            [
                {"name": p.name, "value_at_cost": p.current_stock * p.last_purchase_cost}
                for p in products
                if p.current_stock and p.last_purchase_cost
            ],
            key=lambda x: x["value_at_cost"],
            reverse=True,
        )[:10]

        return {
            "total_products": len(products),
            "total_inventory_value_at_cost": AnalyticsService._round(total_value),
            "low_stock_products": len(low_stock),
            "low_stock_value_at_cost": AnalyticsService._round(low_stock_value),
            "category_breakdown": dict(category_data),
            "top_products_by_value": top_by_value,
        }

    # -----------------------------------------------------------------------
    # Expenses breakdown
    # -----------------------------------------------------------------------

    @staticmethod
    def get_expenses_breakdown(session: Session, start_date: date, end_date: date) -> Dict[str, Any]:
        expenses = session.exec(
            select(Expense).where(
                Expense.expense_date >= start_date,
                Expense.expense_date <= end_date,
            )
        ).all()

        by_category: Dict[str, Dict] = defaultdict(lambda: {"amount": 0.0, "count": 0})
        for e in expenses:
            by_category[e.category]["amount"] += float(e.amount or 0)
            by_category[e.category]["count"] += 1

        total = sum(d["amount"] for d in by_category.values())

        categories = sorted(
            [
                {
                    "category": cat,
                    "amount": AnalyticsService._round(data["amount"]),
                    "count": data["count"],
                    "percentage": AnalyticsService._round(
                        AnalyticsService.safe_divide(data["amount"], total) * 100
                    ),
                }
                for cat, data in by_category.items()
            ],
            key=lambda x: x["amount"],
            reverse=True,
        )

        return {
            "total_expenses": AnalyticsService._round(total),
            "categories": categories,
        }

    # -----------------------------------------------------------------------
    # Category performance
    # -----------------------------------------------------------------------

    @staticmethod
    def get_category_performance(session: Session, start_date: date, end_date: date) -> Dict[str, Any]:
        sale_items = session.exec(
            select(SaleItem)
            .join(Sale, SaleItem.sale_id == Sale.id)
            .where(Sale.sale_date >= start_date, Sale.sale_date <= end_date)
        ).all()

        cat_data: Dict[str, Dict] = defaultdict(
            lambda: {"total_quantity": 0, "total_revenue": 0.0, "total_cogs": 0.0, "transactions": 0}
        )

        seen_by_cat: Dict[str, set] = defaultdict(set)
        for item in sale_items:
            product = session.get(Product, item.product_id)
            if not product or not product.category_id:
                continue
            cat = session.get(ProductCategory, product.category_id)
            if not cat:
                continue
            cat_data[cat.name]["total_quantity"] += item.quantity
            cat_data[cat.name]["total_revenue"] += item.line_total
            cat_data[cat.name]["total_cogs"] += item.unit_cost * item.quantity
            seen_by_cat[cat.name].add(str(item.sale_id))

        for cat_name, sale_ids in seen_by_cat.items():
            cat_data[cat_name]["transactions"] = len(sale_ids)

        # Product counts per category
        products = session.exec(select(Product).where(Product.is_active == True)).all()  # noqa
        product_counts: Dict[str, int] = defaultdict(int)
        for p in products:
            if p.category_id:
                cat = session.get(ProductCategory, p.category_id)
                if cat:
                    product_counts[cat.name] += 1

        categories = sorted(
            [
                {
                    "name": name,
                    "total_quantity": data["total_quantity"],
                    "total_revenue": AnalyticsService._round(data["total_revenue"]),
                    "total_cogs": AnalyticsService._round(data["total_cogs"]),
                    "gross_profit": AnalyticsService._round(
                        data["total_revenue"] - data["total_cogs"]
                    ),
                    "transactions": data["transactions"],
                    "product_count": product_counts.get(name, 0),
                }
                for name, data in cat_data.items()
            ],
            key=lambda x: x["total_revenue"],
            reverse=True,
        )

        return {"categories": categories}
