from fastapi import APIRouter
from .stats import router as stats_router
from .users import router as users_router
from .businesses import router as businesses_router
from .audit_logs import router as audit_logs_router
from .settings import router as settings_router

admin_router = APIRouter(prefix="/admin", tags=["admin"])

admin_router.include_router(stats_router)
admin_router.include_router(users_router)
admin_router.include_router(businesses_router)
admin_router.include_router(audit_logs_router)
admin_router.include_router(settings_router)