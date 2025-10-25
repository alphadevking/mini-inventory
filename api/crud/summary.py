from typing import List, Sequence
from uuid import UUID
from fastapi import HTTPException, status
from sqlmodel import Session, select, func
from ..models import FinancialSummary, Product, Sale, Expense

def get_financial_summary(session: Session) -> FinancialSummary:
    total_revenue = session.exec(
        select(func.sum(Sale.total_price))
    ).first() or 0.0

    # Fetch all sales along with their associated products
    # This ensures that `sale.product` is loaded and accessible
    sales_with_products = session.exec(
        select(Sale, Product).join(Product)
    ).all()

    total_cogs = sum(
        sale.quantity * product.cost_price
        for sale, product in sales_with_products
    )

    total_gross_profit = total_revenue - total_cogs

    total_expenses = session.exec(
        select(func.sum(Expense.amount))
    ).first() or 0.0

    net_profit = total_gross_profit - total_expenses

    return FinancialSummary(
        total_revenue=total_revenue,
        total_cogs=total_cogs,
        total_gross_profit=total_gross_profit,
        total_transport_other_costs=0.0, # This field was from ItemTransaction, setting to 0 for now
        net_profit=net_profit
    )