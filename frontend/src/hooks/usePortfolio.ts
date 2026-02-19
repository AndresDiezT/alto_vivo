import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { portfolioApi } from '@/api/portfolio'
import type { CreditMovementForm } from '@/types'

const KEYS = {
    summary: (bId: number) => ['businesses', bId, 'portfolio', 'summary'] as const,
    movements: (bId: number) => ['businesses', bId, 'portfolio', 'movements'] as const,
    debtClients: (bId: number) => ['businesses', bId, 'portfolio', 'clients'] as const,
}

export function usePortfolioSummary(businessId: number) {
    return useQuery({
        queryKey: KEYS.summary(businessId),
        queryFn: () => portfolioApi.getSummary(businessId),
        enabled: !!businessId,
        refetchInterval: 1000 * 60 * 2, // Refrescar cada 2 min — alertas en tiempo real
    })
}

export function usePortfolioMovements(businessId: number, movementType?: string) {
    return useQuery({
        queryKey: [...KEYS.movements(businessId), movementType],
        queryFn: () => portfolioApi.getMovements(businessId, { movement_type: movementType }),
        enabled: !!businessId,
    })
}

export function useClientsWithDebt(businessId: number) {
    return useQuery({
        queryKey: KEYS.debtClients(businessId),
        queryFn: () => portfolioApi.getClientsWithDebt(businessId),
        enabled: !!businessId,
    })
}

export function usePortfolioPayment(businessId: number) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ clientId, data }: { clientId: number; data: CreditMovementForm }) =>
            portfolioApi.addPayment(businessId, clientId, data),
        onSuccess: () => {
            // Invalidar todo lo que depende de cartera
            qc.invalidateQueries({ queryKey: KEYS.summary(businessId) })
            qc.invalidateQueries({ queryKey: KEYS.movements(businessId) })
            qc.invalidateQueries({ queryKey: KEYS.debtClients(businessId) })
            qc.invalidateQueries({ queryKey: ['businesses', businessId, 'clients'] })
        },
    })
}