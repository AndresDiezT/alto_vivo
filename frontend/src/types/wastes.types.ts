// ─── Waste ────────────────────────────────────────────────────────────────────

export type WasteCause =
    | 'damaged'
    | 'expired'
    | 'theft'
    | 'inventory_error'
    | 'sample'

export interface WasteRecord {
    id: number
    business_id: number
    presentation_id: number
    warehouse_id: number
    lot_id: number | null
    created_by: number
    cause: WasteCause
    quantity: string
    cost_per_unit: string | null
    total_cost: string | null
    notes: string | null
    is_auto: boolean
    created_at: string
    product_name: string | null
    presentation_name: string | null
    warehouse_name: string | null
    lot_number: string | null
    creator_name: string | null
}

export interface WasteByCause {
    cause: WasteCause
    count: number
    total_cost: string
}

export interface WasteSummary {
    total_records: number
    total_cost: string
    by_cause: WasteByCause[]
}

export interface AutoWasteResult {
    processed: number
    total_cost: string
    records: WasteRecord[]
}

export interface WasteForm {
    presentation_id: number
    warehouse_id: number
    lot_id?: number
    cause: WasteCause
    quantity: number
    notes?: string
}