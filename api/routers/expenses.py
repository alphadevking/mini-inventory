from fastapi import APIRouter, HTTPException, Depends, status
from sqlmodel import Session, select
from typing import List, Optional
from uuid import UUID
from datetime import date

from ..database import get_session
from ..models import (
    Expense, ExpenseCreate, ExpenseUpdate, ExpenseCategory
)

router = APIRouter(prefix="/expenses", tags=["expenses"])

@router.get("/", response_model=List[Expense])
def get_expenses(
    skip: int = 0,
    limit: int = 100,
    category: Optional[ExpenseCategory] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    session: Session = Depends(get_session)
):
    """Get all expenses with optional filtering"""
    query = select(Expense)

    if category:
        query = query.where(Expense.category == category)

    if start_date:
        query = query.where(Expense.expense_date >= start_date)

    if end_date:
        query = query.where(Expense.expense_date <= end_date)

    return session.exec(query.offset(skip).limit(limit)).all()

@router.post("/", response_model=Expense, status_code=status.HTTP_201_CREATED)
def create_expense(expense: ExpenseCreate, session: Session = Depends(get_session)):
    """Create a new expense"""
    db_expense = Expense.from_orm(expense)
    session.add(db_expense)
    session.commit()
    session.refresh(db_expense)
    return db_expense

@router.get("/{expense_id}", response_model=Expense)
def get_expense(expense_id: UUID, session: Session = Depends(get_session)):
    """Get a specific expense by ID"""
    expense = session.get(Expense, expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    return expense

@router.put("/{expense_id}", response_model=Expense)
def update_expense(
    expense_id: UUID,
    expense_update: ExpenseUpdate,
    session: Session = Depends(get_session)
):
    """Update an expense"""
    expense = session.get(Expense, expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    update_data = expense_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(expense, field, value)

    session.add(expense)
    session.commit()
    session.refresh(expense)
    return expense

@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(expense_id: UUID, session: Session = Depends(get_session)):
    """Delete an expense"""
    expense = session.get(Expense, expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    session.delete(expense)
    session.commit()
