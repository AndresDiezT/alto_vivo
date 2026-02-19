import json
from sqlalchemy.orm import Session
from app.models.role import AuditLog

def log_action(
    db: Session,
    user_id: int,
    action: str,
    entity_type: str,
    entity_id: int = None,
    business_id: int = None,
    details: dict = None,
    ip_address: str = None
):
    """
    Registra una acción en el log de auditoría.
    
    Acciones estándar: CREATE, UPDATE, DELETE, LOGIN, LOGOUT, INVITE, REMOVE
    """
    log = AuditLog(
        user_id=user_id,
        business_id=business_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=json.dumps(details) if details else None,
        ip_address=ip_address
    )
    db.add(log)
    db.commit()