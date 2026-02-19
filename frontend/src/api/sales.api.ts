import { api } from './axios'
import type { Sale, SaleSummary, SaleForm, DailySummary, PaymentMethod } from '@/types/sales.types'

// ── Métodos de pago ───────────────────────────────────────────────────────────

export const paymentMethodsApi = {
    list: (businessId: number) =>
        api.get<PaymentMethod[]>(`/businesses/${businessId}/payment-methods`).then(r => r.data),

    create: (businessId: number, data: { name: string; description?: string; is_credit?: boolean }) =>
        api.post<PaymentMethod>(`/businesses/${businessId}/payment-methods`, data).then(r => r.data),

    update: (businessId: number, methodId: number, data: { name?: string; description?: string; is_active?: boolean }) =>
        api.patch<PaymentMethod>(`/businesses/${businessId}/payment-methods/${methodId}`, data).then(r => r.data),

    delete: (businessId: number, methodId: number) =>
        api.delete(`/businesses/${businessId}/payment-methods/${methodId}`).then(r => r.data),
}

// ── Ventas ────────────────────────────────────────────────────────────────────

export const salesApi = {
    list: (businessId: number, params?: {
        date_from?: string
        date_to?: string
        client_id?: number
        status?: string          // payment_method eliminado — ya no existe en el backend
        skip?: number
        limit?: number
    }) =>
        api.get<SaleSummary[]>(`/businesses/${businessId}/sales`, { params }).then(r => r.data),

    get: (businessId: number, saleId: number) =>
        api.get<Sale>(`/businesses/${businessId}/sales/${saleId}`).then(r => r.data),

    create: (businessId: number, data: SaleForm) =>
        api.post<Sale>(`/businesses/${businessId}/sales`, data).then(r => r.data),

    cancel: (businessId: number, saleId: number, reason: string) =>
        api.post<Sale>(`/businesses/${businessId}/sales/${saleId}/cancel`, { reason }).then(r => r.data),

    getDailySummary: (businessId: number, date?: string) =>
        api.get<DailySummary>(`/businesses/${businessId}/sales/summary/daily`, {
            params: date ? { target_date: date } : undefined,
        }).then(r => r.data),
}