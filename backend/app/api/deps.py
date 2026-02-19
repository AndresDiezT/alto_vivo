from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.core.security import decode_access_token
from app.models.user import User
from app.models.enums import SystemRole
from app.models.business import Business, BusinessUser
from app.models.role import BusinessRole, Permission

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

# ─────────────────────────────────────────────
# Dependencias de usuario autenticado
# ─────────────────────────────────────────────

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales inválidas",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(token)
    if not payload:
        raise exc
    user = db.query(User).filter(User.id == payload.get("sub")).first()
    if not user or not user.is_active:
        raise exc
    return user

def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    return current_user

def require_system_admin(current_user: User = Depends(get_current_active_user)) -> User:
    if current_user.system_role not in [SystemRole.ADMIN, SystemRole.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Se requieren permisos de administrador")
    return current_user

# ─────────────────────────────────────────────
# Dependencias de negocio
# ─────────────────────────────────────────────

def get_business_or_404(business_id: int, db: Session = Depends(get_db)) -> Business:
    business = db.query(Business).filter(
        Business.id == business_id,
        Business.is_active == True
    ).first()
    if not business:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")
    return business

def verify_business_access(
    business_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> tuple[Business, bool]:
    """
    Retorna (business, is_owner).
    Lanza 403 si el usuario no tiene ningún tipo de acceso.
    """
    business = db.query(Business).filter(
        Business.id == business_id,
        Business.is_active == True
    ).first()
    if not business:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")

    if business.owner_id == current_user.id:
        return business, True

    member = db.query(BusinessUser).filter(
        BusinessUser.business_id == business_id,
        BusinessUser.user_id == current_user.id,
        BusinessUser.is_active == True
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="Sin acceso a este negocio")

    return business, False

def verify_business_owner(
    business_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Business:
    business = db.query(Business).filter(
        Business.id == business_id,
        Business.owner_id == current_user.id,
        Business.is_active == True
    ).first()
    if not business:
        raise HTTPException(status_code=403, detail="No eres el dueño de este negocio")
    return business

def verify_can_manage_users(
    business_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Business:
    """
    El dueño siempre puede. Un empleado puede si su rol tiene can_manage_users=True.
    """
    business = db.query(Business).filter(
        Business.id == business_id,
        Business.is_active == True
    ).first()
    if not business:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")

    if business.owner_id == current_user.id:
        return business

    member = db.query(BusinessUser).filter(
        BusinessUser.business_id == business_id,
        BusinessUser.user_id == current_user.id,
        BusinessUser.is_active == True
    ).first()

    if not member or not member.business_role or not member.business_role.can_manage_users:
        raise HTTPException(status_code=403, detail="Sin permiso para gestionar usuarios")

    return business

def verify_can_manage_roles(
    business_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Business:
    business = db.query(Business).filter(
        Business.id == business_id,
        Business.is_active == True
    ).first()
    if not business:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")

    if business.owner_id == current_user.id:
        return business

    member = db.query(BusinessUser).filter(
        BusinessUser.business_id == business_id,
        BusinessUser.user_id == current_user.id,
        BusinessUser.is_active == True
    ).first()

    if not member or not member.business_role or not member.business_role.can_manage_roles:
        raise HTTPException(status_code=403, detail="Sin permiso para gestionar roles")

    return business

# ─────────────────────────────────────────────
# Helper: verificar permiso granular
# ─────────────────────────────────────────────

def check_permission(
    permission_code: str,
    business_id: int,
    current_user: User,
    db: Session
) -> bool:
    """
    Útil para usar dentro de endpoints de módulos futuros.
    El dueño siempre tiene todos los permisos.
    """
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        return False
    if business.owner_id == current_user.id:
        return True

    member = db.query(BusinessUser).filter(
        BusinessUser.business_id == business_id,
        BusinessUser.user_id == current_user.id,
        BusinessUser.is_active == True
    ).first()
    if not member or not member.business_role:
        return False

    has_perm = any(p.code == permission_code for p in member.business_role.permissions)
    return has_perm