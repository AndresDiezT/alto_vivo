import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { financeApi } from '@/api/finance'
import type {
    CashRegisterForm, OpenSessionForm,
    CloseSessionForm, CashMovementForm,
} from '@/types/finances.types'

const KEYS = {
    summary: (bId: number) => ['businesses', bId, 'finance', 'summary'] as const,
    registers: (bId: number) => ['businesses', bId, 'finance', 'registers'] as const,
    session: (bId: number, rId: number) => ['businesses', bId, 'finance', 'registers', rId, 'session'] as const,
    sessions: (bId: number, rId: number) => ['businesses', bId, 'finance', 'registers', rId, 'sessions'] as const,
}

export function useFinanceSummary(businessId: number) {
    return useQuery({
        queryKey: KEYS.summary(businessId),
        queryFn: () => financeApi.getSummary(businessId),
        enabled: !!businessId,
        refetchInterval: 1000 * 60 * 2,
    })
}

export function useCashRegisters(businessId: number) {
    return useQuery({
        queryKey: KEYS.registers(businessId),
        queryFn: () => financeApi.listRegisters(businessId),
        enabled: !!businessId,
    })
}

export function useCurrentSession(businessId: number, registerId: number) {
    return useQuery({
        queryKey: KEYS.session(businessId, registerId),
        queryFn: () => financeApi.getCurrentSession(businessId, registerId),
        enabled: !!businessId && !!registerId,
        retry: false, // 404 si no hay sesión abierta — no reintentar
    })
}

export function useSessionHistory(businessId: number, registerId: number) {
    return useQuery({
        queryKey: KEYS.sessions(businessId, registerId),
        queryFn: () => financeApi.listSessions(businessId, registerId),
        enabled: !!businessId && !!registerId,
    })
}

export function useCreateRegister(businessId: number) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (data: CashRegisterForm) => financeApi.createRegister(businessId, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.registers(businessId) }),
    })
}

export function useUpdateRegister(businessId: number) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<CashRegisterForm> }) =>
            financeApi.updateRegister(businessId, id, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.registers(businessId) }),
    })
}

export function useDeleteRegister(businessId: number) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (id: number) => financeApi.deleteRegister(businessId, id),
        onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.registers(businessId) }),
    })
}

export function useOpenSession(businessId: number, registerId: number) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (data: OpenSessionForm) => financeApi.openSession(businessId, registerId, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: KEYS.registers(businessId) })
            qc.invalidateQueries({ queryKey: KEYS.session(businessId, registerId) })
            qc.invalidateQueries({ queryKey: KEYS.summary(businessId) })
        },
    })
}

export function useCloseSession(businessId: number, registerId: number) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (data: CloseSessionForm) => financeApi.closeSession(businessId, registerId, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: KEYS.registers(businessId) })
            qc.invalidateQueries({ queryKey: KEYS.session(businessId, registerId) })
            qc.invalidateQueries({ queryKey: KEYS.sessions(businessId, registerId) })
            qc.invalidateQueries({ queryKey: KEYS.summary(businessId) })
        },
    })
}

export function useAddMovement(businessId: number, registerId: number) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (data: CashMovementForm) => financeApi.addMovement(businessId, registerId, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: KEYS.session(businessId, registerId) })
            qc.invalidateQueries({ queryKey: KEYS.summary(businessId) })
        },
    })
}