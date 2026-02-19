from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from app.models.enums import MovementType, ProductStatus


# ── Categoría ─────────────────────────────────────────────────────────────────

class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None
    color: str = "#6366f1"

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None

class CategoryResponse(BaseModel):
    id: int
    business_id: int
    name: str
    description: Optional[str]
    color: str
    is_active: bool
    created_at: datetime
    class Config:
        from_attributes = True


# ── Bodega ────────────────────────────────────────────────────────────────────

class WarehouseCreate(BaseModel):
    name: str
    description: Optional[str] = None
    is_default: bool = False

class WarehouseUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_default: Optional[bool] = None

class WarehouseResponse(BaseModel):
    id: int
    business_id: int
    name: str
    description: Optional[str]
    is_default: bool
    is_active: bool
    created_at: datetime
    class Config:
        from_attributes = True


# ── Stock ─────────────────────────────────────────────────────────────────────

class StockResponse(BaseModel):
    warehouse_id: int
    warehouse_name: str
    quantity: Decimal
    class Config:
        from_attributes = True


# ── Lote ──────────────────────────────────────────────────────────────────────

class LotCreate(BaseModel):
    lot_number: Optional[str] = None
    quantity: Decimal
    cost_per_unit: Optional[Decimal] = None
    arrival_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None

class LotResponse(BaseModel):
    id: int
    presentation_id: int
    warehouse_id: int
    lot_number: Optional[str]
    quantity: Decimal
    remaining: Decimal
    cost_per_unit: Optional[Decimal]
    arrival_date: datetime
    expiry_date: Optional[datetime]
    is_expired: bool
    days_to_expiry: Optional[int]
    is_active: bool
    class Config:
        from_attributes = True


# ── Presentación ──────────────────────────────────────────────────────────────

class PresentationCreate(BaseModel):
    name: str
    barcode: Optional[str] = None
    sale_price: Decimal
    min_stock: int = 0

class PresentationUpdate(BaseModel):
    name: Optional[str] = None
    barcode: Optional[str] = None
    sale_price: Optional[Decimal] = None
    min_stock: Optional[int] = None
    is_active: Optional[bool] = None

class PresentationResponse(BaseModel):
    id: int
    product_id: int
    name: str
    barcode: Optional[str]
    sale_price: Decimal
    min_stock: int
    is_active: bool
    stock: List[StockResponse] = []
    class Config:
        from_attributes = True


# ── Producto ──────────────────────────────────────────────────────────────────

class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category_id: Optional[int] = None
    is_perishable: bool = False
    presentations: List[PresentationCreate] = []

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[int] = None
    is_perishable: Optional[bool] = None
    status: Optional[ProductStatus] = None

class ProductResponse(BaseModel):
    id: int
    business_id: int
    name: str
    description: Optional[str]
    category_id: Optional[int]
    category: Optional[CategoryResponse]
    is_perishable: bool
    status: ProductStatus
    is_active: bool
    presentations: List[PresentationResponse] = []
    created_at: datetime
    class Config:
        from_attributes = True


# ── Movimientos ───────────────────────────────────────────────────────────────

class EntryCreate(BaseModel):
    """Entrada de inventario (compra / entrada manual)"""
    presentation_id: int
    warehouse_id: int
    quantity: Decimal
    cost_per_unit: Optional[Decimal] = None
    lot_number: Optional[str] = None
    arrival_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    reason: Optional[str] = None

class AdjustmentCreate(BaseModel):
    """Ajuste manual de inventario"""
    presentation_id: int
    warehouse_id: int
    quantity: Decimal   # puede ser negativo
    reason: str         # obligatorio en ajustes

class TransferCreate(BaseModel):
    """Transferencia entre bodegas"""
    presentation_id: int
    from_warehouse_id: int
    to_warehouse_id: int
    quantity: Decimal
    reason: Optional[str] = None

class MovementResponse(BaseModel):
    id: int
    presentation_id: int
    warehouse_id: int
    movement_type: MovementType
    quantity: Decimal
    cost_per_unit: Optional[Decimal]
    reason: Optional[str]
    destination_warehouse_id: Optional[int]
    reference_type: Optional[str]
    created_by: int
    created_at: datetime
    class Config:
        from_attributes = True


# ── Alertas ───────────────────────────────────────────────────────────────────

class LowStockAlert(BaseModel):
    product_id: int
    product_name: str
    presentation_id: int
    presentation_name: str
    warehouse_id: int
    warehouse_name: str
    current_stock: Decimal
    min_stock: int

class ExpiryAlert(BaseModel):
    product_id: int
    product_name: str
    presentation_id: int
    presentation_name: str
    lot_id: int
    lot_number: Optional[str]
    expiry_date: datetime
    days_to_expiry: int
    remaining: Decimal