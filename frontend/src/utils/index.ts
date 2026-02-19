import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { ApiError } from '@/types'

// ── Classnames ─────────────────────────────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

// ── Extraer mensaje de error del backend ────────────────────────────────────
export function getApiErrorMessage(error: unknown): string {
    if (!error || typeof error !== 'object') return 'Error desconocido'

    const err = error as { response?: { data?: ApiError } }
    const detail = err.response?.data?.detail

    if (!detail) return 'Error de conexión con el servidor'
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) {
        return detail.map((e) => e.msg).join(', ')
    }
    return 'Error desconocido'
}

// ── Iniciales para avatar ───────────────────────────────────────────────────
export function getInitials(name: string | null, fallback = '?'): string {
    if (!name) return fallback
    return name
        .split(' ')
        .slice(0, 2)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
}

// ── Formatear fecha ─────────────────────────────────────────────────────────
export function formatDate(dateStr: string): string {
    return new Intl.DateTimeFormat('es-CO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    }).format(new Date(dateStr))
}

// ── Labels de plan ──────────────────────────────────────────────────────────
export const PLAN_LABELS: Record<string, string> = {
    free: 'Gratis',
    basic: 'Básico',
    professional: 'Profesional',
    enterprise: 'Empresarial',
}

export const BUSINESS_TYPE_LABELS: Record<string, string> = {
    retail: 'Minorista',
    restaurant: 'Restaurante',
    wholesale: 'Mayorista',
    other: 'Otro',
}

// ── Color por plan ──────────────────────────────────────────────────────────
export function getPlanBadgeClass(plan: string): string {
    return (
        {
            free: 'badge-gray',
            basic: 'badge-brand',
            professional: 'badge-green',
            enterprise: 'badge-yellow',
        }[plan] ?? 'badge-gray'
    )
}

// ── Módulos del negocio ─────────────────────────────────────────────────────
export const MODULE_LABELS: Record<string, { label: string; icon: string }> = {
    module_inventory: { label: 'Inventario', icon: '📦' },
    module_sales: { label: 'Ventas', icon: '💰' },
    module_clients: { label: 'Clientes', icon: '👥' },
    module_portfolio: { label: 'Cartera', icon: '📋' },
    module_finance: { label: 'Finanzas', icon: '🏦' },
    module_suppliers: { label: 'Proveedores', icon: '🚚' },
    module_reports: { label: 'Reportes', icon: '📊' },
    module_waste: { label: 'Mermas', icon: '🗑️' },
}