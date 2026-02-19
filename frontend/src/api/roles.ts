import { api } from './axios'
import type { BusinessRole, PermissionsGrouped, RoleForm } from '@/types'

export const rolesApi = {
    list: (businessId: number) =>
        api.get<BusinessRole[]>(`/businesses/${businessId}/roles`).then((r) => r.data),

    get: (businessId: number, roleId: number) =>
        api.get<BusinessRole>(`/businesses/${businessId}/roles/${roleId}`).then((r) => r.data),

    listPermissions: (businessId: number) =>
        api
            .get<PermissionsGrouped>(`/businesses/${businessId}/roles/permissions`)
            .then((r) => r.data),

    create: (businessId: number, data: RoleForm) =>
        api.post<BusinessRole>(`/businesses/${businessId}/roles`, data).then((r) => r.data),

    update: (businessId: number, roleId: number, data: Partial<RoleForm>) =>
        api
            .patch<BusinessRole>(`/businesses/${businessId}/roles/${roleId}`, data)
            .then((r) => r.data),

    delete: (businessId: number, roleId: number) =>
        api.delete(`/businesses/${businessId}/roles/${roleId}`).then((r) => r.data),
}