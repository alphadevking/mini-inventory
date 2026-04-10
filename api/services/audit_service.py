"""
audit_service.py
================
Append-only audit logging. Every significant mutation in the system calls
AuditService.log() via FastAPI BackgroundTasks so it never blocks the hot path.

Usage pattern
-------------
    from fastapi import BackgroundTasks
    from .services.audit_service import AuditService

    @router.post("/sales")
    async def create_sale(..., background_tasks: BackgroundTasks):
        sale = sale_service.create_sale(...)
        background_tasks.add_task(
            AuditService.log,
            entity_type="sale",
            entity_id=sale.id,
            action=AuditAction.create,
            after_state=sale.dict(),
            changed_by=current_user.id,
            db_url=str(engine.url),      # passed so background task opens its own session
        )
        return sale

Design notes
------------
- We pass db_url rather than a Session because FastAPI's BackgroundTask runs
  after the response is sent — the request-scoped session may already be closed.
- Each audit write opens its own short-lived session, does one INSERT, commits,
  and closes. This is intentionally simple.
- For high-throughput production: replace with a task queue (Celery/pg-queue)
  that batches writes. The interface stays identical — just swap the transport
  inside _write().
"""
from typing import Any, Dict, Optional
from uuid import UUID
from datetime import datetime, date

from sqlmodel import Session, create_engine

from ..models import AuditLog, AuditAction


def _sanitize(obj: Any) -> Any:
    """Recursively convert non-JSON-serializable types so SQLAlchemy's JSON
    column can persist them without error."""
    if obj is None:
        return None
    if isinstance(obj, dict):
        return {k: _sanitize(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_sanitize(v) for v in obj]
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    if isinstance(obj, UUID):
        return str(obj)
    # Enums and other primitives pass through unchanged
    try:
        from enum import Enum
        if isinstance(obj, Enum):
            return obj.value
    except ImportError:
        pass
    return obj


class AuditService:

    @staticmethod
    def log(
        entity_type: str,
        entity_id: UUID,
        action: AuditAction,
        db_url: str,
        changed_by: Optional[UUID] = None,
        before_state: Optional[Dict[str, Any]] = None,
        after_state: Optional[Dict[str, Any]] = None,
        extra: Optional[Dict[str, Any]] = None,
    ) -> None:
        """
        Write one audit record. Designed to be called via BackgroundTasks.
        Opens its own session so the caller's session lifecycle doesn't matter.
        Failures are logged to stderr but never re-raised — audit must not
        break business operations.
        """
        try:
            AuditService._write(
                entity_type=entity_type,
                entity_id=entity_id,
                action=action,
                db_url=db_url,
                changed_by=changed_by,
                before_state=before_state,
                after_state=after_state,
                extra=extra,
            )
        except Exception as exc:
            # Audit failures must never surface to users
            import sys
            print(
                f"[AuditService] WARN: failed to write audit log "
                f"({entity_type}/{entity_id}/{action}): {exc}",
                file=sys.stderr,
            )

    @staticmethod
    def log_sync(
        session: Session,
        entity_type: str,
        entity_id: UUID,
        action: AuditAction,
        changed_by: Optional[UUID] = None,
        before_state: Optional[Dict[str, Any]] = None,
        after_state: Optional[Dict[str, Any]] = None,
        extra: Optional[Dict[str, Any]] = None,
    ) -> None:
        """
        Synchronous variant for use INSIDE a service transaction when you need
        the audit record to be part of the same atomic commit.
        e.g. repair status transitions where the log entry and the status change
        must either both succeed or both fail.
        """
        entry = AuditLog(
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            changed_by=changed_by,
            timestamp=datetime.utcnow(),
            before_state=_sanitize(before_state),
            after_state=_sanitize(after_state),
            extra=_sanitize(extra),
        )
        session.add(entry)
        # Caller is responsible for committing

    @staticmethod
    def _write(
        entity_type: str,
        entity_id: UUID,
        action: AuditAction,
        db_url: str,
        changed_by: Optional[UUID] = None,
        before_state: Optional[Dict[str, Any]] = None,
        after_state: Optional[Dict[str, Any]] = None,
        extra: Optional[Dict[str, Any]] = None,
    ) -> None:
        engine = create_engine(db_url, echo=False)
        with Session(engine) as session:
            entry = AuditLog(
                entity_type=entity_type,
                entity_id=entity_id,
                action=action,
                changed_by=changed_by,
                timestamp=datetime.utcnow(),
                before_state=_sanitize(before_state),
                after_state=_sanitize(after_state),
                extra=_sanitize(extra),
            )
            session.add(entry)
            session.commit()
        engine.dispose()

    @staticmethod
    def get_entity_log(
        session: Session,
        entity_type: str,
        entity_id: UUID,
        limit: int = 50,
        offset: int = 0,
    ):
        """Retrieve audit trail for a specific entity."""
        from sqlmodel import select
        return session.exec(
            select(AuditLog)
            .where(
                AuditLog.entity_type == entity_type,
                AuditLog.entity_id == entity_id,
            )
            .order_by(AuditLog.timestamp.desc())  # type: ignore[attr-defined]
            .offset(offset)
            .limit(limit)
        ).all()
