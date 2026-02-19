import { useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import React from 'react'
import { useMovements, useWarehouses } from '@/hooks/useInventory'
import { PageLoader } from '@/components/ui'
import { formatDate } from '@/utils'
import type { MovementTypeInventory } from '@/types'

const MOVEMENT_LABELS: Record<MovementTypeInventory, { label: string; color: string }> = {
    entry: { label: 'Entrada', color: 'text-green-600' },
    sale: { label: 'Venta', color: 'text-blue-600' },
    adjustment: { label: 'Ajuste', color: 'text-yellow-600' },
    transfer_in: { label: 'Transferencia ent.', color: 'text-teal-600' },
    transfer_out: { label: 'Transferencia sal.', color: 'text-orange-500' },
    waste: { label: 'Merma', color: 'text-red-600' },
}

export function MovementsPage() {
    const { id } = useParams<{ id: string }>()
    const businessId = Number(id)
    const [typeFilter, setTypeFilter] = React.useState('')
    const [warehouseFilter, setWarehouseFilter] = React.useState<number | undefined>()

    const { data: movements, isLoading } = useMovements(businessId, {
        movement_type: typeFilter || undefined,
        warehouse_id: warehouseFilter,
    })
    const { data: warehouses } = useWarehouses(businessId)

    if (isLoading) return <PageLoader />

    return (
        <div className="p-6 md:p-8 max-w-4xl mx-auto animate-fade-in space-y-6">
            <div className="flex items-center gap-3">
                <Link to={`/businesses/${id}/inventory`} className="btn-ghost btn-sm p-2">
                    <ArrowLeft className="w-4 h-4" />
                </Link>
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Movimientos de inventario</h1>
                    <p className="text-sm text-gray-500">{movements?.length ?? 0} movimientos</p>
                </div>
            </div>

            {/* Filtros */}
            <div className="flex gap-3">
                <select className="input w-44" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                    <option value="">Todos los tipos</option>
                    {Object.entries(MOVEMENT_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                    ))}
                </select>
                <select
                    className="input w-44"
                    value={warehouseFilter ?? ''}
                    onChange={e => setWarehouseFilter(e.target.value ? Number(e.target.value) : undefined)}
                >
                    <option value="">Todas las bodegas</option>
                    {warehouses?.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
            </div>

            <div className="card divide-y divide-gray-100">
                {!movements?.length ? (
                    <p className="text-sm text-gray-400 text-center py-10">Sin movimientos registrados</p>
                ) : movements.map(m => {
                    const info = MOVEMENT_LABELS[m.movement_type]
                    return (
                        <div key={m.id} className="flex items-center justify-between p-4">
                            <div>
                                <p className={`text-sm font-medium ${info.color}`}>{info.label}</p>
                                <p className="text-xs text-gray-400">
                                    {formatDate(m.created_at)}
                                    {m.reason && ` · ${m.reason}`}
                                </p>
                            </div>
                            <p className="text-sm font-semibold text-gray-800">
                                {Number(m.quantity) > 0 ? '+' : ''}{Number(m.quantity).toLocaleString()}
                            </p>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}