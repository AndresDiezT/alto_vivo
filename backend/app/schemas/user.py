from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from app.models.user import SystemRole, SubscriptionPlan
from app.schemas.business import BusinessResponse

class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: Optional[str] = None
    phone: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    password: Optional[str] = None
    
class UserChangePassword(BaseModel):
    current_password: str
    new_password: str

class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    full_name: Optional[str]
    phone: Optional[str]
    system_role: SystemRole
    subscription_plan: SubscriptionPlan
    is_active: bool
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True
        

class UserWithBusinesses(BaseModel):
    """Usuario con sus negocios propios y donde es empleado."""
    id: int
    email: str
    username: str
    full_name: str | None
    phone: str | None
    system_role: SystemRole
    subscription_plan: SubscriptionPlan
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: datetime
    owned_businesses: List[BusinessResponse] = []
    member_businesses: List[BusinessResponse] = []
    
    class Config:
        from_attributes = True