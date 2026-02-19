import { api } from './axios'
import type { User } from '@/types'

export const usersApi = {
    me: () =>
        api.get<User>('/users/me').then((r) => r.data),

    update: (data: Partial<Pick<User, 'full_name' | 'phone' | 'email'>>) =>
        api.patch<User>('/users/me', data).then((r) => r.data),

    myAuditLogs: () =>
        api.get('/users/me/audit-logs').then((r) => r.data),
}