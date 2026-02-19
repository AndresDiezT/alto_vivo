import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { wasteApi } from '@/api/waste'
import type { WasteForm } from '@/types/wastes.types'

const KEYS = {
    all: (bId: number) => ['businesses', bId, 'waste'] as const,
    summary: (bId: number) => ['businesses', bId, 'waste', 'summary'] as const,
}

export function useWasteRecords(businessId: number, params?: {
    presentation_id?: number
    warehouse_id?: number
    cause?: string
    date_from?: string
    date_to?: string
    is_auto?: boolean
}) {
    return useQuery({
        queryKey: [...KEYS.all(businessId), params],
        queryFn: () => wasteApi.list(businessId, params),
        enabled: !!businessId,
    })
}

export function useWasteSummary(businessId: number, params?: {
    date_from?: string; date_to?: string
}) {
    return useQuery({
        queryKey: [...KEYS.summary(businessId), params],
        queryFn: () => wasteApi.getSummary(businessId, params),
        enabled: !!businessId,
    })
}

export function useCreateWaste(businessId: number) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (data: WasteForm) => wasteApi.create(businessId, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: KEYS.all(businessId) })
            qc.invalidateQueries({ queryKey: KEYS.summary(businessId) })
            // Invalida inventario porque el stock cambia
            qc.invalidateQueries({ queryKey: ['businesses', businessId, 'inventory'] })
        },
    })
}

export function useProcessExpired(businessId: number) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: () => wasteApi.processExpired(businessId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: KEYS.all(businessId) })
            qc.invalidateQueries({ queryKey: KEYS.summary(businessId) })
            qc.invalidateQueries({ queryKey: ['businesses', businessId, 'inventory'] })
        },
    })
}