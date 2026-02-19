import React from 'react'
import { Search, X, Building2, Users, Package } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAdminBusinesses } from '@/hooks/admin/useAdminBusinesses'
import { useDebounce } from '@/hooks/useDebounce'
import { PageLoader, Badge } from '@/components/ui'
import { formatDate, PLAN_LABELS, BUSINESS_TYPE_LABELS } from '@/utils'
import type { BusinessType, SubscriptionPlan } from '@/types'
import type { AdminBusinessesFilters } from '@/api/admin/businesses'

export function AdminBusinessesPage() {
    const [rawSearch, setRawSearch] = React.useState('')
    const [filters, setFilters] = React.useState<AdminBusinessesFilters>({})
    const search = useDebounce(rawSearch, 300)

    const { data: businesses, isLoading } = useAdminBusinesses({ search: search || undefined, ...filters })

    const setFilter = <K extends keyof AdminBusinessesFilters>(
        key: K,
        value: AdminBusinessesFilters[K]
    ) => {
        setFilters((prev) => {
            const next = { ...prev }

            if (
                value === undefined ||
                (typeof value === 'string' && value.trim() === '')
            ) {
                delete next[key]
            } else {
                next[key] = value
            }

            return next
        })
    }

    const clearFilters = () => { setFilters({}); setRawSearch('') }
    const hasFilters = rawSearch || Object.keys(filters).length > 0

    if (isLoading) return <PageLoader />

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Negocios del sistema</h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {businesses?.length ?? 0} negocios encontrados
                    </p>
                </div>
            </div>

            {/* Search + Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1 sm:max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre..."
                        value={rawSearch}
                        onChange={(e) => setRawSearch(e.target.value)}
                        className="input pl-10 w-full"
                    />
                </div>

                <select
                    className="input w-full sm:w-auto"
                    value={filters.business_type ?? ''}
                    onChange={(e) => setFilter('business_type', e.target.value as BusinessType || undefined)}
                >
                    <option value="">Todos los tipos</option>
                    <option value="retail">Minorista / Tienda</option>
                    <option value="restaurant">Restaurante / Comidas</option>
                    <option value="wholesale">Mayorista</option>
                    <option value="other">Otro</option>
                </select>

                <select
                    className="input w-full sm:w-auto"
                    value={filters.plan_type ?? ''}
                    onChange={(e) => setFilter('plan_type', e.target.value as SubscriptionPlan || undefined)}
                >
                    <option value="">Todos los planes</option>
                    <option value="free">Free</option>
                    <option value="basic">Basic</option>
                    <option value="professional">Professional</option>
                    <option value="enterprise">Enterprise</option>
                </select>

                <select
                    className="input w-full sm:w-auto"
                    value={filters.is_active === undefined ? '' : String(filters.is_active)}
                    onChange={(e) =>
                        setFilter('is_active', e.target.value === '' ? undefined : e.target.value === 'true')
                    }
                >
                    <option value="">Todos los estados</option>
                    <option value="true">Activos</option>
                    <option value="false">Inactivos</option>
                </select>

                {hasFilters && (
                    <button onClick={clearFilters} className="btn-ghost btn-sm flex items-center gap-1.5 whitespace-nowrap">
                        <X className="w-4 h-4" />
                        Limpiar
                    </button>
                )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {businesses?.map((b) => (
                    <Link key={b.id} to={`/admin/businesses/${b.id}`} className="card-hover p-5">
                        <div className="flex items-start gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
                                <Building2 className="w-5 h-5 text-purple-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-semibold text-gray-900 truncate">
                                    {b.name}
                                </h3>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {BUSINESS_TYPE_LABELS[b.business_type]}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap mb-2">
                            <Badge variant="brand">{PLAN_LABELS[b.plan_type]}</Badge>
                            {b.is_active ? (
                                <Badge variant="green">Activo</Badge>
                            ) : (
                                <Badge variant="gray">Inactivo</Badge>
                            )}
                        </div>

                        <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
                            <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                Max {b.max_users} usuarios
                            </span>
                            <span className="flex items-center gap-1">
                                <Package className="w-3 h-3" />
                                Max {b.max_products} prods
                            </span>
                        </div>

                        <p className="text-xs text-gray-400 mt-2">
                            Creado {formatDate(b.created_at)}
                        </p>
                    </Link>
                ))}
            </div>

            {businesses?.length === 0 && (
                <div className="card">
                    <div className="text-center py-12">
                        <p className="text-sm text-gray-400">No se encontraron negocios</p>
                    </div>
                </div>
            )}
        </div>
    )
}