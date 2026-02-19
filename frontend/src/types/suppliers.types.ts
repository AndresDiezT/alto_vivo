// ─── Suppliers ────────────────────────────────────────────────────────────────

export type SupplierStatus = 'active' | 'inactive'
export type PurchaseStatus = 'completed' | 'partial' | 'cancelled'
export type SupplierPaymentStatus = 'pending' | 'paid' | 'overdue'

export interface Supplier {
    id: number
    business_id: number
    name: string
    contact_name: string | null
    phone: string | null
    email: string | null
    address: string | null
    document_id: string | null
    notes: string | null
    credit_limit: string
    current_balance: string
    credit_days: number
    status: SupplierStatus
    is_active: boolean
    created_at: string
    last_purchase_at: string | null
}

export interface SupplierStats {
    total_purchases: number
    total_spent: string
    average_purchase: string
    current_balance: string
    total_paid: string
    days_since_last_purchase: number | null
}

export interface SupplierProduct {
    id: number
    supplier_id: number
    presentation_id: number
    product_name: string | null
    presentation_name: string | null
    cost_price: string | null
    is_active: boolean
}

export interface PurchaseItem {
    id: number
    presentation_id: number
    quantity: string
    cost_per_unit: string
    subtotal: string
    lot_number: string | null
    expiry_date: string | null
    product_name: string | null
    presentation_name: string | null
}

export interface SupplierPurchase {
    id: number
    supplier_id: number
    business_id: number
    warehouse_id: number
    created_by: number
    subtotal: string
    discount: string
    total: string
    amount_paid: string
    amount_credit: string
    payment_status: SupplierPaymentStatus
    status: PurchaseStatus
    notes: string | null
    expected_payment_date: string | null
    created_at: string
    items: PurchaseItem[]
}

export interface SupplierPayment {
    id: number
    supplier_id: number
    purchase_id: number | null
    amount: string
    description: string | null
    created_at: string
}

export interface SupplierPortfolioSummary {
    total_suppliers_with_debt: number
    total_payable: string
    total_overdue: string
    paid_last_30_days: string
}

// ─── Supplier Forms ───────────────────────────────────────────────────────────

export interface SupplierForm {
    name: string
    contact_name?: string
    phone?: string
    email?: string
    address?: string
    document_id?: string
    notes?: string
    credit_limit: number
    credit_days: number
}

export interface PurchaseItemForm {
    presentation_id: number
    quantity: number
    cost_per_unit: number
    lot_number?: string
    expiry_date?: string
    // UI only
    product_name?: string
    presentation_name?: string
    is_perishable?: boolean
}

export interface PurchaseForm {
    warehouse_id: number
    items: PurchaseItemForm[]
    amount_paid: number
    discount: number
    notes?: string
    expected_payment_date?: string
}

export interface SupplierPaymentForm {
    amount: number
    purchase_id?: number
    description?: string
}