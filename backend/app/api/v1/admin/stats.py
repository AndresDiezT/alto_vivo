from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models.user import User
from app.models.business import Business
from .deps import require_admin_role

router = APIRouter()

class AdminStats(BaseModel):
    total_users: int
    active_users: int
    total_businesses: int
    active_businesses: int

@router.get("/stats", response_model=AdminStats)
def get_admin_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_role)
):
    """Obtiene estadísticas generales del sistema."""
    return {
        "total_users": db.query(User).count(),
        "active_users": db.query(User).filter(User.is_active == True).count(),
        "total_businesses": db.query(Business).count(),
        "active_businesses": db.query(Business).filter(Business.is_active == True).count(),
    }