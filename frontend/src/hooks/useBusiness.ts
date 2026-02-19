import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { businessApi } from '@/api/business'
import { rolesApi } from '@/api/roles'
import type { BusinessCreateForm, InviteUserForm, RoleForm } from '@/types'

// ── Negocios ────────────────────────────────────────────────────────────────
export function useBusinessList() {
    return useQuery({
        queryKey: ['businesses'],
        queryFn: businessApi.list,
        staleTime: 1000 * 60 * 2,
    })
}

export function useBusiness(id: number) {
    return useQuery({
        queryKey: ['businesses', id],
        queryFn: () => businessApi.get(id),
        enabled: !!id,
    })
}

export function useCreateBusiness() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (data: BusinessCreateForm) => businessApi.create(data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['businesses'] }),
    })
}

export function useDeleteBusiness() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (id: number) => businessApi.delete(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['businesses'] }),
    })
}

// ── Usuarios del negocio ────────────────────────────────────────────────────
export function useBusinessUsers(businessId: number) {
    return useQuery({
        queryKey: ['businesses', businessId, 'users'],
        queryFn: () => businessApi.listUsers(businessId),
        enabled: !!businessId,
    })
}

export function useInviteUser(businessId: number) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (data: InviteUserForm) => businessApi.inviteUser(businessId, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['businesses', businessId, 'users'] }),
    })
}

export function useUpdateUserRole(businessId: number) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ userId, roleId }: { userId: number; roleId: number }) =>
            businessApi.updateUserRole(businessId, userId, roleId),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['businesses', businessId, 'users'] }),
    })
}

export function useRemoveUser(businessId: number) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (userId: number) => businessApi.removeUser(businessId, userId),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['businesses', businessId, 'users'] }),
    })
}

// ── Roles ───────────────────────────────────────────────────────────────────
export function useRoleList(businessId: number) {
    return useQuery({
        queryKey: ['businesses', businessId, 'roles'],
        queryFn: () => rolesApi.list(businessId),
        enabled: !!businessId,
    })
}

export function useRole(businessId: number, roleId: number) {
    return useQuery({
        queryKey: ['businesses', businessId, 'roles', roleId],
        queryFn: () => rolesApi.get(businessId, roleId),
        enabled: !!businessId && !!roleId,
    })
}

export function usePermissions(businessId: number) {
    return useQuery({
        queryKey: ['businesses', businessId, 'permissions'],
        queryFn: () => rolesApi.listPermissions(businessId),
        enabled: !!businessId,
        staleTime: Infinity, // Los permisos no cambian
    })
}

export function useCreateRole(businessId: number) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (data: RoleForm) => rolesApi.create(businessId, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['businesses', businessId, 'roles'] }),
    })
}

export function useUpdateRole(businessId: number, roleId: number) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (data: Partial<RoleForm>) => rolesApi.update(businessId, roleId, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['businesses', businessId, 'roles'] })
            qc.invalidateQueries({ queryKey: ['businesses', businessId, 'roles', roleId] })
        },
    })
}

export function useDeleteRole(businessId: number) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (roleId: number) => rolesApi.delete(businessId, roleId),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['businesses', businessId, 'roles'] }),
    })
}