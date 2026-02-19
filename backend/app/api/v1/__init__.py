from fastapi import APIRouter
from app.api.v1 import (
    auth, users, business, roles,
    inventory, clients, sales, suppliers, finances, wastes,
    reports,
)
from app.api.v1.admin import admin_router

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(business.router)
api_router.include_router(roles.router)
api_router.include_router(inventory.router)
api_router.include_router(clients.router)
api_router.include_router(sales.router)
api_router.include_router(suppliers.router)
api_router.include_router(finances.router)
api_router.include_router(wastes.router)
api_router.include_router(reports.router)

api_router.include_router(admin_router)