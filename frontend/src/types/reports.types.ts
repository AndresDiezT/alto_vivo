// ─── Reports ──────────────────────────────────────────────────────────────────

export interface SalesByPeriod {
    period: string
    total_sales: number
    total_revenue: string
    total_credit: string
    total_cash: string
}

export interface TopProduct {
    presentation_id: number
    product_name: string
    presentation_name: string
    units_sold: string
    total_revenue: string
    times_sold: number
}

export interface SalesReport {
    date_from: string
    date_to: string
    total_revenue: string
    total_sales: number
    total_credit: string
    average_ticket: string
    by_period: SalesByPeriod[]
    top_products: TopProduct[]
}

export interface TopClient {
    client_id: number
    client_name: string
    total_purchases: number
    total_spent: string
    current_balance: string
}

export interface ClientsReport {
    total_active_clients: number
    total_with_debt: number
    total_portfolio: string
    top_clients: TopClient[]
}

export interface InventoryStatusItem {
    presentation_id: number
    product_name: string
    presentation_name: string
    category_name: string | null
    total_stock: string
    min_stock: number
    is_low_stock: boolean
    expiring_soon: number
    expired_lots: number
}

export interface InventoryReport {
    total_products: number
    low_stock_count: number
    expiring_count: number
    expired_count: number
    items: InventoryStatusItem[]
}

export interface WasteByProduct {
    product_name: string
    presentation_name: string
    total_quantity: string
    total_cost: string
    records_count: number
}

export interface WasteReport {
    date_from: string
    date_to: string
    total_records: number
    total_cost: string
    auto_count: number
    manual_count: number
    by_cause: { cause: string; count: number; total_cost: string }[]
    by_product: WasteByProduct[]
}

export interface PortfolioDebtItem {
    client_id: number
    client_name: string
    phone: string | null
    current_balance: string
    credit_limit: string
    days_since_last_purchase: number | null
    status: string
}

export interface PortfolioReport {
    total_portfolio: string
    total_overdue: string
    total_clients_with_debt: number
    morosos_count: number
    collected_last_30: string
    debt_items: PortfolioDebtItem[]
}

export interface ProfitabilityItem {
    presentation_id: number
    product_name: string
    presentation_name: string
    units_sold: string
    avg_sale_price: string
    avg_cost_price: string | null
    revenue: string
    estimated_cost: string | null
    gross_profit: string | null
    margin_pct: string | null
}

export interface ProfitabilityReport {
    date_from: string
    date_to: string
    total_revenue: string
    total_cost: string | null
    total_profit: string | null
    overall_margin: string | null
    items: ProfitabilityItem[]
}