// ── Métodos de pago (dinámicos, vienen del backend) ──────────────────────────

export interface PaymentMethod {
    id: number
    business_id: number
    name: string
    description: string | null
    is_default: boolean
    is_credit: boolean
    is_active: boolean
    created_at: string
}

export type SaleStatus = 'completed' | 'cancelled' | 'partial'

// ── Pagos y items de una venta ────────────────────────────────────────────────

export interface SalePayment {
    id: number
    payment_method_id: number
    payment_method_name: string | null
    amount: string
    is_credit: boolean
}

export interface SaleItem {
    id: number
    presentation_id: number
    quantity: string
    unit_price: string
    discount: string
    subtotal: string
    product_name: string | null
    presentation_name: string | null
}

// ── Venta completa ────────────────────────────────────────────────────────────

export interface Sale {
    id: number
    business_id: number
    client_id: number | null
    client_name: string | null
    warehouse_id: number
    created_by: number
    seller_name: string | null
    subtotal: string
    discount: string
    total: string
    amount_paid: string
    amount_credit: string
    status: SaleStatus
    notes: string | null
    cancelled_at: string | null
    cancel_reason: string | null
    created_at: string
    items: SaleItem[]
    payments: SalePayment[]
}

// ── Resumen en listado ────────────────────────────────────────────────────────

export interface SaleSummary {
    id: number
    client_id: number | null
    client_name: string | null
    total: string
    amount_credit: string
    status: SaleStatus
    created_at: string
    seller_name: string | null
    /** Texto descriptivo, ej: "Efectivo + Nequi" */
    payment_summary: string | null
}

// ── Resumen diario (dinámico, no hardcodeado por método) ─────────────────────

export interface DailySummaryByMethod {
    payment_method_id: number
    payment_method_name: string
    total: string
    is_credit: boolean
}

export interface DailySummary {
    total_sales: number
    total_revenue: string
    total_credit: string
    cancelled_count: number
    by_method: DailySummaryByMethod[]
}

// ── Formularios enviados al backend ──────────────────────────────────────────

export interface SalePaymentInput {
    payment_method_id: number
    amount: number
}

export interface SaleItemInput {
    presentation_id: number
    quantity: number
    unit_price: number
    discount: number
}

export interface SaleForm {
    client_id?: number
    warehouse_id: number
    items: SaleItemInput[]
    payments: SalePaymentInput[]
    discount: number
    notes?: string
}

// ── Estado local del carrito (UI, no se envía) ────────────────────────────────

export interface CartItem {
    presentation_id: number
    product_name: string
    presentation_name: string
    quantity: number
    unit_price: number
    discount: number
    available_stock: number
}

export interface CartPayment {
    method: PaymentMethod
    amount: number
}