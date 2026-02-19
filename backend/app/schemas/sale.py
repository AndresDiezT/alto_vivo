from pydantic import BaseModel, model_validator
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from app.models.enums import SaleStatus


# ── Payment Method schemas ────────────────────────────────────────────────────

class PaymentMethodCreate(BaseModel):
    name: str
    description: Optional[str] = None
    is_credit: bool = False


class PaymentMethodUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class PaymentMethodResponse(BaseModel):
    id: int
    business_id: int
    name: str
    description: Optional[str]
    is_default: bool
    is_credit: bool
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ── Sale Item schemas ─────────────────────────────────────────────────────────

class SaleItemCreate(BaseModel):
    presentation_id: int
    quantity: Decimal
    unit_price: Decimal
    discount: Decimal = Decimal("0")

    @property
    def subtotal(self) -> Decimal:
        return (self.quantity * self.unit_price) - self.discount


class SaleItemResponse(BaseModel):
    id: int
    presentation_id: int
    quantity: Decimal
    unit_price: Decimal
    discount: Decimal
    subtotal: Decimal
    product_name: Optional[str] = None
    presentation_name: Optional[str] = None

    class Config:
        from_attributes = True


# ── Sale Payment schemas ──────────────────────────────────────────────────────

class SalePaymentCreate(BaseModel):
    """Un método de pago dentro de una venta (puede haber varios)."""
    payment_method_id: int
    amount: Decimal


class SalePaymentResponse(BaseModel):
    id: int
    payment_method_id: int
    payment_method_name: Optional[str] = None
    amount: Decimal
    is_credit: bool

    class Config:
        from_attributes = True


# ── Sale schemas ──────────────────────────────────────────────────────────────

class SaleCreate(BaseModel):
    client_id: Optional[int] = None
    warehouse_id: int
    items: List[SaleItemCreate]
    payments: List[SalePaymentCreate]   # 1..N métodos de pago
    discount: Decimal = Decimal("0")
    notes: Optional[str] = None

    @model_validator(mode='after')
    def validate_payments(self):
        if not self.payments:
            raise ValueError("Debe incluir al menos un método de pago")
        if len(self.payments) != len({p.payment_method_id for p in self.payments}):
            raise ValueError("No puede repetir el mismo método de pago en la misma venta")
        return self


class SaleCancelRequest(BaseModel):
    reason: str


class SaleResponse(BaseModel):
    id: int
    business_id: int
    client_id: Optional[int]
    warehouse_id: int
    created_by: int
    subtotal: Decimal
    discount: Decimal
    total: Decimal
    amount_paid: Decimal
    amount_credit: Decimal
    status: SaleStatus
    notes: Optional[str]
    cancelled_at: Optional[datetime]
    cancel_reason: Optional[str]
    created_at: datetime
    items: List[SaleItemResponse] = []
    payments: List[SalePaymentResponse] = []
    client_name: Optional[str] = None
    seller_name: Optional[str] = None

    class Config:
        from_attributes = True


class SaleSummary(BaseModel):
    id: int
    client_id: Optional[int]
    client_name: Optional[str]
    total: Decimal
    amount_credit: Decimal
    status: SaleStatus
    created_at: datetime
    seller_name: Optional[str]
    # Resumen legible de métodos de pago usados, ej: "Efectivo + Nequi"
    payment_summary: Optional[str] = None

    class Config:
        from_attributes = True


class DailySummaryByMethod(BaseModel):
    payment_method_id: int
    payment_method_name: str
    total: Decimal
    is_credit: bool


class DailySummary(BaseModel):
    total_sales: int
    total_revenue: Decimal
    total_credit: Decimal
    cancelled_count: int
    by_method: List[DailySummaryByMethod] = []