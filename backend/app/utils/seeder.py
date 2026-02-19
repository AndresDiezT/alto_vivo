import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.models.role import Permission
from app.models.system_settings import SystemSetting

# ── Permissions ───────────────────────────────────────────────────────────────

PERMISSIONS_DATA = [
    # Inventario
    ("inventory.view",    "Ver inventario",         "inventory"),
    ("inventory.create",  "Crear productos",         "inventory"),
    ("inventory.update",  "Editar productos",        "inventory"),
    ("inventory.delete",  "Eliminar productos",      "inventory"),
    ("inventory.adjust",  "Ajustar stock",           "inventory"),
    ("inventory.report",  "Reportes de inventario",  "inventory"),
    # Ventas
    ("sales.view",        "Ver ventas",              "sales"),
    ("sales.create",      "Registrar ventas",        "sales"),
    ("sales.cancel",      "Cancelar ventas",         "sales"),
    ("sales.report",      "Reportes de ventas",      "sales"),
    # Clientes
    ("clients.view",      "Ver clientes",            "clients"),
    ("clients.create",    "Crear clientes",          "clients"),
    ("clients.update",    "Editar clientes",         "clients"),
    ("clients.delete",    "Eliminar clientes",       "clients"),
    # Cartera
    ("portfolio.view",    "Ver cartera",             "portfolio"),
    ("portfolio.collect", "Registrar cobros",        "portfolio"),
    ("portfolio.adjust",  "Ajustar deudas",          "portfolio"),
    ("portfolio.report",  "Reportes de cartera",     "portfolio"),
    # Finanzas
    ("finance.view",      "Ver finanzas",            "finance"),
    ("finance.create",    "Registrar movimientos",   "finance"),
    ("finance.update",    "Editar movimientos",      "finance"),
    ("finance.report",    "Reportes financieros",    "finance"),
    # Proveedores
    ("suppliers.view",    "Ver proveedores",         "suppliers"),
    ("suppliers.create",  "Crear proveedores",       "suppliers"),
    ("suppliers.update",  "Editar proveedores",      "suppliers"),
    ("suppliers.delete",  "Eliminar proveedores",    "suppliers"),
    # Reportes
    ("reports.sales",     "Reporte de ventas",       "reports"),
    ("reports.inventory", "Reporte de inventario",   "reports"),
    ("reports.finance",   "Reporte financiero",      "reports"),
    ("reports.clients",   "Reporte de clientes",     "reports"),
    # Mermas
    ("waste.view",        "Ver mermas",              "waste"),
    ("waste.register",    "Registrar mermas",        "waste"),
    ("waste.report",      "Reportes de mermas",      "waste"),
]

# ── Settings ──────────────────────────────────────────────────────────────────

DEFAULT_SETTINGS = [
    # general
    {
        "key": "app_maintenance_mode",
        "value": "false",
        "value_type": "bool",
        "label": "Modo mantenimiento",
        "description": "Bloquea el acceso a todos los usuarios no administradores",
        "group": "general",
    },
    {
        "key": "allow_registration",
        "value": "true",
        "value_type": "bool",
        "label": "Registro abierto",
        "description": "Permite que nuevos usuarios se registren",
        "group": "general",
    },
    # limits
    {
        "key": "default_max_users_free",
        "value": "1",
        "value_type": "int",
        "label": "Máx. usuarios plan Free",
        "description": "Límite de usuarios por negocio en el plan Free",
        "group": "limits",
    },
    {
        "key": "default_max_products_free",
        "value": "100",
        "value_type": "int",
        "label": "Máx. productos plan Free",
        "description": "Límite de productos por negocio en el plan Free",
        "group": "limits",
    },
    {
        "key": "default_max_users_basic",
        "value": "5",
        "value_type": "int",
        "label": "Máx. usuarios plan Basic",
        "group": "limits",
    },
    {
        "key": "default_max_products_basic",
        "value": "500",
        "value_type": "int",
        "label": "Máx. productos plan Basic",
        "group": "limits",
    },
    {
        "key": "default_max_users_professional",
        "value": "20",
        "value_type": "int",
        "label": "Máx. usuarios plan Professional",
        "group": "limits",
    },
    {
        "key": "default_max_products_professional",
        "value": "5000",
        "value_type": "int",
        "label": "Máx. productos plan Professional",
        "group": "limits",
    },
    # features
    {
        "key": "audit_log_retention_days",
        "value": "90",
        "value_type": "int",
        "label": "Retención de audit logs (días)",
        "description": "Días que se conservan los registros de auditoría",
        "group": "features",
    },
]

# ── Funciones públicas ────────────────────────────────────────────────────────

def seed_permissions(db: Session) -> int:
    """Inserta permisos que no existan aún. Idempotente. Retorna cantidad insertada."""
    count = 0
    for code, name, module in PERMISSIONS_DATA:
        if not db.query(Permission).filter(Permission.code == code).first():
            db.add(Permission(code=code, name=name, module=module))
            count += 1
    db.commit()
    return count


def seed_default_settings(db: Session) -> int:
    """Inserta settings que no existan aún. Idempotente. Retorna cantidad insertada."""
    count = 0
    for s in DEFAULT_SETTINGS:
        if not db.query(SystemSetting).filter(SystemSetting.key == s["key"]).first():
            db.add(SystemSetting(**s))
            count += 1
    db.commit()
    return count


def run_all_seeders(db: Session) -> None:
    """Ejecuta todos los seeders en orden."""
    p = seed_permissions(db)
    s = seed_default_settings(db)
    print(f"✅ Seeders completados — {p} permisos, {s} settings insertados.")


# ── Ejecución directa ─────────────────────────────────────────────────────────

if __name__ == "__main__":
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        run_all_seeders(db)
    finally:
        db.close()