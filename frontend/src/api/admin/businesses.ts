import { api } from '../axios'
import type { Business, BusinessType, PlanType, SubscriptionPlan } from '@/types'

export interface AdminBusinessesFilters {
    search?: string
    business_type?: BusinessType
    plan_type?: SubscriptionPlan
    is_active?: boolean
}

export interface ModulesUpdate {
    module_inventory?: boolean
    module_sales?: boolean
    module_clients?: boolean
    module_portfolio?: boolean
    module_finance?: boolean
    module_suppliers?: boolean
    module_reports?: boolean
    module_waste?: boolean
}

export interface BusinessUpdateFull {
    name?: string
    description?: string
    business_type?: BusinessType
    plan_type?: PlanType
    max_users?: number
    max_products?: number
}

export interface BusinessUser {
    id: number
    user_id: number
    user_email: string
    user_name: string
    role_name: string | null
    is_active: boolean
    joined_at: string
}

export interface BusinessWithUsers extends Business {
    users?: BusinessUser[]
    owner_email?: string
    owner_name?: string
}

export const adminBusinessesApi = {
    list: (filters?: AdminBusinessesFilters) => {
        const params = new URLSearchParams()
        if (filters?.search) params.set('search', filters.search)
        if (filters?.business_type) params.set('business_type', filters.business_type)
        if (filters?.plan_type) params.set('plan_type', filters.plan_type)
        if (filters?.is_active !== undefined) params.set('is_active', String(filters.is_active))
        return api.get<Business[]>(`/admin/businesses?${params}`).then((r) => r.data)
    },

    getById: (businessId: number) =>
        api.get<BusinessWithUsers>(`/admin/businesses/${businessId}`).then((r) => r.data),

    updateModules: (businessId: number, data: ModulesUpdate) =>
        api.patch<Business>(`/admin/businesses/${businessId}/modules`, data).then((r) => r.data),

    updateFull: (businessId: number, data: BusinessUpdateFull) =>
        api.patch<Business>(`/admin/businesses/${businessId}/full`, data).then((r) => r.data),

    delete: (businessId: number) =>
        api.delete(`/admin/businesses/${businessId}`),
}