from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.role import BusinessRole, Permission
from app.models.business import BusinessUser
from app.schemas.role import RoleCreate, RoleUpdate, RoleResponse
from app.api.deps import (
    get_current_active_user,
    verify_business_access,
    verify_can_manage_roles
)
from app.utils.audit import log_action
from app.models.user import User

router = APIRouter(prefix="/businesses/{business_id}/roles", tags=["Roles"])


@router.get("/permissions")
def list_all_permissions(
    result = Depends(verify_business_access),
    db: Session = Depends(get_db)
):
    """Lista todos los permisos disponibles, agrupados por módulo."""
    perms = db.query(Permission).all()
    grouped = {}
    for p in perms:
        grouped.setdefault(p.module, []).append({
            "id": p.id, "code": p.code, "name": p.name
        })
    return grouped


@router.post("", response_model=RoleResponse, status_code=201)
def create_role(
    business_id: int,
    data: RoleCreate,
    business = Depends(verify_can_manage_roles),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    role = BusinessRole(
        business_id=business_id,
        name=data.name,
        description=data.description,
        can_manage_users=data.can_manage_users,
        can_manage_roles=data.can_manage_roles,
        is_default=False
    )
    db.add(role)
    db.flush()

    perms = db.query(Permission).filter(Permission.code.in_(data.permission_codes)).all()
    role.permissions = perms

    db.commit()
    db.refresh(role)

    log_action(db, current_user.id, "CREATE", "BusinessRole", role.id,
               business_id=business_id, details={"role_name": role.name})
    return role


@router.get("", response_model=List[RoleResponse])
def list_roles(
    business_id: int,
    result = Depends(verify_business_access),
    db: Session = Depends(get_db)
):
    return db.query(BusinessRole).filter(BusinessRole.business_id == business_id).all()


@router.get("/{role_id}", response_model=RoleResponse)
def get_role(
    business_id: int,
    role_id: int,
    result = Depends(verify_business_access),
    db: Session = Depends(get_db)
):
    role = db.query(BusinessRole).filter(
        BusinessRole.id == role_id,
        BusinessRole.business_id == business_id
    ).first()
    if not role:
        raise HTTPException(404, "Rol no encontrado")
    return role


@router.patch("/{role_id}", response_model=RoleResponse)
def update_role(
    business_id: int,
    role_id: int,
    data: RoleUpdate,
    business = Depends(verify_can_manage_roles),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    role = db.query(BusinessRole).filter(
        BusinessRole.id == role_id,
        BusinessRole.business_id == business_id
    ).first()
    if not role:
        raise HTTPException(404, "Rol no encontrado")
    if role.is_default:
        raise HTTPException(400, "El rol por defecto no puede modificarse")

    if data.name is not None:
        role.name = data.name
    if data.description is not None:
        role.description = data.description
    if data.can_manage_users is not None:
        role.can_manage_users = data.can_manage_users
    if data.can_manage_roles is not None:
        role.can_manage_roles = data.can_manage_roles
    if data.permission_codes is not None:
        perms = db.query(Permission).filter(Permission.code.in_(data.permission_codes)).all()
        role.permissions = perms

    db.commit()
    db.refresh(role)

    log_action(db, current_user.id, "UPDATE", "BusinessRole", role.id,
               business_id=business_id, details={"role_name": role.name})
    return role


@router.delete("/{role_id}", status_code=204)
def delete_role(
    business_id: int,
    role_id: int,
    business = Depends(verify_can_manage_roles),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    role = db.query(BusinessRole).filter(
        BusinessRole.id == role_id,
        BusinessRole.business_id == business_id
    ).first()
    if not role:
        raise HTTPException(404, "Rol no encontrado")
    if role.is_default:
        raise HTTPException(400, "No se puede eliminar el rol por defecto")

    # Verificar que no hay usuarios con este rol
    in_use = db.query(BusinessUser).filter(
        BusinessUser.business_role_id == role_id,
        BusinessUser.is_active == True
    ).count()
    if in_use > 0:
        raise HTTPException(
            400,
            f"No se puede eliminar: {in_use} usuario(s) tienen este rol asignado"
        )

    db.delete(role)
    db.commit()

    log_action(db, current_user.id, "DELETE", "BusinessRole", role_id,
               business_id=business_id)