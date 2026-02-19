from app.models.enums import SubscriptionPlan

# Límites por plan de suscripción del USUARIO (cuántos negocios puede tener)
USER_PLAN_LIMITS = {
    SubscriptionPlan.FREE:         {"max_businesses": 1},
    SubscriptionPlan.BASIC:        {"max_businesses": 3},
    SubscriptionPlan.PROFESSIONAL: {"max_businesses": 10},
}

# Configuración de módulos por plan del NEGOCIO
BUSINESS_PLAN_MODULES = {
    SubscriptionPlan.FREE: {
        "module_inventory": True,
        "module_sales": True,
        "module_clients": True,
        "module_portfolio": True,
        
        "module_finance": False,
        "module_suppliers": False,
        "module_reports": False,
        "module_waste": False,
        "max_users": 1,
        "max_products": 100,
    },
    SubscriptionPlan.BASIC: {
        "module_inventory": True,
        "module_sales": True,
        "module_clients": True,
        "module_portfolio": True,
        "module_finance": True,
        "module_suppliers": True,
        "module_reports": False,
        "module_waste": False,
        "max_users": 5,
        "max_products": 500,
    },
    SubscriptionPlan.PROFESSIONAL: {
        "module_inventory": True,
        "module_sales": True,
        "module_clients": True,
        "module_portfolio": True,
        "module_finance": True,
        "module_suppliers": True,
        "module_reports": True,
        "module_waste": True,
        "max_users": 20,
        "max_products": 2000,
    },
}

def get_modules_for_plan(plan: SubscriptionPlan) -> dict:
    return BUSINESS_PLAN_MODULES.get(plan, BUSINESS_PLAN_MODULES[SubscriptionPlan.FREE])

def get_max_businesses(plan: SubscriptionPlan) -> int:
    return USER_PLAN_LIMITS.get(plan, {"max_businesses": 1})["max_businesses"]