import { api } from './axios'
import type { Client, PortfolioSummary, PortfolioMovement, CreditMovement, CreditMovementForm } from '@/types'

export const portfolioApi = {
    getSummary: (businessId: number) =>
        api.get<PortfolioSummary>(`/businesses/${businessId}/clients/portfolio/summary`).then(r => r.data),

    getMovements: (businessId: number, params?: { movement_type?: string; skip?: number; limit?: number }) =>
        api.get<PortfolioMovement[]>(`/businesses/${businessId}/clients/portfolio/movements`, { params }).then(r => r.data),

    // Clientes con deuda — reutiliza el endpoint existente
    getClientsWithDebt: (businessId: number) =>
        api.get<Client[]>(`/businesses/${businessId}/clients`, {
            params: { has_debt: true, limit: 100 }
        }).then(r => r.data),

    // Abono — reutiliza el endpoint existente de crédito
    addPayment: (businessId: number, clientId: number, data: CreditMovementForm) =>
        api.post<CreditMovement>(
            `/businesses/${businessId}/clients/${clientId}/credit`,
            data
        ).then(r => r.data),
}