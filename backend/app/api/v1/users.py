from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.role import AuditLog
from app.schemas.user import UserResponse, UserUpdate
from app.schemas.role import AuditLogResponse
from app.api.deps import get_current_active_user, require_system_admin
from app.utils.audit import log_action
from app.models.enums import SubscriptionPlan
from typing import List

router = APIRouter(prefix="/users", tags=["Usuarios"])


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_active_user)):
    return current_user


@router.patch("/me", response_model=UserResponse)
def update_me(
    data: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    log_action(db, current_user.id, "UPDATE", "User", current_user.id)
    return current_user


@router.get("/me/audit-logs", response_model=List[AuditLogResponse])
def get_my_audit_logs(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    logs = db.query(AuditLog).filter(
        AuditLog.user_id == current_user.id
    ).order_by(AuditLog.created_at.desc()).limit(100).all()
    return logs


# ── Admin: listar todos los usuarios ──────────────────────────────────────────

@router.get("", response_model=List[UserResponse], dependencies=[Depends(require_system_admin)])
def list_all_users(db: Session = Depends(get_db)):
    return db.query(User).all()


@router.patch("/{user_id}/deactivate", dependencies=[Depends(require_system_admin)])
def deactivate_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "Usuario no encontrado")
    user.is_active = False
    db.commit()
    return {"message": "Usuario desactivado"}