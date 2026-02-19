import { api } from './axios'
import type {
    Client, ClientForm, ClientStats,
    ClientPurchaseResponse, CreditMovement, CreditMovementForm,
} from '@/types'

export const clientsApi = {
    list: (businessId: number, params?: {
        search?: string
        status?: string
        has_debt?: boolean
        skip?: number
        limit?: number
    }) =>
        api.get<Client[]>(`/businesses/${businessId}/clients`, { params }).then(r => r.data),

    get: (businessId: number, clientId: number) =>
        api.get<Client>(`/businesses/${businessId}/clients/${clientId}`).then(r => r.data),

    create: (businessId: number, data: ClientForm) =>
        api.post<Client>(`/businesses/${businessId}/clients`, data).then(r => r.data),

    update: (businessId: number, clientId: number, data: Partial<ClientForm>) =>
        api.patch<Client>(`/businesses/${businessId}/clients/${clientId}`, data).then(r => r.data),

    delete: (businessId: number, clientId: number) =>
        api.delete(`/businesses/${businessId}/clients/${clientId}`).then(r => r.data),

    // Estadísticas
    getStats: (businessId: number, clientId: number) =>
        api.get<ClientStats>(`/businesses/${businessId}/clients/${clientId}/stats`).then(r => r.data),

    // Historial de compras
    getPurchases: (businessId: number, clientId: number) =>
        api.get<ClientPurchaseResponse[]>(`/businesses/${businessId}/clients/${clientId}/purchases`).then(r => r.data),

    // Cartera
    getCreditMovements: (businessId: number, clientId: number) =>
        api.get<CreditMovement[]>(`/businesses/${businessId}/clients/${clientId}/credit`).then(r => r.data),

    addCreditMovement: (businessId: number, clientId: number, data: CreditMovementForm) =>
        api.post<CreditMovement>(`/businesses/${businessId}/clients/${clientId}/credit`, data).then(r => r.data),
}