import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

/**
 * Solo accesible si NO está autenticado (login, register).
 * Si ya tiene sesión → redirige al dashboard.
 */
export function PublicRoute() {
    const { accessToken } = useAuthStore()

    if (accessToken) {
        return <Navigate to="/dashboard" replace />
    }

    return <Outlet />
}