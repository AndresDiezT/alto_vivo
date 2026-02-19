from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import datetime
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from app.database import get_db
from app.models.user import User
from app.models.enums import SystemRole, SubscriptionPlan
from app.models.business import Business, BusinessUser
from app.schemas.user import UserResponse, UserWithBusinesses
from app.schemas.business import BusinessResponse
from app.utils.audit import log_action
from .deps import require_admin_role, require_super_admin

router = APIRouter()

@router.get("/users", response_model=List[UserResponse])
def list_all_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_role),
    # Filtros
    search: Optional[str] = Query(None, description="Buscar por email, username o nombre"),
    system_role: Optional[SystemRole] = Query(None),
    subscription_plan: Optional[SubscriptionPlan] = Query(None),
    is_active: Optional[bool] = Query(None),
    is_verified: Optional[bool] = Query(None),
):
    query = db.query(User)

    if search:
        term = f"%{search.lower()}%"
        query = query.filter(
            User.email.ilike(term) |
            User.username.ilike(term) |
            User.full_name.ilike(term)
        )
    if system_role is not None:
        query = query.filter(User.system_role == system_role)
    if subscription_plan is not None:
        query = query.filter(User.subscription_plan == subscription_plan)
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    if is_verified is not None:
        query = query.filter(User.is_verified == is_verified)

    return query.order_by(User.created_at.desc()).all()

@router.get("/users/{user_id}", response_model=UserWithBusinesses)
def get_user_detail(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_role)
):
    """Obtiene detalles completos de un usuario incluyendo sus negocios."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "Usuario no encontrado")
    
    # Negocios propios
    owned = db.query(Business).filter(Business.owner_id == user_id).all()
    
    # Negocios donde es empleado
    member_business_ids = db.query(BusinessUser.business_id).filter(
        BusinessUser.user_id == user_id
    ).all()
    member = db.query(Business).filter(
        Business.id.in_([b[0] for b in member_business_ids])
    ).all() if member_business_ids else []
    
    return {
        **user.__dict__,
        "owned_businesses": owned,
        "member_businesses": member,
    }

class UserUpdateAdmin(BaseModel):
    system_role: SystemRole | None = None
    subscription_plan: SubscriptionPlan | None = None

@router.patch("/users/{user_id}", response_model=UserResponse)
def update_user_admin(
    user_id: int,
    data: UserUpdateAdmin,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    """Actualiza rol del sistema y plan de suscripción (solo super_admin)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "Usuario no encontrado")
    
    changes = {}
    if data.system_role is not None:
        changes['old_role'] = user.system_role
        changes['new_role'] = data.system_role
        user.system_role = data.system_role
    
    if data.subscription_plan is not None:
        changes['old_plan'] = user.subscription_plan
        changes['new_plan'] = data.subscription_plan
        user.subscription_plan = data.subscription_plan
    
    db.commit()
    db.refresh(user)
    
    log_action(
        db, current_user.id, "UPDATE_USER_ADMIN", "User", user.id,
        details={"user_email": user.email, "changes": changes}
    )
    
    return user

class UserFullUpdate(BaseModel):
    """Actualización completa de usuario (perfil + rol + plan)."""
    full_name: str | None = None
    email: str | None = None
    phone: str | None = None
    system_role: SystemRole | None = None
    subscription_plan: SubscriptionPlan | None = None

@router.patch("/users/{user_id}/full", response_model=UserResponse)
def update_user_full(
    user_id: int,
    data: UserFullUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    """Actualización completa del usuario (solo super_admin)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "Usuario no encontrado")
    
    changes = {}
    for field, value in data.model_dump(exclude_none=True).items():
        old_value = getattr(user, field)
        if old_value != value:
            changes[field] = {"from": old_value, "to": value}
            setattr(user, field, value)
    
    db.commit()
    db.refresh(user)
    
    if changes:
        log_action(
            db, current_user.id, "UPDATE_USER_FULL", "User", user.id,
            details={"user_email": user.email, "changes": changes}
        )
    
    return user

@router.patch("/users/{user_id}/toggle-active", response_model=UserResponse)
def toggle_user_active(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    """Activa/desactiva un usuario (solo super_admin)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "Usuario no encontrado")
    
    if user.id == current_user.id:
        raise HTTPException(400, "No puedes desactivarte a ti mismo")
    
    user.is_active = not user.is_active
    db.commit()
    db.refresh(user)
    
    log_action(
        db, current_user.id,
        "ACTIVATE_USER" if user.is_active else "DEACTIVATE_USER",
        "User", user.id,
        details={"user_email": user.email, "is_active": user.is_active}
    )
    
    return user
