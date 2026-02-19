import enum

class SystemRole(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    USER = "user"
    SUPPORT = "support"
    
class SubscriptionPlan(str, enum.Enum):
    FREE = "free"
    BASIC = "basic"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"

class BusinessType(str, enum.Enum):
    RETAIL = "retail"
    RESTAURANT = "restaurant"
    WHOLESALE = "wholesale"
    OTHER = "other"

# INVENTARIO

class MovementType(str, enum.Enum):
    ENTRY = "entry"           # Compra / entrada manual
    SALE = "sale"             # Salida por venta
    ADJUSTMENT = "adjustment" # Ajuste manual
    TRANSFER_IN = "transfer_in"
    TRANSFER_OUT = "transfer_out"
    WASTE = "waste"           # Merma


class ProductStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"

# CLIENTES

class ClientStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"  # sin compras en 30+ días
    MOROSO = "moroso"      # deuda vencida
    BLOCKED = "blocked"    # bloqueado manualmente


class ClientType(str, enum.Enum):
    NATURAL = "natural"
    EMPRESA = "empresa"
    
# VENTAS

class SaleStatus(str, enum.Enum):
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    PARTIAL = "partial"  # Pago parcial (parte contado, parte fiado)
    
# PROVEEDORES

class SupplierStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"


class PurchaseStatus(str, enum.Enum):
    COMPLETED = "completed"
    PARTIAL = "partial"    # Pago parcial — quedó deuda
    CANCELLED = "cancelled"


class SupplierPaymentStatus(str, enum.Enum):
    PENDING = "pending"
    PAID = "paid"
    OVERDUE = "overdue"
    
# FINANZAS

class CashRegisterStatus(str, enum.Enum):
    OPEN = "open"
    CLOSED = "closed"


class CashMovementType(str, enum.Enum):
    INCOME = "income"    # Entrada manual (ej: préstamo, otro ingreso)
    EXPENSE = "expense"  # Salida manual (ej: pago de servicio, gasto)
    
# MERMA

class WasteCause(str, enum.Enum):
    DAMAGED = "damaged"       # Producto dañado
    EXPIRED = "expired"       # Producto vencido
    THEFT = "theft"           # Robo o pérdida
    INVENTORY_ERROR = "inventory_error"  # Error de inventario
    SAMPLE = "sample"         # Muestra o regalo