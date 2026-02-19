from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from app.models.enums import CashRegisterStatus, CashMovementType


# ── Caja ─────────────────────────────────────────────────────────────────────

class CashRegisterCreate(BaseModel):
    warehouse_id: int
    name: str


class CashRegisterUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None


class CashRegisterResponse(BaseModel):
    id: int
    business_id: int
    warehouse_id: int
    name: str
    is_active: bool
    created_at: datetime
    # Info de sesión activa si existe
    open_session_id: Optional[int] = None
    opened_at: Optional[datetime] = None
    opened_by_name: Optional[str] = None
    opening_amount: Optional[Decimal] = None

    class Config:
        from_attributes = True


# ── Sesión ────────────────────────────────────────────────────────────────────

class OpenSessionRequest(BaseModel):
    opening_amount: Decimal = Decimal("0")
    opening_notes: Optional[str] = None


class CloseSessionRequest(BaseModel):
    closing_amount: Decimal   # Conteo físico del efectivo
    closing_notes: Optional[str] = None


class PaymentBreakdownResponse(BaseModel):
    payment_method_id: int
    payment_method_name: str
    total: Decimal
    is_credit: bool

    class Config:
        from_attributes = True


class CashSessionResponse(BaseModel):
    id: int
    register_id: int
    business_id: int
    status: CashRegisterStatus
    opening_amount: Decimal
    opened_at: datetime
    opening_notes: Optional[str]
    opened_by_name: Optional[str] = None
    # Cierre
    closing_amount: Optional[Decimal]
    expected_amount: Optional[Decimal]
    difference: Optional[Decimal]
    closed_at: Optional[datetime]
    closing_notes: Optional[str]
    closed_by_name: Optional[str] = None
    # Totales
    total_sales: Optional[Decimal]
    total_income: Optional[Decimal]
    total_expense: Optional[Decimal]
    total_credit: Optional[Decimal]
    # Desglose
    payment_breakdown: List[PaymentBreakdownResponse] = []
    movements: List['CashMovementResponse'] = []

    class Config:
        from_attributes = True


# ── Movimiento manual ─────────────────────────────────────────────────────────

class CashMovementCreate(BaseModel):
    movement_type: CashMovementType
    amount: Decimal
    description: str


class CashMovementResponse(BaseModel):
    id: int
    session_id: int
    movement_type: CashMovementType
    amount: Decimal
    description: str
    created_at: datetime

    class Config:
        from_attributes = True


CashSessionResponse.model_rebuild()


# ── Resumen financiero ────────────────────────────────────────────────────────

class FinanceSummary(BaseModel):
    """Resumen general del módulo de finanzas."""
    open_sessions: int
    total_open_registers: int
    today_revenue: Decimal
    today_expenses: Decimal
    today_credit: Decimal
    today_net: Decimal