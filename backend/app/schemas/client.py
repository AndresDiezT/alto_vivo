from pydantic import BaseModel, condecimal
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from app.models.client import ClientStatus, ClientType


# ── Client ────────────────────────────────────────────────────────────────────

class ClientCreate(BaseModel):
    name: str
    client_type: ClientType = ClientType.NATURAL
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    document_id: Optional[str] = None
    notes: Optional[str] = None
    credit_limit: Decimal = Decimal("0")
    credit_days: int = 30


class ClientUpdate(BaseModel):
    name: Optional[str] = None
    client_type: Optional[ClientType] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    document_id: Optional[str] = None
    notes: Optional[str] = None
    credit_limit: Optional[Decimal] = None
    credit_days: Optional[int] = None
    status: Optional[ClientStatus] = None


class ClientStats(BaseModel):
    total_purchases: int
    total_spent: Decimal
    average_ticket: Decimal
    credit_purchases: int
    current_balance: Decimal
    credit_limit: Decimal
    available_credit: Decimal
    days_since_last_purchase: Optional[int]
    most_bought_payment_method: Optional[str]

    class Config:
        from_attributes = True


class ClientResponse(BaseModel):
    id: int
    business_id: int
    name: str
    client_type: ClientType
    phone: Optional[str]
    email: Optional[str]
    address: Optional[str]
    document_id: Optional[str]
    notes: Optional[str]
    credit_limit: Decimal
    current_balance: Decimal
    credit_days: int
    status: ClientStatus
    is_active: bool
    created_at: datetime
    last_purchase_at: Optional[datetime]

    class Config:
        from_attributes = True


# ── Credit Movement ───────────────────────────────────────────────────────────

class CreditMovementCreate(BaseModel):
    amount: Decimal
    movement_type: str  # "charge" | "payment"
    description: Optional[str] = None


class CreditMovementResponse(BaseModel):
    id: int
    client_id: int
    amount: Decimal
    movement_type: str
    description: Optional[str]
    created_by: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


# ── Purchase History ──────────────────────────────────────────────────────────

class ClientPurchaseResponse(BaseModel):
    id: int
    total: Decimal
    payment_method: Optional[str]
    is_credit: bool
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
        
# ── Portfolio Summary ─────────────────────────────────────────────────────────

class PortfolioSummary(BaseModel):
    total_clients_with_debt: int
    total_portfolio: Decimal
    total_overdue: Decimal
    morosos_count: int
    collected_last_30_days: Decimal

class PortfolioMovement(BaseModel):
    id: int
    client_id: int
    client_name: Optional[str]
    amount: Decimal
    movement_type: str
    description: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True