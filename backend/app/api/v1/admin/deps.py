from fastapi import Depends, HTTPException
from app.models.user import User, SystemRole
from app.api.deps import get_current_active_user

def require_admin_role(current_user: User = Depends(get_current_active_user)) -> User:
    """Requiere rol de admin, super_admin o support."""
    if current_user.system_role not in [SystemRole.SUPER_ADMIN, SystemRole.ADMIN, SystemRole.SUPPORT]:
        raise HTTPException(403, "Acceso denegado: se requieren permisos de administrador")
    return current_user

def require_super_admin(current_user: User = Depends(get_current_active_user)) -> User:
    """Requiere rol de super_admin."""
    if current_user.system_role != SystemRole.SUPER_ADMIN:
        raise HTTPException(403, "Acceso denegado: se requiere rol de super admin")
    return current_user