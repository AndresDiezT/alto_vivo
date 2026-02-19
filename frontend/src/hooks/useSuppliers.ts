import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { suppliersApi } from '@/api/suppliers'
import type { SupplierForm, PurchaseForm, SupplierPaymentForm } from '@/types/suppliers.types'

const KEYS = {
    all: (bId: number) => ['businesses', bId, 'suppliers'] as const,
    one: (bId: number, sId: number) => ['businesses', bId, 'suppliers', sId] as const,
    stats: (bId: number, sId: number) => ['businesses', bId, 'suppliers', sId, 'stats'] as const,
    products: (bId: number, sId: number) => ['businesses', bId, 'suppliers', sId, 'products'] as const,
    purchases: (bId: number, sId: number) => ['businesses', bId, 'suppliers', sId, 'purchases'] as const,
    payments: (bId: number, sId: number) => ['businesses', bId, 'suppliers', sId, 'payments'] as const,
    portfolio: (bId: number) => ['businesses', bId, 'suppliers', 'portfolio'] as const,
}

export function useSuppliers(businessId: number, params?: { search?: string; has_debt?: boolean }) {
    return useQuery({
        queryKey: [...KEYS.all(businessId), params],
        queryFn: () => suppliersApi.list(businessId, params),
        enabled: !!businessId,
    })
}

export function useSupplier(businessId: number, supplierId: number) {
    return useQuery({
        queryKey: KEYS.one(businessId, supplierId),
        queryFn: () => suppliersApi.get(businessId, supplierId),
        enabled: !!businessId && !!supplierId,
    })
}

export function useSupplierStats(businessId: number, supplierId: number) {
    return useQuery({
        queryKey: KEYS.stats(businessId, supplierId),
        queryFn: () => suppliersApi.getStats(businessId, supplierId),
        enabled: !!businessId && !!supplierId,
    })
}

export function useSupplierPortfolio(businessId: number) {
    return useQuery({
        queryKey: KEYS.portfolio(businessId),
        queryFn: () => suppliersApi.getPortfolio(businessId),
        enabled: !!businessId,
        refetchInterval: 1000 * 60 * 2,
    })
}

export function useCreateSupplier(businessId: number) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (data: SupplierForm) => suppliersApi.create(businessId, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all(businessId) }),
    })
}

export function useUpdateSupplier(businessId: number, supplierId: number) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (data: Partial<SupplierForm>) => suppliersApi.update(businessId, supplierId, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: KEYS.all(businessId) })
            qc.invalidateQueries({ queryKey: KEYS.one(businessId, supplierId) })
        },
    })
}

export function useDeleteSupplier(businessId: number) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (supplierId: number) => suppliersApi.delete(businessId, supplierId),
        onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all(businessId) }),
    })
}

export function useSupplierProducts(businessId: number, supplierId: number) {
    return useQuery({
        queryKey: KEYS.products(businessId, supplierId),
        queryFn: () => suppliersApi.listProducts(businessId, supplierId),
        enabled: !!businessId && !!supplierId,
    })
}

export function useAddSupplierProduct(businessId: number, supplierId: number) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (data: { presentation_id: number; cost_price?: number }) =>
            suppliersApi.addProduct(businessId, supplierId, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.products(businessId, supplierId) }),
    })
}

export function useRemoveSupplierProduct(businessId: number, supplierId: number) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (productId: number) => suppliersApi.removeProduct(businessId, supplierId, productId),
        onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.products(businessId, supplierId) }),
    })
}

export function useSupplierPurchases(businessId: number, supplierId: number) {
    return useQuery({
        queryKey: KEYS.purchases(businessId, supplierId),
        queryFn: () => suppliersApi.listPurchases(businessId, supplierId),
        enabled: !!businessId && !!supplierId,
    })
}

export function useCreatePurchase(businessId: number, supplierId: number) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (data: PurchaseForm) => suppliersApi.createPurchase(businessId, supplierId, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: KEYS.purchases(businessId, supplierId) })
            qc.invalidateQueries({ queryKey: KEYS.one(businessId, supplierId) })
            qc.invalidateQueries({ queryKey: KEYS.stats(businessId, supplierId) })
            qc.invalidateQueries({ queryKey: KEYS.portfolio(businessId) })
            // Invalidar inventario porque la compra genera entrada de stock
            qc.invalidateQueries({ queryKey: ['businesses', businessId, 'inventory'] })
        },
    })
}

export function useSupplierPayments(businessId: number, supplierId: number) {
    return useQuery({
        queryKey: KEYS.payments(businessId, supplierId),
        queryFn: () => suppliersApi.listPayments(businessId, supplierId),
        enabled: !!businessId && !!supplierId,
    })
}

export function useAddSupplierPayment(businessId: number, supplierId: number) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (data: SupplierPaymentForm) => suppliersApi.addPayment(businessId, supplierId, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: KEYS.payments(businessId, supplierId) })
            qc.invalidateQueries({ queryKey: KEYS.one(businessId, supplierId) })
            qc.invalidateQueries({ queryKey: KEYS.purchases(businessId, supplierId) })
            qc.invalidateQueries({ queryKey: KEYS.portfolio(businessId) })
        },
    })
}