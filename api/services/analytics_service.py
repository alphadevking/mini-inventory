from sqlmodel import Session, select
from typing import Dict, Any, List, Optional
from datetime import date, datetime, timedelta
from collections import defaultdict

from ..models import (
    Product, Transaction, TransactionType, Repair, RepairStatus,
    Expense, DashboardStats, FinancialSummary, ProductCategory
)
from .stock_service import StockService

class AnalyticsService:
    @staticmethod
    def safe_divide(numerator: float, denominator: float, default: float = 0.0) -> float:
        """Safely divide two numbers, returning default if denominator is zero"""
        if denominator == 0:
            return default
        return numerator / denominator

    @staticmethod
    def calculate_percentage(value: float, total: float, default: float = 0.0) -> float:
        """Calculate percentage with safe division"""
        if total == 0:
            return default
        return round((value / total) * 100, 2)

    @staticmethod
    def calculate_growth_rate(current: float, previous: float, default: float = 0.0) -> float:
        """Calculate growth rate percentage"""
        if previous == 0:
            return default
        return round(((current - previous) / previous) * 100, 2)

    @staticmethod
    def calculate_profit_margin(revenue: float, costs: float, default: float = 0.0) -> float:
        """Calculate profit margin percentage"""
        if revenue == 0:
            return default
        return round(((revenue - costs) / revenue) * 100, 2)

    @staticmethod
    def calculate_inventory_turnover(cogs: float, avg_inventory: float, default: float = 0.0) -> float:
        """Calculate inventory turnover ratio"""
        if avg_inventory == 0:
            return default
        return round(cogs / avg_inventory, 2)

    @staticmethod
    def get_dashboard_stats(session: Session) -> DashboardStats:
        """Get comprehensive dashboard statistics"""
        # Total products
        total_products = session.exec(select(Product).where(Product.is_active)).all()

        # Low stock products
        low_stock_products = StockService.get_low_stock_products(session)

        # Repair stats
        all_repairs = session.exec(select(Repair)).all()
        pending_repairs = [r for r in all_repairs if r.repair_status == RepairStatus.pending]
        completed_repairs = [r for r in all_repairs if r.repair_status == RepairStatus.completed]

        # Transaction stats
        all_transactions = session.exec(select(Transaction)).all()

        # Monthly revenue (current month)
        current_month = datetime.now().month
        current_year = datetime.now().year

        monthly_sales = session.exec(
            select(Transaction).where(
                Transaction.transaction_type == TransactionType.sale,
                Transaction.transaction_date >= date(current_year, current_month, 1)
            )
        ).all()

        monthly_revenue = sum(t.unit_price * t.quantity for t in monthly_sales if t.unit_price)

        # Monthly expenses
        monthly_expenses = session.exec(
            select(Expense).where(
                Expense.expense_date >= date(current_year, current_month, 1)
            )
        ).all()

        total_expenses = sum(e.amount for e in monthly_expenses)
        monthly_profit = monthly_revenue - total_expenses

        return DashboardStats(
            total_products=len(total_products),
            low_stock_products=len(low_stock_products),
            total_repairs=len(all_repairs),
            pending_repairs=len(pending_repairs),
            completed_repairs=len(completed_repairs),
            total_transactions=len(all_transactions),
            total_expenses=total_expenses,
            monthly_revenue=monthly_revenue,
            monthly_profit=monthly_profit
        )

    @staticmethod
    def get_financial_summary(
        session: Session,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> FinancialSummary:
        """Get financial summary for a date range"""
        if not start_date:
            start_date = date.today().replace(day=1)  # First day of current month
        if not end_date:
            end_date = date.today()

        # Sales transactions
        sales_query = select(Transaction).where(Transaction.transaction_type == TransactionType.sale)
        if start_date:
            sales_query = sales_query.where(Transaction.transaction_date >= start_date)
        if end_date:
            sales_query = sales_query.where(Transaction.transaction_date <= end_date)
        sales = session.exec(sales_query).all()

        # Purchase transactions
        purchases_query = select(Transaction).where(Transaction.transaction_type == TransactionType.purchase)
        if start_date:
            purchases_query = purchases_query.where(Transaction.transaction_date >= start_date)
        if end_date:
            purchases_query = purchases_query.where(Transaction.transaction_date <= end_date)
        purchases = session.exec(purchases_query).all()

        # Expenses
        expenses_query = select(Expense)
        if start_date:
            expenses_query = expenses_query.where(Expense.expense_date >= start_date)
        if end_date:
            expenses_query = expenses_query.where(Expense.expense_date <= end_date)
        expenses = session.exec(expenses_query).all()

        # Repair revenue
        repair_query = select(Repair).where(Repair.repair_status == RepairStatus.completed)
        if start_date and Repair.date_completed is not None:
            repair_query = repair_query.where(Repair.date_completed >= start_date)
        if end_date and Repair.date_completed is not None:
            repair_query = repair_query.where(Repair.date_completed <= end_date)
        repairs = session.exec(repair_query).all()

        # Calculate totals with safe operations
        total_revenue = sum(
            (t.unit_price or 0) * (t.quantity or 0)
            for t in sales
            if t.unit_price is not None and t.quantity is not None
        )

        total_cogs = sum(
            (t.unit_cost or 0) * (t.quantity or 0)
            for t in purchases
            if t.unit_cost is not None and t.quantity is not None
        )

        total_transport_other_costs = sum(
            t.transport_other_cost or 0
            for t in purchases
            if t.transport_other_cost is not None
        )

        total_expenses = sum(
            e.amount or 0
            for e in expenses
            if e.amount is not None
        )

        total_repair_revenue = sum(
            r.total_amount or 0
            for r in repairs
            if r.total_amount is not None
        )

        total_repair_costs = sum(
            r.parts_cost or 0
            for r in repairs
            if r.parts_cost is not None
        )

        # Calculate derived metrics using utility functions
        total_gross_profit = total_revenue - total_cogs
        net_profit = (
            total_gross_profit
            + total_repair_revenue
            - total_repair_costs
            - total_expenses
            - total_transport_other_costs
        )

        profit_margin = AnalyticsService.calculate_profit_margin(total_revenue, total_revenue - net_profit)

        return FinancialSummary(
            total_revenue=round(total_revenue, 2),
            total_cogs=round(total_cogs, 2),
            total_gross_profit=round(total_gross_profit, 2),
            total_transport_other_costs=round(total_transport_other_costs, 2),
            total_expenses=round(total_expenses, 2),
            total_repair_revenue=round(total_repair_revenue, 2),
            total_repair_costs=round(total_repair_costs, 2),
            net_profit=round(net_profit, 2),
            profit_margin=profit_margin
        )

    @staticmethod
    def get_sales_analytics(session: Session, start_date: date, end_date: date) -> Dict[str, Any]:
        """Get detailed sales analytics"""
        sales = session.exec(
            select(Transaction).where(
                Transaction.transaction_type == TransactionType.sale,
                Transaction.transaction_date >= start_date,
                Transaction.transaction_date <= end_date
            )
        ).all()

        total_sales = len(sales)
        total_revenue = sum(t.unit_price * t.quantity for t in sales if t.unit_price)
        average_order_value = total_revenue / total_sales if total_sales > 0 else 0

        return {
            "total_sales": total_sales,
            "total_revenue": total_revenue,
            "average_order_value": average_order_value,
            "sales_data": sales
        }

    @staticmethod
    def get_sales_trends(session: Session, start_date: date, end_date: date) -> Dict[str, Any]:
        """Get sales trends over time"""
        try:
            # Get all sales transactions in date range
            sales_query = select(Transaction).where(Transaction.transaction_type == TransactionType.sale)
            if start_date:
                sales_query = sales_query.where(Transaction.transaction_date >= start_date)
            if end_date:
                sales_query = sales_query.where(Transaction.transaction_date <= end_date)
            sales = session.exec(sales_query).all()
            # Sort manually since SQLModel order_by has type issues
            sales = sorted(sales, key=lambda x: x.transaction_date or date.min)

            # Group by date manually
            daily_data: Dict[str, Dict[str, float]] = defaultdict(lambda: {'revenue': 0.0, 'transactions': 0})
            for sale in sales:
                if sale.transaction_date and sale.unit_price and sale.quantity:
                    date_str = str(sale.transaction_date)
                    daily_data[date_str]['revenue'] += float(sale.unit_price * sale.quantity)
                    daily_data[date_str]['transactions'] += 1

            # Convert to list format
            daily_trends = [
                {
                    "date": date_str,
                    "revenue": data['revenue'],
                    "transactions": data['transactions']
                }
                for date_str, data in sorted(daily_data.items())
            ]

            # Group by week manually
            weekly_data: Dict[str, Dict[str, float]] = defaultdict(lambda: {'revenue': 0.0, 'transactions': 0})
            for sale in sales:
                if sale.transaction_date and sale.unit_price and sale.quantity:
                    # Get Monday of the week
                    sale_date = sale.transaction_date
                    days_since_monday = sale_date.weekday()
                    monday = sale_date - timedelta(days=days_since_monday)
                    week_str = str(monday)
                    weekly_data[week_str]['revenue'] += float(sale.unit_price * sale.quantity)
                    weekly_data[week_str]['transactions'] += 1

            # Convert to list format
            weekly_trends = [
                {
                    "week": week_str,
                    "revenue": data['revenue'],
                    "transactions": data['transactions']
                }
                for week_str, data in sorted(weekly_data.items())
            ]

            return {
                "daily_trends": daily_trends,
                "weekly_trends": weekly_trends
            }
        except Exception:
            # Return empty data if there's an error
            return {
                "daily_trends": [],
                "weekly_trends": []
            }

    @staticmethod
    def get_inventory_analysis(session: Session) -> Dict[str, Any]:
        """Get inventory analysis and insights"""
        try:
            # Get all active products
            products = session.exec(select(Product).where(Product.is_active)).all()

            # Calculate inventory value
            total_inventory_value = sum(
                p.suggested_sell_price * p.current_stock
                for p in products
                if p.suggested_sell_price and p.current_stock
            )

            # Low stock analysis
            low_stock_products = [
                p for p in products
                if p.current_stock and p.low_stock_threshold and p.current_stock <= p.low_stock_threshold
            ]
            low_stock_value = sum(
                p.suggested_sell_price * p.current_stock
                for p in low_stock_products
                if p.suggested_sell_price and p.current_stock
            )

            # Category analysis
            category_analysis: Dict[str, Dict[str, float]] = defaultdict(lambda: {"count": 0, "value": 0.0, "stock": 0})
            for product in products:
                if product.category_id and product.suggested_sell_price and product.current_stock:
                    # Get category
                    category = session.get(ProductCategory, product.category_id)
                    if category:
                        category_analysis[category.name]["count"] += 1
                        category_analysis[category.name]["value"] += float(product.suggested_sell_price * product.current_stock)
                        category_analysis[category.name]["stock"] += product.current_stock

            # Top products by value
            top_products_by_value = sorted(
                [
                    (p.name, p.suggested_sell_price * p.current_stock)
                    for p in products
                    if p.suggested_sell_price and p.current_stock
                ],
                key=lambda x: x[1],
                reverse=True
            )[:10]

            return {
                "total_products": len(products),
                "total_inventory_value": total_inventory_value,
                "low_stock_products": len(low_stock_products),
                "low_stock_value": low_stock_value,
                "category_analysis": dict(category_analysis),
                "top_products_by_value": top_products_by_value
            }
        except Exception:
            # Return empty data if there's an error
            return {
                "total_products": 0,
                "total_inventory_value": 0,
                "low_stock_products": 0,
                "low_stock_value": 0,
                "category_analysis": {},
                "top_products_by_value": []
            }

    @staticmethod
    def get_top_selling_products(session: Session, start_date: date, end_date: date, limit: int = 10) -> List[Dict[str, Any]]:
        """Get top selling products"""
        # Get sales transactions in date range
        sales = session.exec(
            select(Transaction).where(
                Transaction.transaction_type == TransactionType.sale,
                Transaction.transaction_date >= start_date,
                Transaction.transaction_date <= end_date
            )
        ).all()

        # Group by product
        product_sales: Dict[str, Dict[str, Any]] = defaultdict(lambda: {
            'name': '',
            'sku': '',
            'category': '',
            'total_quantity': 0,
            'total_revenue': 0.0,
            'prices': []
        })

        for sale in sales:
            if sale.product_id:
                # Get product details
                product = session.get(Product, sale.product_id)
                if product:
                    category = session.get(ProductCategory, product.category_id) if product.category_id else None
                    product_id_str = str(sale.product_id)

                    product_sales[product_id_str]['name'] = product.name
                    product_sales[product_id_str]['sku'] = product.sku or ''
                    product_sales[product_id_str]['category'] = category.name if category else 'Unknown'

                    if sale.quantity and sale.unit_price:
                        product_sales[product_id_str]['total_quantity'] += sale.quantity
                        product_sales[product_id_str]['total_revenue'] += float(sale.unit_price * sale.quantity)
                        product_sales[product_id_str]['prices'].append(float(sale.unit_price))

        # Calculate averages and sort
        result = []
        for product_id, data in product_sales.items():
            avg_price = sum(data['prices']) / len(data['prices']) if data['prices'] else 0
            result.append({
                "name": data['name'],
                "sku": data['sku'],
                "category": data['category'],
                "total_quantity": data['total_quantity'],
                "total_revenue": data['total_revenue'],
                "avg_price": avg_price
            })

        # Sort by total revenue and limit
        result.sort(key=lambda x: x['total_revenue'], reverse=True)
        return result[:limit]

    @staticmethod
    def get_category_performance(session: Session, start_date: date, end_date: date) -> Dict[str, Any]:
        """Get category performance analysis"""
        # Get sales transactions in date range
        sales = session.exec(
            select(Transaction).where(
                Transaction.transaction_type == TransactionType.sale,
                Transaction.transaction_date >= start_date,
                Transaction.transaction_date <= end_date
            )
        ).all()

        # Group by category
        category_data: Dict[str, Dict[str, Any]] = defaultdict(lambda: {
            'total_quantity': 0,
            'total_revenue': 0.0,
            'total_transactions': 0,
            'prices': []
        })

        for sale in sales:
            if sale.product_id and sale.quantity and sale.unit_price:
                product = session.get(Product, sale.product_id)
                if product and product.category_id:
                    category = session.get(ProductCategory, product.category_id)
                    if category:
                        category_data[category.name]['total_quantity'] += sale.quantity
                        category_data[category.name]['total_revenue'] += float(sale.unit_price * sale.quantity)
                        category_data[category.name]['total_transactions'] += 1
                        category_data[category.name]['prices'].append(float(sale.unit_price))

        # Get product counts by category
        products = session.exec(
            select(Product, ProductCategory)
            .join(ProductCategory)
            .where(Product.is_active)
        ).all()

        product_counts = defaultdict(int)
        for product_data in products:
            product = product_data[0]
            category = product_data[1]
            product_counts[category.name] += 1

        # Convert to list and calculate averages
        categories = []
        for category_name, data in category_data.items():
            avg_price = sum(data['prices']) / len(data['prices']) if data['prices'] else 0
            categories.append({
                "name": category_name,
                "total_quantity": data['total_quantity'],
                "total_revenue": data['total_revenue'],
                "total_transactions": data['total_transactions'],
                "avg_price": avg_price,
                "product_count": product_counts[category_name]
            })

        # Sort by total revenue
        categories.sort(key=lambda x: x['total_revenue'], reverse=True)

        return {
            "categories": categories
        }

    @staticmethod
    def get_revenue_breakdown(session: Session, start_date: date, end_date: date) -> Dict[str, Any]:
        """Get revenue breakdown by source"""
        # Get sales transactions and calculate revenue manually
        sales_query = select(Transaction).where(Transaction.transaction_type == TransactionType.sale)
        if start_date:
            sales_query = sales_query.where(Transaction.transaction_date >= start_date)
        if end_date:
            sales_query = sales_query.where(Transaction.transaction_date <= end_date)
        sales = session.exec(sales_query).all()

        sales_revenue = sum(
            float(t.unit_price * t.quantity)
            for t in sales
            if t.unit_price is not None and t.quantity is not None and t.unit_price is not None and t.quantity is not None
        )

        # Get repair revenue
        repairs = session.exec(select(Repair).where(Repair.repair_status == RepairStatus.completed)).all()

        # Filter by date range manually
        filtered_repairs = []
        for repair in repairs:
            if repair.date_completed:
                if start_date and repair.date_completed < start_date:
                    continue
                if end_date and repair.date_completed > end_date:
                    continue
                filtered_repairs.append(repair)

        repair_revenue = sum(
            float(r.total_amount)
            for r in filtered_repairs
            if r.total_amount is not None
        )

        total_revenue = sales_revenue + repair_revenue

        return {
            "total_revenue": total_revenue,
            "sales_revenue": sales_revenue,
            "repair_revenue": repair_revenue,
            "breakdown": {
                "sales_percentage": (sales_revenue / total_revenue * 100) if total_revenue > 0 else 0,
                "repair_percentage": (repair_revenue / total_revenue * 100) if total_revenue > 0 else 0
            }
        }

    @staticmethod
    def get_expenses_breakdown(session: Session, start_date: date, end_date: date) -> Dict[str, Any]:
        """Get expenses breakdown by category"""
        # Get all expenses in date range
        all_expenses = session.exec(
            select(Expense).where(
                Expense.expense_date >= start_date,
                Expense.expense_date <= end_date
            )
        ).all()

        # Group by category
        category_data: Dict[str, Dict[str, float]] = defaultdict(lambda: {'amount': 0.0, 'count': 0})
        for expense in all_expenses:
            if expense.amount:
                category_data[expense.category]['amount'] += float(expense.amount)
                category_data[expense.category]['count'] += 1

        total_expenses = sum(data['amount'] for data in category_data.values())

        # Convert to list and sort
        categories = []
        for category, data in category_data.items():
            percentage = (data['amount'] / total_expenses * 100) if total_expenses > 0 else 0
            categories.append({
                "category": category,
                "amount": data['amount'],
                "count": data['count'],
                "percentage": percentage
            })

        categories.sort(key=lambda x: x['amount'], reverse=True)

        return {
            "total_expenses": float(total_expenses),
            "categories": categories
        }

    @staticmethod
    def get_profitability_analysis(session: Session, start_date: date, end_date: date) -> Dict[str, Any]:
        """Get profitability analysis"""
        # Get financial summary
        financial_summary = AnalyticsService.get_financial_summary(session, start_date, end_date)

        # Calculate additional metrics
        total_revenue = financial_summary.total_revenue + financial_summary.total_repair_revenue
        total_costs = financial_summary.total_cogs + financial_summary.total_repair_costs + financial_summary.total_expenses + financial_summary.total_transport_other_costs

        # Get monthly comparison (previous month)
        prev_start = start_date - timedelta(days=30)
        prev_end = start_date - timedelta(days=1)
        prev_financial = AnalyticsService.get_financial_summary(session, prev_start, prev_end)

        revenue_growth = 0
        profit_growth = 0
        if prev_financial.total_revenue > 0:
            revenue_growth = ((total_revenue - prev_financial.total_revenue) / prev_financial.total_revenue) * 100
        if prev_financial.net_profit > 0:
            profit_growth = ((financial_summary.net_profit - prev_financial.net_profit) / prev_financial.net_profit) * 100

        return {
            "current_period": {
                "revenue": total_revenue,
                "costs": total_costs,
                "net_profit": financial_summary.net_profit,
                "profit_margin": financial_summary.profit_margin
            },
            "growth_metrics": {
                "revenue_growth_percentage": revenue_growth,
                "profit_growth_percentage": profit_growth
            },
            "efficiency_ratios": {
                "cost_to_revenue_ratio": (total_costs / total_revenue * 100) if total_revenue > 0 else 0,
                "expense_to_revenue_ratio": (financial_summary.total_expenses / total_revenue * 100) if total_revenue > 0 else 0
            }
        }
