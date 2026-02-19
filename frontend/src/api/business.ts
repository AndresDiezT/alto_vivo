import { api } from './axios'
import type {
    Business,
    BusinessCreateForm,
    BusinessUserResponse,
    InviteUserForm,
} from '@/types'

export const businessApi = {
    // Negocios
    list: () =>
        api.get<Business[]>('/businesses').then((r) => r.data),

    get: (id: number) =>
        api.get<Business>(`/businesses/${id}`).then((r) => r.data),

    create: (data: BusinessCreateForm) =>
        api.post<Business>('/businesses', data).then((r) => r.data),

    update: (id: number, data: Partial<BusinessCreateForm>) =>
        api.patch<Business>(`/businesses/${id}`, data).then((r) => r.data),

    delete: (id: number) =>
        api.delete(`/businesses/${id}`).then((r) => r.data),

    // Usuarios del negocio
    listUsers: (businessId: number) =>
        api.get<BusinessUserResponse[]>(`/businesses/${businessId}/users`).then((r) => r.data),

    inviteUser: (businessId: number, data: InviteUserForm) =>
        api.post<BusinessUserResponse>(`/businesses/${businessId}/users`, data).then((r) => r.data),

    updateUserRole: (businessId: number, userId: number, roleId: number) =>
        api
            .patch<BusinessUserResponse>(`/businesses/${businessId}/users/${userId}/role`, {
                business_role_id: roleId,
            })
            .then((r) => r.data),

    removeUser: (businessId: number, userId: number) =>
        api.delete(`/businesses/${businessId}/users/${userId}`).then((r) => r.data),

    // Audit log
    getAuditLogs: (businessId: number) =>
        api.get(`/businesses/${businessId}/audit-logs`).then((r) => r.data),
}