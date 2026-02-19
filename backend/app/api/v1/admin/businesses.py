from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from app.database import get_db
from app.models.user import User
from app.models.business import Business
from app.models.enums import BusinessType, SubscriptionPlan
from app.schemas.business import BusinessResponse
from app.utils.audit import log_action
from .deps import require_admin_role, require_super_admin

router = APIRouter()

@router.get("/businesses", response_model=List[BusinessResponse])
def list_all_businesses(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_role),
    search: Optional[str] = Query(None, description="Buscar por nombre"),
    business_type: Optional[BusinessType] = Query(None),
    plan_type: Optional[SubscriptionPlan] = Query(None),
    is_active: Optional[bool] = Query(None),
):
    query = db.query(Business)

    if search:
        query = query.filter(Business.name.ilike(f"%{search.lower()}%"))
    if business_type is not None:
        query = query.filter(Business.business_type == business_type)
    if plan_type is not None:
        query = query.filter(Business.plan_type == plan_type)
    if is_active is not None:
        query = query.filter(Business.is_active == is_active)

    return query.order_by(Business.created_at.desc()).all()

@router.get("/businesses/{business_id}", response_model=BusinessResponse)
def get_business_admin(
    business_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_role)
):
    """Obtiene detalles de un negocio."""
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(404, "Negocio no encontrado")
    return business

class ModulesUpdate(BaseModel):
    module_inventory: bool | None = None
    module_sales: bool | None = None
    module_clients: bool | None = None
    module_portfolio: bool | None = None
    module_finance: bool | None = None
    module_suppliers: bool | None = None
    module_reports: bool | None = None
    module_waste: bool | None = None

@router.patch("/businesses/{business_id}/modules", response_model=BusinessResponse)
def update_business_modules(
    business_id: int,
    data: ModulesUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    """
    Actualiza los módulos habilitados de un negocio (solo super_admin).
    Permite overrides manuales para dar acceso custom sin cambiar plan.
    """
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(404, "Negocio no encontrado")
    
    changes = {}
    for field, value in data.model_dump(exclude_none=True).items():
        old_value = getattr(business, field)
        if old_value != value:
            changes[field] = {"from": old_value, "to": value}
            setattr(business, field, value)
    
    db.commit()
    db.refresh(business)
    
    if changes:
        log_action(
            db, current_user.id, "UPDATE_BUSINESS_MODULES", "Business", business.id,
            details={"business_name": business.name, "changes": changes}
        )
    
    return business