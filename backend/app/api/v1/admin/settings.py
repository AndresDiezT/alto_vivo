from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict
from pydantic import BaseModel
from app.database import get_db
from app.models.user import User
from app.models.system_settings import SystemSetting
from app.utils.audit import log_action
from .deps import require_admin_role, require_super_admin

router = APIRouter()

class SettingResponse(BaseModel):
    key: str
    value: str
    value_type: str
    label: str
    description: str | None
    group: str

    class Config:
        from_attributes = True

class SettingUpdate(BaseModel):
    value: str

class BulkSettingsUpdate(BaseModel):
    settings: Dict[str, str]  # {key: value}

@router.get("/settings", response_model=List[SettingResponse])
def get_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_role),
):
    return db.query(SystemSetting).order_by(SystemSetting.group, SystemSetting.key).all()

@router.patch("/settings/{key}", response_model=SettingResponse)
def update_setting(
    key: str,
    data: SettingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if not setting:
        raise HTTPException(404, "Configuración no encontrada")

    old_value = setting.value
    setting.value = data.value
    setting.updated_by = current_user.id
    db.commit()
    db.refresh(setting)

    log_action(
        db, current_user.id, "UPDATE_SETTING", "SystemSetting", setting.id,
        details={"key": key, "from": old_value, "to": data.value}
    )
    return setting

@router.patch("/settings", response_model=List[SettingResponse])
def bulk_update_settings(
    data: BulkSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    """Guarda múltiples settings en una sola llamada."""
    updated = []
    for key, value in data.settings.items():
        setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
        if setting:
            old_value = setting.value
            setting.value = value
            setting.updated_by = current_user.id
            updated.append(setting)
            log_action(
                db, current_user.id, "UPDATE_SETTING", "SystemSetting", setting.id,
                details={"key": key, "from": old_value, "to": value}
            )
    db.commit()
    for s in updated:
        db.refresh(s)
    return updated