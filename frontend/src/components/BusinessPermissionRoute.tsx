import { useParams, Navigate, Outlet } from 'react-router-dom'
import { useBusinessPermissions } from '@/hooks/useBusinessPermissions'
import { useBusiness } from '@/hooks/useBusiness'
import { PageLoader } from '@/components/ui'

interface Props {
    require: 'canManageUsers' | 'isOwner' | 'canManageRoles' // expandible
    fallback?: string
}

export function BusinessPermissionRoute({ require, fallback }: Props) {
    const { id } = useParams<{ id: string }>()
    const businessId = Number(id)
    const { data: business, isLoading } = useBusiness(businessId)
    const permissions = useBusinessPermissions(businessId)
    console.log('Permissions for business', businessId, permissions)
    if (isLoading || !business) return <PageLoader />

    const hasPermission = permissions[require] || permissions.isOwner

    if (!hasPermission) {
        return <Navigate to={fallback ?? `/businesses/${businessId}`} replace />
    }

    return <Outlet />
}