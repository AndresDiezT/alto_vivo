import { api } from '../axios'
import type { User, SystemRole, SubscriptionPlan, Business } from '@/types'

export interface AdminUsersFilters {
    search?: string
    system_role?: SystemRole
    subscription_plan?: SubscriptionPlan
    is_active?: boolean
    is_verified?: boolean
}

export interface UserUpdateAdmin {
    system_role?: SystemRole
    subscription_plan?: SubscriptionPlan
}

export interface UserUpdateFull {
    full_name?: string
    email?: string
    phone?: string
    system_role?: SystemRole
    subscription_plan?: SubscriptionPlan
}

export interface UserWithBusinesses extends User {
    owned_businesses?: Business[]
    member_businesses?: Business[]
}

export const adminUsersApi = {
    list: (filters?: AdminUsersFilters) => {
        const params = new URLSearchParams()
        if (filters?.search) params.set('search', filters.search)
        if (filters?.system_role) params.set('system_role', filters.system_role)
        if (filters?.subscription_plan) params.set('subscription_plan', filters.subscription_plan)
        if (filters?.is_active !== undefined) params.set('is_active', String(filters.is_active))
        if (filters?.is_verified !== undefined) params.set('is_verified', String(filters.is_verified))
        return api.get<User[]>(`/admin/users?${params}`).then((r) => r.data)
    },

    getById: (userId: number) =>
        api.get<UserWithBusinesses>(`/admin/users/${userId}`).then((r) => r.data),

    update: (userId: number, data: UserUpdateAdmin) =>
        api.patch<User>(`/admin/users/${userId}`, data).then((r) => r.data),

    updateFull: (userId: number, data: UserUpdateFull) =>
        api.patch<User>(`/admin/users/${userId}/full`, data).then((r) => r.data),

    toggleActive: (userId: number) =>
        api.patch<User>(`/admin/users/${userId}/toggle-active`).then((r) => r.data),
}