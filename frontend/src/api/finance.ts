import { api } from './axios'
import type {
    CashRegister, CashRegisterForm,
    CashSession, OpenSessionForm, CloseSessionForm,
    CashMovement, CashMovementForm,
    FinanceSummary,
} from '@/types/finances.types'

export const financeApi = {
    // Resumen
    getSummary: (businessId: number) =>
        api.get<FinanceSummary>(`/businesses/${businessId}/finance/summary`).then(r => r.data),

    // Cajas
    listRegisters: (businessId: number) =>
        api.get<CashRegister[]>(`/businesses/${businessId}/finance/registers`).then(r => r.data),

    createRegister: (businessId: number, data: CashRegisterForm) =>
        api.post<CashRegister>(`/businesses/${businessId}/finance/registers`, data).then(r => r.data),

    updateRegister: (businessId: number, registerId: number, data: Partial<CashRegisterForm>) =>
        api.patch<CashRegister>(`/businesses/${businessId}/finance/registers/${registerId}`, data).then(r => r.data),

    deleteRegister: (businessId: number, registerId: number) =>
        api.delete(`/businesses/${businessId}/finance/registers/${registerId}`).then(r => r.data),

    // Sesiones
    getCurrentSession: (businessId: number, registerId: number) =>
        api.get<CashSession>(`/businesses/${businessId}/finance/registers/${registerId}/session`).then(r => r.data),

    listSessions: (businessId: number, registerId: number) =>
        api.get<CashSession[]>(`/businesses/${businessId}/finance/registers/${registerId}/sessions`).then(r => r.data),

    openSession: (businessId: number, registerId: number, data: OpenSessionForm) =>
        api.post<CashSession>(`/businesses/${businessId}/finance/registers/${registerId}/open`, data).then(r => r.data),

    closeSession: (businessId: number, registerId: number, data: CloseSessionForm) =>
        api.post<CashSession>(`/businesses/${businessId}/finance/registers/${registerId}/close`, data).then(r => r.data),

    // Movimientos manuales
    addMovement: (businessId: number, registerId: number, data: CashMovementForm) =>
        api.post<CashMovement>(`/businesses/${businessId}/finance/registers/${registerId}/movements`, data).then(r => r.data),
}