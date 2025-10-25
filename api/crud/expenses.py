from typing import List, Optional
from uuid import UUID
from fastapi import HTTPException, status
from sqlmodel import Session, select
from ..models import Expense, ExpenseCreate, ExpenseUpdate

def create_expense(session: Session, expense_in: ExpenseCreate) -> Expense:
    db_expense = Expense.model_validate(expense_in)
    session.add(db_expense)
    session.commit()
    session.refresh(db_expense)
    return db_expense

def get_all_expenses(session: Session) -> List[Expense]:
    expenses = session.exec(select(Expense)).all()
    return expenses

def get_expense_by_id(session: Session, expense_id: UUID) -> Optional[Expense]:
    expense = session.get(Expense, expense_id)
    return expense

def update_expense(session: Session, expense_id: UUID, expense_in: ExpenseUpdate) -> Expense:
    db_expense = session.get(Expense, expense_id)
    if not db_expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")
    expense_data = expense_in.model_dump(exclude_unset=True)
    for key, value in expense_data.items():
        setattr(db_expense, key, value)
    session.add(db_expense)
    session.commit()
    session.refresh(db_expense)
    return db_expense

def delete_expense(session: Session, expense_id: UUID):
    expense = session.get(Expense, expense_id)
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")
    session.delete(expense)
    session.commit()
    return {"ok": True}