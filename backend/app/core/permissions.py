from typing import List

# Definición de permisos por módulo
PERMISSIONS = {
    "inventory": [
        "inventory.view", "inventory.create", "inventory.update", "inventory.delete",
        "inventory.adjust", "inventory.report"
    ],
    "sales": [
        "sales.view", "sales.create", "sales.cancel", "sales.report"
    ],
    "clients": [
        "clients.view", "clients.create", "clients.update", "clients.delete"
    ],
    "portfolio": [
        "portfolio.view", "portfolio.collect", "portfolio.adjust", "portfolio.report"
    ],
    "finance": [
        "finance.view", "finance.create", "finance.update", "finance.report"
    ],
    "suppliers": [
        "suppliers.view", "suppliers.create", "suppliers.update", "suppliers.delete"
    ],
    "reports": [
        "reports.sales", "reports.inventory", "reports.finance", "reports.clients"
    ],
    "waste": [
        "waste.view", "waste.register", "waste.report"
    ]
}

def get_default_employee_permissions() -> List[str]:
    """Permisos básicos para rol de empleado"""
    return [
        "inventory.view",
        "sales.view", "sales.create",
        "clients.view"
    ]