// ─── Finance ──────────────────────────────────────────────────────────────────

export type CashRegisterStatus = 'open' | 'closed'
export type CashMovementType = 'income' | 'expense'

export interface CashRegister {
    id: number
    business_id: number
    warehouse_id: number
    name: string
    is_active: boolean
    created_at: string
    // Sesión activa si existe
    open_session_id: number | null
    opened_at: string | null
    opened_by_name: string | null
    opening_amount: string | null
}

export interface PaymentBreakdown {
    payment_method_id: number
    payment_method_name: string
    total: string
    is_credit: boolean
}

export interface CashMovement {
    id: number
    session_id: number
    movement_type: CashMovementType
    amount: string
    description: string
    created_at: string
}

export interface CashSession {
    id: number
    register_id: number
    business_id: number
    status: CashRegisterStatus
    opening_amount: string
    opened_at: string
    opening_notes: string | null
    opened_by_name: string | null
    closing_amount: string | null
    expected_amount: string | null
    difference: string | null
    closed_at: string | null
    closing_notes: string | null
    closed_by_name: string | null
    total_sales: string | null
    total_income: string | null
    total_expense: string | null
    total_credit: string | null
    payment_breakdown: PaymentBreakdown[]
    movements: CashMovement[]
}

export interface FinanceSummary {
    open_sessions: number
    total_open_registers: number
    today_revenue: string
    today_expenses: string
    today_credit: string
    today_net: string
}

// ─── Finance Forms ────────────────────────────────────────────────────────────

export interface CashRegisterForm {
    warehouse_id: number
    name: string
}

export interface OpenSessionForm {
    opening_amount: number
    opening_notes?: string
}

export interface CloseSessionForm {
    closing_amount: number
    closing_notes?: string
}

export interface CashMovementForm {
    movement_type: CashMovementType
    amount: number
    description: string
}