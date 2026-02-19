from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.user import User
from app.models.business import Business, BusinessUser
from app.models.role import BusinessRole, Permission
from app.models.sale import PaymentMethod
from app.schemas.business import (
    BusinessCreate, BusinessResponse,
    BusinessUserInvite, BusinessUserUpdateRole, BusinessUserResponse
)
from app.api.deps import (
    get_current_active_user,
    verify_business_access,
    verify_business_owner,
    verify_can_manage_users
)
from app.utils.audit import log_action
from app.utils.plan_limits import get_modules_for_plan, get_max_businesses
from app.core.permissions import get_default_employee_permissions

router = APIRouter(prefix="/businesses", tags=["Negocios"])


# ── CRUD de negocio ────────────────────────────────────────────────────────────

@router.post("", response_model=BusinessResponse, status_code=201)
def create_business(
    data: BusinessCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    count = db.query(Business).filter(Business.owner_id == current_user.id).count()
    limit = get_max_businesses(current_user.subscription_plan)

    if count >= limit:
        raise HTTPException(
            403,
            f"Tu plan permite máximo {limit} negocio(s). "
            f"Actualiza tu suscripción para crear más."
        )

    modules = get_modules_for_plan(data.plan_type)
    business = Business(
        name=data.name,
        description=data.description,
        business_type=data.business_type,
        plan_type=data.plan_type,
        owner_id=current_user.id,
        **modules
    )
    db.add(business)
    db.flush()

    # Rol por defecto "Empleado"
    default_role = BusinessRole(
        business_id=business.id,
        name="Empleado",
        description="Rol básico para empleados",
        is_default=True,
        can_manage_users=False,
        can_manage_roles=False
    )
    db.add(default_role)
    db.flush()
    
    default_methods = [
    PaymentMethod(business_id=business.id, name="Efectivo", is_default=True, is_credit=False),
    PaymentMethod(business_id=business.id, name="Credito", is_default=True, is_credit=True),
    ]
    for m in default_methods:
        db.add(m)

    # Asignar permisos básicos al rol empleado
    default_codes = get_default_employee_permissions()
    perms = db.query(Permission).filter(Permission.code.in_(default_codes)).all()
    default_role.permissions = perms

    db.commit()
    db.refresh(business)

    log_action(db, current_user.id, "CREATE", "Business", business.id,
               business_id=business.id, details={"name": business.name})
    return business


@router.get("", response_model=List[BusinessResponse])
def list_my_businesses(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    owned = db.query(Business).filter(
        Business.owner_id == current_user.id,
        Business.is_active == True
    ).all()

    memberships = db.query(BusinessUser).filter(
        BusinessUser.user_id == current_user.id,
        BusinessUser.is_active == True
    ).all()
    member_businesses = [m.business for m in memberships if m.business.is_active]

    # Evitar duplicados (dueño que también aparece como miembro)
    all_ids = {b.id for b in owned}
    for b in member_businesses:
        if b.id not in all_ids:
            owned.append(b)
            all_ids.add(b.id)

    return owned


@router.get("/{business_id}", response_model=BusinessResponse)
def get_business(
    result = Depends(verify_business_access)
):
    business, _ = result
    return business


@router.delete("/{business_id}", status_code=204)
def delete_business(
    business: Business = Depends(verify_business_owner),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    business.is_active = False
    db.commit()
    log_action(db, current_user.id, "DELETE", "Business", business.id,
               business_id=business.id)


# ── Gestión de usuarios del negocio ───────────────────────────────────────────

@router.post("/{business_id}/users", response_model=BusinessUserResponse, status_code=201)
def invite_user(
    business_id: int,
    data: BusinessUserInvite,
    business: Business = Depends(verify_can_manage_users),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # Verificar límite de usuarios del plan
    active_count = db.query(BusinessUser).filter(
        BusinessUser.business_id == business_id,
        BusinessUser.is_active == True
    ).count()

    if active_count >= business.max_users:
        raise HTTPException(
            403,
            f"Este negocio ya tiene el máximo de {business.max_users} usuario(s) "
            f"según su plan. Actualiza el plan del negocio."
        )

    target_user = db.query(User).filter(User.email == data.user_email).first()
    if not target_user:
        raise HTTPException(404, "No existe un usuario con ese email")

    if target_user.id == business.owner_id:
        raise HTTPException(400, "El dueño del negocio no puede ser agregado como empleado")

    existing = db.query(BusinessUser).filter(
        BusinessUser.business_id == business_id,
        BusinessUser.user_id == target_user.id
    ).first()

    if existing:
        if existing.is_active:
            raise HTTPException(400, "El usuario ya pertenece a este negocio")
        # Reactivar si fue removido antes
        existing.is_active = True
        existing.business_role_id = data.business_role_id
        existing.invited_by = current_user.id
        db.commit()
        db.refresh(existing)
        return _build_user_response(existing, target_user)

    # Verificar que el rol pertenece al negocio
    role = db.query(BusinessRole).filter(
        BusinessRole.id == data.business_role_id,
        BusinessRole.business_id == business_id
    ).first()
    if not role:
        raise HTTPException(404, "Rol no encontrado en este negocio")

    new_member = BusinessUser(
        business_id=business_id,
        user_id=target_user.id,
        business_role_id=data.business_role_id,
        invited_by=current_user.id
    )
    db.add(new_member)
    db.commit()
    db.refresh(new_member)

    log_action(db, current_user.id, "INVITE", "BusinessUser", new_member.id,
               business_id=business_id, details={"invited_user": target_user.email})

    return _build_user_response(new_member, target_user)


@router.get("/{business_id}/users", response_model=List[BusinessUserResponse])
def list_business_users(
    business_id: int,
    result = Depends(verify_business_access),
    db: Session = Depends(get_db)
):
    business, _ = result
    members = db.query(BusinessUser).filter(
        BusinessUser.business_id == business_id,
        BusinessUser.is_active == True
    ).all()
    return [_build_user_response(m, m.user) for m in members]


@router.patch("/{business_id}/users/{user_id}/role", response_model=BusinessUserResponse)
def update_user_role(
    business_id: int,
    user_id: int,
    data: BusinessUserUpdateRole,
    business: Business = Depends(verify_can_manage_users),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    member = db.query(BusinessUser).filter(
        BusinessUser.business_id == business_id,
        BusinessUser.user_id == user_id,
        BusinessUser.is_active == True
    ).first()
    if not member:
        raise HTTPException(404, "Usuario no encontrado en este negocio")

    role = db.query(BusinessRole).filter(
        BusinessRole.id == data.business_role_id,
        BusinessRole.business_id == business_id
    ).first()
    if not role:
        raise HTTPException(404, "Rol no encontrado")

    member.business_role_id = data.business_role_id
    db.commit()
    db.refresh(member)

    log_action(db, current_user.id, "UPDATE_ROLE", "BusinessUser", member.id,
               business_id=business_id,
               details={"user_id": user_id, "new_role": role.name})

    return _build_user_response(member, member.user)


@router.delete("/{business_id}/users/{user_id}", status_code=204)
def remove_user(
    business_id: int,
    user_id: int,
    business: Business = Depends(verify_can_manage_users),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    member = db.query(BusinessUser).filter(
        BusinessUser.business_id == business_id,
        BusinessUser.user_id == user_id,
        BusinessUser.is_active == True
    ).first()
    if not member:
        raise HTTPException(404, "Usuario no encontrado en este negocio")
    if user_id == business.owner_id:
        raise HTTPException(400, "No puedes remover al dueño del negocio")

    member.is_active = False
    db.commit()

    log_action(db, current_user.id, "REMOVE", "BusinessUser", member.id,
               business_id=business_id, details={"removed_user_id": user_id})


# ── Audit log del negocio ──────────────────────────────────────────────────────

@router.get("/{business_id}/audit-logs")
def get_business_audit_logs(
    business_id: int,
    result = Depends(verify_business_access),
    db: Session = Depends(get_db)
):
    from app.models.role import AuditLog
    business, is_owner = result
    if not is_owner:
        raise HTTPException(403, "Solo el dueño puede ver el audit log")

    logs = db.query(AuditLog).filter(
        AuditLog.business_id == business_id
    ).order_by(AuditLog.created_at.desc()).limit(200).all()
    return logs


# ── Helper interno ─────────────────────────────────────────────────────────────

def _build_user_response(member: BusinessUser, user: User) -> dict:
    """
    Construye el response de BusinessUser incluyendo permisos del rol.
    """
    role = member.business_role
    
    return {
        "id": member.id,
        "user_id": user.id,
        "user_email": user.email,
        "user_name": user.full_name or user.username,
        "role_id": member.business_role_id,
        "role_name": member.business_role.name if member.business_role else None,
        "is_active": member.is_active,
        "joined_at": member.joined_at,
        "can_manage_users": role.can_manage_users if role else False,
        "can_manage_roles": role.can_manage_roles if role else False,
        "permissions": [p.code for p in role.permissions] if role else [],
    }