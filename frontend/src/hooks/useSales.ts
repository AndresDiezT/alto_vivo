import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { salesApi, paymentMethodsApi } from '@/api/sales.api'
import type { SaleForm } from '@/types/sales.types'

const KEYS = {
    all: (bId: number) => ['businesses', bId, 'sales'] as const,
    one: (bId: number, sId: number) => ['businesses', bId, 'sales', sId] as const,
    daily: (bId: number, date?: string) => ['businesses', bId, 'sales', 'daily', date] as const,
    paymentMethods: (bId: number) => ['businesses', bId, 'payment-methods'] as const,
}

// ── Métodos de pago ───────────────────────────────────────────────────────────

export function usePaymentMethods(businessId: number) {
    return useQuery({
        queryKey: KEYS.paymentMethods(businessId),
        queryFn: () => paymentMethodsApi.list(businessId),
        enabled: !!businessId,
        staleTime: 1000 * 60 * 10,
    })
}

export function useCreatePaymentMethod(businessId: number) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (data: { name: string; description?: string; is_credit?: boolean }) =>
            paymentMethodsApi.create(businessId, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.paymentMethods(businessId) }),
    })
}

export function useUpdatePaymentMethod(businessId: number) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: { name?: string; description?: string; is_active?: boolean } }) =>
            paymentMethodsApi.update(businessId, id, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.paymentMethods(businessId) }),
    })
}

export function useDeletePaymentMethod(businessId: number) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (id: number) => paymentMethodsApi.delete(businessId, id),
        onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.paymentMethods(businessId) }),
    })
}

// ── Ventas ────────────────────────────────────────────────────────────────────

export function useSales(businessId: number, params?: {
    date_from?: string
    date_to?: string
    client_id?: number
    status?: string
    // payment_method eliminado — ya no existe como filtro en el backend
}) {
    return useQuery({
        queryKey: [...KEYS.all(businessId), params],
        queryFn: () => salesApi.list(businessId, params),
        enabled: !!businessId,
    })
}

export function useSale(businessId: number, saleId: number) {
    return useQuery({
        queryKey: KEYS.one(businessId, saleId),
        queryFn: () => salesApi.get(businessId, saleId),
        enabled: !!businessId && !!saleId,
    })
}

export function useDailySummary(businessId: number, date?: string) {
    return useQuery({
        queryKey: KEYS.daily(businessId, date),
        queryFn: () => salesApi.getDailySummary(businessId, date),
        enabled: !!businessId,
    })
}

export function useCreateSale(businessId: number) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (data: SaleForm) => salesApi.create(businessId, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: KEYS.all(businessId) })
            qc.invalidateQueries({ queryKey: KEYS.daily(businessId) })
            qc.invalidateQueries({ queryKey: ['businesses', businessId, 'inventory'] })
            qc.invalidateQueries({ queryKey: ['businesses', businessId, 'clients'] })
        },
    })
}

export function useCancelSale(businessId: number) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ saleId, reason }: { saleId: number; reason: string }) =>
            salesApi.cancel(businessId, saleId, reason),
        onSuccess: (_, { saleId }) => {
            qc.invalidateQueries({ queryKey: KEYS.all(businessId) })
            qc.invalidateQueries({ queryKey: KEYS.one(businessId, saleId) })
            qc.invalidateQueries({ queryKey: KEYS.daily(businessId) })
            qc.invalidateQueries({ queryKey: ['businesses', businessId, 'inventory'] })
            qc.invalidateQueries({ queryKey: ['businesses', businessId, 'clients'] })
        },
    })
}