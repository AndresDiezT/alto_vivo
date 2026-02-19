import { api } from '../axios'

export interface SystemSetting {
    key: string
    value: string
    value_type: 'string' | 'bool' | 'int' | 'json'
    label: string
    description: string | null
    group: string
}

export const settingsApi = {
    list: () =>
        api.get<SystemSetting[]>('/admin/settings').then((r) => r.data),

    bulkUpdate: (settings: Record<string, string>) =>
        api.patch<SystemSetting[]>('/admin/settings', { settings }).then((r) => r.data),
}