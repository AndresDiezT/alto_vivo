from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class PermissionResponse(BaseModel):
    id: int
    code: str
    name: str
    module: str
    description: Optional[str]

    class Config:
        from_attributes = True

class RoleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    permission_codes: List[str]
    can_manage_users: bool = False
    can_manage_roles: bool = False

class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    permission_codes: Optional[List[str]] = None
    can_manage_users: Optional[bool] = None
    can_manage_roles: Optional[bool] = None

class RoleResponse(BaseModel):
    id: int
    business_id: int
    name: str
    description: Optional[str]
    is_default: bool
    can_manage_users: bool
    can_manage_roles: bool
    permissions: List[PermissionResponse]
    created_at: datetime

    class Config:
        from_attributes = True

class AuditLogResponse(BaseModel):
    id: int
    user_id: int
    action: str
    entity_type: str
    entity_id: Optional[int]
    details: Optional[str]
    ip_address: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True