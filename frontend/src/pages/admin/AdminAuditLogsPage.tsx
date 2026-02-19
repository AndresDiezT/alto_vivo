import React from 'react'
import { Search, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuditLogs, useAuditLogActions, useAuditLogEntityTypes } from '@/hooks/admin/useAuditLogs'
import { useDebounce } from '@/hooks/useDebounce'
import { Badge } from '@/components/ui'
import { formatDate } from '@/utils'
import type { AuditLogFilters } from '@/api/admin/auditLogs'

const ACTION_VARIANT: Record<string, 'green' | 'red' | 'yellow' | 'brand' | 'gray'> = {
    CREATE: 'green',
    DELETE: 'red',
    DEACTIVATE_USER: 'red',
    ACTIVATE_USER: 'green',
    UPDATE: 'yellow',
    UPDATE_USER_FULL: 'yellow',
    UPDATE_USER_ADMIN: 'yellow',
    UPDATE_SETTING: 'brand',
    UPDATE_BUSINESS_MODULES: 'brand',
    LOGIN: 'gray',
}

export function AdminAuditLogsPage() {
    const [rawSearch, setRawSearch] = React.useState('')
    const search = useDebounce(rawSearch, 300)
    const [filters, setFilters] = React.useState<Omit<AuditLogFilters, 'search' | 'page'>>({
        page_size: 50,
    })
    const [page, setPage] = React.useState(1)

    const { data, isLoading } = useAuditLogs({ search: search || undefined, ...filters, page })
    const { data: actions } = useAuditLogActions()
    const { data: entityTypes } = useAuditLogEntityTypes()

    const setFilter = <K extends keyof typeof filters>(key: K, value: typeof filters[K]) => {
        setPage(1)
        setFilters((prev) => {
            const next = { ...prev }
            if (value === undefined || value === '') delete next[key]
            else next[key] = value
            return next
        })
    }

    const clearFilters = () => {
        setRawSearch('')
        setFilters({ page_size: 50 })
        setPage(1)
    }

    const hasFilters = rawSearch || Object.keys(filters).filter(k => k !== 'page_size').length > 0

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            <div className="mb-6">
                <h1 className="text-xl font-bold text-gray-900">Registro de auditoría</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                    {data?.total ?? 0} registros en total
                </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por email o acción..."
                        value={rawSearch}
                        onChange={(e) => { setRawSearch(e.target.value); setPage(1) }}
                        className="input pl-10 w-64"
                    />
                </div>

                <select
                    className="input"
                    value={filters.action ?? ''}
                    onChange={(e) => setFilter('action', e.target.value || undefined)}
                >
                    <option value="">Todas las acciones</option>
                    {actions?.map((a) => (
                        <option key={a} value={a}>{a}</option>
                    ))}
                </select>

                <select
                    className="input"
                    value={filters.entity_type ?? ''}
                    onChange={(e) => setFilter('entity_type', e.target.value || undefined)}
                >
                    <option value="">Todos los tipos</option>
                    {entityTypes?.map((t) => (
                        <option key={t} value={t}>{t}</option>
                    ))}
                </select>

                <input
                    type="date"
                    className="input"
                    value={filters.date_from ?? ''}
                    onChange={(e) => setFilter('date_from', e.target.value || undefined)}
                />
                <input
                    type="date"
                    className="input"
                    value={filters.date_to ?? ''}
                    onChange={(e) => setFilter('date_to', e.target.value || undefined)}
                />

                {hasFilters && (
                    <button onClick={clearFilters} className="btn-ghost btn-sm flex items-center gap-1.5">
                        <X className="w-4 h-4" />
                        Limpiar
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-surface-50 border-b border-gray-100">
                            <tr>
                                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Fecha</th>
                                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Usuario</th>
                                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Acción</th>
                                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Entidad</th>
                                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Detalles</th>
                                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">IP</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-12 text-gray-400">
                                        Cargando...
                                    </td>
                                </tr>
                            ) : data?.items.map((log) => (
                                <tr key={log.id} className="hover:bg-surface-50">
                                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                                        {formatDate(log.created_at)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-xs text-gray-700">
                                            {log.user_email ?? `#${log.user_id}`}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <Badge variant={ACTION_VARIANT[log.action] ?? 'gray'}>
                                            {log.action}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-600">
                                        {log.entity_type}
                                        {log.entity_id ? ` #${log.entity_id}` : ''}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">
                                        {log.details
                                            ? <DetailsCell raw={log.details} />
                                            : '—'
                                        }
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-400 font-mono">
                                        {log.ip_address ?? '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {data?.items.length === 0 && !isLoading && (
                    <div className="text-center py-12">
                        <p className="text-sm text-gray-400">No se encontraron registros</p>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {data && data.total_pages > 1 && (
                <div className="flex items-center justify-between mt-4">
                    <p className="text-xs text-gray-500">
                        Página {data.page} de {data.total_pages} · {data.total} registros
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="btn-ghost btn-sm p-2 disabled:opacity-40"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
                            disabled={page === data.total_pages}
                            className="btn-ghost btn-sm p-2 disabled:opacity-40"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

// Parsea el JSON de details y lo muestra legible
function DetailsCell({ raw }: { raw: string }) {
    try {
        const parsed = JSON.parse(raw)
        const entries = Object.entries(parsed)
        if (entries.length === 0) return <span>—</span>
        return (
            <span title={raw} className="cursor-help">
                {entries.map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(' · ')}
            </span>
        )
    } catch {
        return <span>{raw}</span>
    }
}