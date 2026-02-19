import { useParams, Link, useNavigate } from 'react-router-dom'
import { Plus, Search, Filter } from 'lucide-react'
import React from 'react'
import { useClients, useDeleteClient } from '@/hooks/useClients'
import { PageLoader, EmptyState, Avatar, ConfirmDialog, Badge } from '@/components/ui'
import type { Client, ClientStatus } from '@/types'
import { formatDate, getApiErrorMessage } from '@/utils'

const STATUS_LABEL: Record<ClientStatus, string> = {
    active: 'Activo', inactive: 'Inactivo', moroso: 'Moroso', blocked: 'Bloqueado',
}
const STATUS_VARIANT: Record<ClientStatus, 'green' | 'gray' | 'red' | 'yellow'> = {
    active: 'green', inactive: 'gray', moroso: 'red', blocked: 'yellow',
}

export function ClientsListPage() {
    const { id } = useParams<{ id: string }>()
    const businessId = Number(id)
    const navigate = useNavigate()

    const [search, setSearch] = React.useState('')
    const [statusFilter, setStatusFilter] = React.useState('')
    const [debtFilter, setDebtFilter] = React.useState<boolean | undefined>()
    const [deleteTarget, setDeleteTarget] = React.useState<Client | null>(null)

    const { data: clients, isLoading } = useClients(businessId, {
        search: search || undefined,
        status: statusFilter || undefined,
        has_debt: debtFilter,
    })
    const deleteClient = useDeleteClient(businessId)

    if (isLoading) return <PageLoader />

    return (
        <div className="p-6 md:p-8 max-w-6xl mx-auto animate-fade-in space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Clientes</h1>
                    <p className="text-sm text-gray-500">{clients?.length ?? 0} clientes registrados</p>
                </div>
                <Link to={`/businesses/${id}/clients/new`} className="btn-primary btn-sm">
                    <Plus className="w-4 h-4" /> Nuevo cliente
                </Link>
            </div>

            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        className="input pl-9 w-full"
                        placeholder="Buscar por nombre, teléfono, documento..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <select
                    className="input w-full sm:w-40"
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                >
                    <option value="">Todos los estados</option>
                    <option value="active">Activos</option>
                    <option value="moroso">Morosos</option>
                    <option value="inactive">Inactivos</option>
                    <option value="blocked">Bloqueados</option>
                </select>
                <select
                    className="input w-full sm:w-40"
                    value={debtFilter === undefined ? '' : String(debtFilter)}
                    onChange={e => setDebtFilter(e.target.value === '' ? undefined : e.target.value === 'true')}
                >
                    <option value="">Con y sin deuda</option>
                    <option value="true">Con deuda</option>
                    <option value="false">Sin deuda</option>
                </select>
            </div>

            {/* Lista */}
            {!clients?.length ? (
                <EmptyState
                    icon="👥"
                    title="Sin clientes aún"
                    description="Registra tu primer cliente para llevar el control de compras y cartera."
                    action={
                        <Link to={`/businesses/${id}/clients/new`} className="btn-primary btn-sm">
                            <Plus className="w-4 h-4" /> Agregar cliente
                        </Link>
                    }
                />
            ) : (
                <div className="card divide-y divide-gray-100">
                    {clients.map(client => (
                        <div
                            key={client.id}
                            onClick={() => navigate(`/businesses/${id}/clients/${client.id}`)}
                            className="flex items-center gap-4 p-4 hover:bg-surface-50 transition-colors cursor-pointer"
                        >
                            <Avatar name={client.name} size="md" />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium text-gray-900 truncate">{client.name}</p>
                                    <Badge variant={STATUS_VARIANT[client.status]}>
                                        {STATUS_LABEL[client.status]}
                                    </Badge>
                                </div>
                                <p className="text-xs text-gray-500">
                                    {client.phone ?? 'Sin teléfono'}
                                    {client.last_purchase_at && ` · Última compra ${formatDate(client.last_purchase_at)}`}
                                </p>
                            </div>
                            {/* Deuda */}
                            <div className="text-right shrink-0">
                                {Number(client.current_balance) > 0 ? (
                                    <>
                                        <p className="text-sm font-semibold text-red-600">
                                            ${Number(client.current_balance).toLocaleString()}
                                        </p>
                                        <p className="text-xs text-gray-400">deuda</p>
                                    </>
                                ) : (
                                    <p className="text-xs text-gray-400">Sin deuda</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <ConfirmDialog
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={() => {
                    if (!deleteTarget) return
                    deleteClient.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
                }}
                loading={deleteClient.isPending}
                danger
                title="Eliminar cliente"
                message={`¿Seguro que deseas eliminar a ${deleteTarget?.name}? Esta acción no se puede deshacer.`}
                confirmLabel="Eliminar"
            />
        </div>
    )
}