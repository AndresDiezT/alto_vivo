import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

/**
 * Protege rutas de administración.
 * Solo accesible para super_admin, admin y support.
 */
export function AdminRoute() {
    const { user, accessToken } = useAuthStore()

    if (!accessToken || !user) {
        return <Navigate to="/login" replace />
    }

    const allowedRoles = ['super_admin', 'admin', 'support']
    if (!allowedRoles.includes(user.system_role)) {
        return <Navigate to="/dashboard" replace />
    }

    return <Outlet />
}