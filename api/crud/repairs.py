from typing import List, Optional
from uuid import UUID
from fastapi import HTTPException, status
from sqlmodel import Session, select
from ..models import Repair, RepairCreate, RepairUpdate, RepairStatus, RepairPaymentStatus

def create_repair(session: Session, repair_in: RepairCreate) -> Repair:
    db_repair = Repair.model_validate(repair_in)
    session.add(db_repair)
    session.commit()
    session.refresh(db_repair)
    return db_repair

def get_all_repairs(session: Session) -> List[Repair]:
    repairs = session.exec(select(Repair)).all()
    return repairs

def get_repair_by_id(session: Session, repair_id: UUID) -> Optional[Repair]:
    repair = session.get(Repair, repair_id)
    return repair

def update_repair(session: Session, repair_id: UUID, repair_in: RepairUpdate) -> Repair:
    db_repair = session.get(Repair, repair_id)
    if not db_repair:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repair not found")
    repair_data = repair_in.model_dump(exclude_unset=True)
    for key, value in repair_data.items():
        setattr(db_repair, key, value)
    session.add(db_repair)
    session.commit()
    session.refresh(db_repair)
    return db_repair

def delete_repair(session: Session, repair_id: UUID):
    repair = session.get(Repair, repair_id)
    if not repair:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repair not found")
    session.delete(repair)
    session.commit()
    return {"ok": True}