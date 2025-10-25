from typing import List, Optional
from uuid import UUID
from fastapi import HTTPException, status
from sqlmodel import Session, select
from ..models import Return, ReturnCreate, ReturnUpdate, ReturnAction, ReturnStatus

def create_return(session: Session, return_in: ReturnCreate) -> Return:
    db_return = Return.model_validate(return_in)
    session.add(db_return)
    session.commit()
    session.refresh(db_return)
    return db_return

def get_all_returns(session: Session) -> List[Return]:
    returns = session.exec(select(Return)).all()
    return returns

def get_return_by_id(session: Session, return_id: UUID) -> Optional[Return]:
    return_item = session.get(Return, return_id)
    return return_item

def update_return(session: Session, return_id: UUID, return_in: ReturnUpdate) -> Return:
    db_return = session.get(Return, return_id)
    if not db_return:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Return not found")
    return_data = return_in.model_dump(exclude_unset=True)
    for key, value in return_data.items():
        setattr(db_return, key, value)
    session.add(db_return)
    session.commit()
    session.refresh(db_return)
    return db_return

def delete_return(session: Session, return_id: UUID):
    return_item = session.get(Return, return_id)
    if not return_item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Return not found")
    session.delete(return_item)
    session.commit()
    return {"ok": True}