from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, date
from decimal import Decimal


# ── Ventas ────────────────────────────────────────────────────────────────────

class SalesByPeriod(BaseModel):
    period: str          # "2024-01-15" / "2024-W03" / "2024-01"
    total_sales: int
    total_revenue: Decimal
    total_credit: Decimal
    total_cash: Decimal  # revenue - credit


class TopProduct(BaseModel):
    presentation_id: int
    product_name: str
    presentation_name: str
    units_sold: Decimal
    total_revenue: Decimal
    times_sold: int      # Nº de ventas distintas


class SalesReport(BaseModel):
    date_from: date
    date_to: date
    total_revenue: Decimal
    total_sales: int
    total_credit: Decimal
    average_ticket: Decimal
    by_period: List[SalesByPeriod]
    top_products: List[TopProduct]


# ── Clientes ──────────────────────────────────────────────────────────────────

class TopClient(BaseModel):
    client_id: int
    client_name: str
    total_purchases: int
    total_spent: Decimal
    current_balance: Decimal


class ClientsReport(BaseModel):
    total_active_clients: int
    total_with_debt: int
    total_portfolio: Decimal
    top_clients: List[TopClient]


# ── Inventario ────────────────────────────────────────────────────────────────

class InventoryStatusItem(BaseModel):
    presentation_id: int
    product_name: str
    presentation_name: str
    category_name: Optional[str]
    total_stock: Decimal
    min_stock: int
    is_low_stock: bool
    expiring_soon: int    # Lotes por vencer en 7 días
    expired_lots: int     # Lotes vencidos con remaining > 0


class InventoryReport(BaseModel):
    total_products: int
    low_stock_count: int
    expiring_count: int
    expired_count: int
    items: List[InventoryStatusItem]


# ── Mermas ────────────────────────────────────────────────────────────────────

class WasteByProduct(BaseModel):
    product_name: str
    presentation_name: str
    total_quantity: Decimal
    total_cost: Decimal
    records_count: int


class WasteReport(BaseModel):
    date_from: date
    date_to: date
    total_records: int
    total_cost: Decimal
    auto_count: int
    manual_count: int
    by_cause: List[dict]
    by_product: List[WasteByProduct]


# ── Cartera ───────────────────────────────────────────────────────────────────

class PortfolioDebtItem(BaseModel):
    client_id: int
    client_name: str
    phone: Optional[str]
    current_balance: Decimal
    credit_limit: Decimal
    days_since_last_purchase: Optional[int]
    status: str


class PortfolioReport(BaseModel):
    total_portfolio: Decimal
    total_overdue: Decimal
    total_clients_with_debt: int
    morosos_count: int
    collected_last_30: Decimal
    debt_items: List[PortfolioDebtItem]


# ── Rentabilidad ──────────────────────────────────────────────────────────────

class ProfitabilityItem(BaseModel):
    presentation_id: int
    product_name: str
    presentation_name: str
    units_sold: Decimal
    avg_sale_price: Decimal
    avg_cost_price: Optional[Decimal]
    revenue: Decimal
    estimated_cost: Optional[Decimal]
    gross_profit: Optional[Decimal]
    margin_pct: Optional[Decimal]    # (profit / revenue) * 100


class ProfitabilityReport(BaseModel):
    date_from: date
    date_to: date
    total_revenue: Decimal
    total_cost: Optional[Decimal]
    total_profit: Optional[Decimal]
    overall_margin: Optional[Decimal]
    items: List[ProfitabilityItem]