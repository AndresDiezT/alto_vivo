import { api } from '../axios'

export interface AdminStats {
    total_users: number
    active_users: number
    total_businesses: number
    active_businesses: number
}

export const adminStatsApi = {
    getStats: () =>
        api.get<AdminStats>('/admin/stats').then((r) => r.data),
}