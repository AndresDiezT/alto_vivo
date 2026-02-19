import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clientsApi } from '@/api/clients'
import type { ClientForm, CreditMovementForm } from '@/types'

const KEYS = {
    all: (bId: number) => ['businesses', bId, 'clients'] as const,
    one: (bId: number, cId: number) => ['businesses', bId, 'clients', cId] as const,
    stats: (bId: number, cId: number) => ['businesses', bId, 'clients', cId, 'stats'] as const,
    purchases: (bId: number, cId: number) => ['businesses', bId, 'clients', cId, 'purchases'] as const,
    credit: (bId: number, cId: number) => ['businesses', bId, 'clients', cId, 'credit'] as const,
}

export function useClients(businessId: number, params?: {
    search?: string; status?: string; has_debt?: boolean
}) {
    return useQuery({
        queryKey: [...KEYS.all(businessId), params],
        queryFn: () => clientsApi.list(businessId, params),
        enabled: !!businessId,
    })
}

export function useClient(businessId: number, clientId: number) {
    return useQuery({
        queryKey: KEYS.one(businessId, clientId),
        queryFn: () => clientsApi.get(businessId, clientId),
        enabled: !!businessId && !!clientId,
    })
}

export function useClientStats(businessId: number, clientId: number) {
    return useQuery({
        queryKey: KEYS.stats(businessId, clientId),
        queryFn: () => clientsApi.getStats(businessId, clientId),
        enabled: !!businessId && !!clientId,
    })
}

export function useClientPurchases(businessId: number, clientId: number) {
    return useQuery({
        queryKey: KEYS.purchases(businessId, clientId),
        queryFn: () => clientsApi.getPurchases(businessId, clientId),
        enabled: !!businessId && !!clientId,
    })
}

export function useClientCreditMovements(businessId: number, clientId: number) {
    return useQuery({
        queryKey: KEYS.credit(businessId, clientId),
        queryFn: () => clientsApi.getCreditMovements(businessId, clientId),
        enabled: !!businessId && !!clientId,
    })
}

export function useCreateClient(businessId: number) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (data: ClientForm) => clientsApi.create(businessId, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all(businessId) }),
    })
}

export function useUpdateClient(businessId: number, clientId: number) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (data: Partial<ClientForm>) => clientsApi.update(businessId, clientId, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: KEYS.all(businessId) })
            qc.invalidateQueries({ queryKey: KEYS.one(businessId, clientId) })
        },
    })
}

export function useDeleteClient(businessId: number) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (clientId: number) => clientsApi.delete(businessId, clientId),
        onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all(businessId) }),
    })
}

export function useAddCreditMovement(businessId: number, clientId: number) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (data: CreditMovementForm) => clientsApi.addCreditMovement(businessId, clientId, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: KEYS.credit(businessId, clientId) })
            qc.invalidateQueries({ queryKey: KEYS.one(businessId, clientId) })
            qc.invalidateQueries({ queryKey: KEYS.stats(businessId, clientId) })
            qc.invalidateQueries({ queryKey: KEYS.all(businessId) })
        },
    })
}