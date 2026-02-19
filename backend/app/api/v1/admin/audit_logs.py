from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from app.database import get_db
from app.models.user import User
from app.models.role import AuditLog
from .deps import require_admin_role

router = APIRouter()

class AuditLogResponse(BaseModel):
    id: int
    user_id: int
    user_email: Optional[str] = None
    business_id: Optional[int] = None
    action: str
    entity_type: str
    entity_id: Optional[int] = None
    details: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class AuditLogListResponse(BaseModel):
    items: List[AuditLogResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

@router.get("/audit-logs", response_model=AuditLogListResponse)
def list_audit_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_role),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    search: Optional[str] = Query(None, description="Buscar por email o acción"),
    action: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    user_id: Optional[int] = Query(None),
    business_id: Optional[int] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
):
    query = (
        db.query(AuditLog)
        .join(User, AuditLog.user_id == User.id)
    )

    if search:
        term = f"%{search.lower()}%"
        query = query.filter(
            User.email.ilike(term) |
            AuditLog.action.ilike(term) |
            AuditLog.entity_type.ilike(term)
        )
    if action:
        query = query.filter(AuditLog.action == action)
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    if business_id:
        query = query.filter(AuditLog.business_id == business_id)
    if date_from:
        query = query.filter(AuditLog.created_at >= date_from)
    if date_to:
        query = query.filter(AuditLog.created_at <= date_to)

    total = query.count()
    items_raw = (
        query
        .order_by(AuditLog.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    # Enrich con user_email
    user_ids = {log.user_id for log in items_raw}
    users_map = {
        u.id: u.email
        for u in db.query(User).filter(User.id.in_(user_ids)).all()
    }

    items = []
    for log in items_raw:
        items.append(AuditLogResponse(
            **{c.name: getattr(log, c.name) for c in log.__table__.columns},
            user_email=users_map.get(log.user_id),
        ))

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, -(-total // page_size)),  # ceil division
    }

@router.get("/audit-logs/actions", response_model=List[str])
def list_audit_actions(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_role),
):
    """Devuelve la lista de acciones únicas para usar en filtros."""
    rows = db.query(AuditLog.action).distinct().order_by(AuditLog.action).all()
    return [r[0] for r in rows]

@router.get("/audit-logs/entity-types", response_model=List[str])
def list_entity_types(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_role),
):
    rows = db.query(AuditLog.entity_type).distinct().order_by(AuditLog.entity_type).all()
    return [r[0] for r in rows]