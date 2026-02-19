from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from app.models.enums import SupplierStatus, PurchaseStatus, SupplierPaymentStatus


# ── Proveedor ─────────────────────────────────────────────────────────────────

class SupplierCreate(BaseModel):
    name: str
    contact_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    document_id: Optional[str] = None
    notes: Optional[str] = None
    credit_limit: Decimal = Decimal("0")
    credit_days: int = 30


class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    contact_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    document_id: Optional[str] = None
    notes: Optional[str] = None
    credit_limit: Optional[Decimal] = None
    credit_days: Optional[int] = None
    status: Optional[SupplierStatus] = None


class SupplierResponse(BaseModel):
    id: int
    business_id: int
    name: str
    contact_name: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    address: Optional[str]
    document_id: Optional[str]
    notes: Optional[str]
    credit_limit: Decimal
    current_balance: Decimal
    credit_days: int
    status: SupplierStatus
    is_active: bool
    created_at: datetime
    last_purchase_at: Optional[datetime]

    class Config:
        from_attributes = True


class SupplierStats(BaseModel):
    total_purchases: int
    total_spent: Decimal
    average_purchase: Decimal
    current_balance: Decimal
    total_paid: Decimal
    days_since_last_purchase: Optional[int]


# ── Productos del proveedor ───────────────────────────────────────────────────

class SupplierProductCreate(BaseModel):
    presentation_id: int
    cost_price: Optional[Decimal] = None


class SupplierProductResponse(BaseModel):
    id: int
    supplier_id: int
    presentation_id: int
    product_name: Optional[str] = None
    presentation_name: Optional[str] = None
    cost_price: Optional[Decimal]
    is_active: bool

    class Config:
        from_attributes = True


# ── Compra ────────────────────────────────────────────────────────────────────

class PurchaseItemCreate(BaseModel):
    presentation_id: int
    quantity: Decimal
    cost_per_unit: Decimal
    lot_number: Optional[str] = None
    expiry_date: Optional[datetime] = None


class PurchaseItemResponse(BaseModel):
    id: int
    presentation_id: int
    quantity: Decimal
    cost_per_unit: Decimal
    subtotal: Decimal
    lot_number: Optional[str]
    expiry_date: Optional[datetime]
    product_name: Optional[str] = None
    presentation_name: Optional[str] = None

    class Config:
        from_attributes = True


class PurchaseCreate(BaseModel):
    warehouse_id: int
    items: List[PurchaseItemCreate]
    amount_paid: Decimal = Decimal("0")
    discount: Decimal = Decimal("0")
    notes: Optional[str] = None
    expected_payment_date: Optional[datetime] = None


class PurchaseResponse(BaseModel):
    id: int
    supplier_id: int
    business_id: int
    warehouse_id: int
    created_by: int
    subtotal: Decimal
    discount: Decimal
    total: Decimal
    amount_paid: Decimal
    amount_credit: Decimal
    payment_status: SupplierPaymentStatus
    status: PurchaseStatus
    notes: Optional[str]
    expected_payment_date: Optional[datetime]
    created_at: datetime
    items: List[PurchaseItemResponse] = []

    class Config:
        from_attributes = True


# ── Pago a proveedor ──────────────────────────────────────────────────────────

class SupplierPaymentCreate(BaseModel):
    amount: Decimal
    purchase_id: Optional[int] = None
    description: Optional[str] = None


class SupplierPaymentResponse(BaseModel):
    id: int
    supplier_id: int
    purchase_id: Optional[int]
    amount: Decimal
    description: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ── Resumen global ────────────────────────────────────────────────────────────

class SupplierPortfolioSummary(BaseModel):
    total_suppliers_with_debt: int
    total_payable: Decimal
    total_overdue: Decimal
    paid_last_30_days: Decimal