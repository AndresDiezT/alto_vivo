import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    adminUsersApi,
    type AdminUsersFilters,
    type UserUpdateAdmin,
    type UserUpdateFull
} from '@/api/admin/users'

export function useAdminUsers(filters?: AdminUsersFilters) {
    return useQuery({
        queryKey: ['admin', 'users', filters],
        queryFn: () => adminUsersApi.list(filters),
    })
}

export function useAdminUser(userId: number) {
    return useQuery({
        queryKey: ['admin', 'users', userId],
        queryFn: () => adminUsersApi.getById(userId),
        enabled: !!userId,
    })
}

export function useUpdateUserAdmin() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ userId, data }: { userId: number; data: UserUpdateAdmin }) =>
            adminUsersApi.update(userId, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['admin', 'users'] })
        },
    })
}

export function useUpdateUserFull(userId: number) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (data: UserUpdateFull) => adminUsersApi.updateFull(userId, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['admin', 'users', userId] })
            qc.invalidateQueries({ queryKey: ['admin', 'users'] })
        },
    })
}

export function useToggleUserActive() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (userId: number) => adminUsersApi.toggleActive(userId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['admin', 'users'] })
        },
    })
}