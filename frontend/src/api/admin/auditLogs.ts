import { api } from '../axios'

export interface AuditLog {
    id: number
    user_id: number
    user_email: string | null
    business_id: number | null
    action: string
    entity_type: string
    entity_id: number | null
    details: string | null
    ip_address: string | null
    created_at: string
}

export interface AuditLogListResponse {
    items: AuditLog[]
    total: number
    page: number
    page_size: number
    total_pages: number
}

export interface AuditLogFilters {
    search?: string
    action?: string
    entity_type?: string
    user_id?: number
    business_id?: number
    date_from?: string
    date_to?: string
    page?: number
    page_size?: number
}

export const auditLogsApi = {
    list: (filters?: AuditLogFilters) => {
        const params = new URLSearchParams()
        if (filters?.search) params.set('search', filters.search)
        if (filters?.action) params.set('action', filters.action)
        if (filters?.entity_type) params.set('entity_type', filters.entity_type)
        if (filters?.user_id) params.set('user_id', String(filters.user_id))
        if (filters?.business_id) params.set('business_id', String(filters.business_id))
        if (filters?.date_from) params.set('date_from', filters.date_from)
        if (filters?.date_to) params.set('date_to', filters.date_to)
        if (filters?.page) params.set('page', String(filters.page))
        if (filters?.page_size) params.set('page_size', String(filters.page_size))
        return api.get<AuditLogListResponse>(`/admin/audit-logs?${params}`).then((r) => r.data)
    },

    getActions: () =>
        api.get<string[]>('/admin/audit-logs/actions').then((r) => r.data),

    getEntityTypes: () =>
        api.get<string[]>('/admin/audit-logs/entity-types').then((r) => r.data),
}