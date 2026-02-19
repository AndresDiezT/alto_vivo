import { useMemo } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useBusinessUsers, useBusiness } from './useBusiness'

export function useBusinessPermissions(businessId: number) {
    const { user } = useAuthStore()
    const { data: business, isLoading: loadingBusiness } = useBusiness(businessId)
    const { data: businessUsers, isLoading: loadingUsers } = useBusinessUsers(businessId)

    const isLoading = loadingBusiness || loadingUsers

    const perms = useMemo(() => {
        if (!user || !business) {
            return {
                isOwner: false,
                canManageUsers: false,
                canManageRoles: false,
                hasPermission: () => false,
                permissions: [],
            }
        }

        const isOwner = business.owner_id === user.id
        if (isOwner) {
            return {
                isOwner: true,
                canManageUsers: true,
                canManageRoles: true,
                hasPermission: () => true,
                permissions: ['*'],
            }
        }

        const membership = businessUsers?.find((bu) => bu.user_id === user.id)
        if (!membership) {
            return {
                isOwner: false,
                canManageUsers: false,
                canManageRoles: false,
                hasPermission: () => false,
                permissions: [],
            }
        }

        const permissions = membership.permissions ?? []
        return {
            isOwner: false,
            canManageUsers: membership.can_manage_users ?? false,
            canManageRoles: membership.can_manage_roles ?? false,
            hasPermission: (code: string) => permissions.includes(code),
            permissions,
        }
    }, [user, business, businessUsers])

    return { ...perms, isLoading }
}