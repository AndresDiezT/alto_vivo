from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.enums import BusinessType, SubscriptionPlan

class BusinessCreate(BaseModel):
    name: str
    description: Optional[str] = None
    business_type: BusinessType = BusinessType.RETAIL
    plan_type: SubscriptionPlan = SubscriptionPlan.FREE

class BusinessUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    business_type: Optional[BusinessType] = None

class BusinessResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    business_type: BusinessType
    plan_type: SubscriptionPlan
    max_users: int
    max_products: int
    owner_id: int
    is_active: bool
    created_at: datetime
    module_inventory: bool
    module_sales: bool
    module_clients: bool
    module_portfolio: bool
    module_finance: bool
    module_suppliers: bool
    module_reports: bool
    module_waste: bool

    class Config:
        from_attributes = True

class BusinessUserInvite(BaseModel):
    user_email: str
    business_role_id: int

class BusinessUserUpdateRole(BaseModel):
    business_role_id: int

class BusinessUserResponse(BaseModel):
    id: int
    user_id: int
    user_email: str
    user_name: str
    role_id: Optional[int]
    role_name: Optional[str]
    is_active: bool
    joined_at: datetime
    can_manage_users: Optional[bool] = False
    can_manage_roles: Optional[bool] = False
    permissions: Optional[List[str]] = []

    class Config:
        from_attributes = True