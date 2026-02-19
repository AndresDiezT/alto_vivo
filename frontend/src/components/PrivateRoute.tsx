import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

/**
 * Protege rutas que requieren autenticación.
 * Si no hay token → redirige a /login guardando la ruta original.
 */
export function PrivateRoute() {
    const { accessToken } = useAuthStore()
    const location = useLocation()

    if (!accessToken) {
        return <Navigate to="/login" state={{ from: location }} replace />
    }

    return <Outlet />
}