import { useParams, Link, useNavigate } from 'react-router-dom'
import { Plus, CreditCard } from 'lucide-react'
import React from 'react'
import { useSales, useDailySummary } from '@/hooks/useSales'
import { PageLoader, EmptyState, Badge } from '@/components/ui'
import type { SaleStatus, SaleSummary } from '@/types/sales.types'
import { formatDate } from '@/utils'

const STATUS_VARIANTS: Record<SaleStatus, 'green' | 'red' | 'yellow'> = {
    completed: 'green', cancelled: 'red', partial: 'yellow',
}
const STATUS_LABELS: Record<SaleStatus, string> = {
    completed: 'Completada', cancelled: 'Cancelada', partial: 'Parcial',
}

export function SalesListPage() {
    const { id } = useParams<{ id: string }>()
    const businessId = Number(id)
    const navigate = useNavigate()

    const today = new Date().toISOString().split('T')[0]
    const [dateFrom, setDateFrom] = React.useState(today)
    const [dateTo, setDateTo] = React.useState(today)
    const [statusFilter, setStatusFilter] = React.useState('')

    // payment_method eliminado como filtro — el backend ya no lo soporta
    const { data: sales, isLoading } = useSales(businessId, {
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        status: statusFilter || undefined,
    })
    const { data: daily } = useDailySummary(businessId, today)

    if (isLoading) return <PageLoader />

    // Separar métodos de crédito y no-crédito para el resumen
    const regularMethods = daily?.by_method.filter(m => !m.is_credit) ?? []
    const creditTotal = daily?.total_credit ?? '0'

    return (
        <div className="p-6 md:p-8 max-w-6xl mx-auto animate-fade-in space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Ventas</h1>
                    <p className="text-sm text-gray-500">{sales?.length ?? 0} ventas en el período</p>
                </div>
                <div className='flex gap-2'>
                    <Link to={`/businesses/${id}/sales/payment-methods`} className="btn-secondary btn-sm">
                        <CreditCard className="w-4 h-4" /> Metodos de Pago
                    </Link>
                    <Link to={`/businesses/${id}/sales/new`} className="btn-primary btn-sm">
                        <Plus className="w-4 h-4" /> Nueva venta
                    </Link>
                </div>
            </div>

            {/* Resumen diario — tarjetas fijas */}
            {daily && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <SummaryCard label="Ventas hoy" value={daily.total_sales} sub="transacciones" color="gray" />
                    <SummaryCard
                        label="Total ingresos"
                        value={`$${Number(daily.total_revenue).toLocaleString()}`}
                        sub="hoy" color="green"
                    />
                    <SummaryCard
                        label="Fiado"
                        value={`$${Number(creditTotal).toLocaleString()}`}
                        sub="pendiente cobrar" color="yellow"
                    />
                    <SummaryCard
                        label="Canceladas"
                        value={daily.cancelled_count}
                        sub="ventas" color="red"
                    />
                </div>
            )}

            {/* Desglose por método — dinámico */}
            {daily && daily.by_method.length > 0 && (
                <div className="card p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                        Ingresos por método de pago — hoy
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {regularMethods.map(m => (
                            <div key={m.payment_method_id}>
                                <p className="text-xs text-gray-400">{m.payment_method_name}</p>
                                <p className="text-sm font-semibold text-gray-800">
                                    ${Number(m.total).toLocaleString()}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Filtros — sin filtro de método de pago */}
            <div className="flex flex-col sm:flex-row gap-3">
                <input type="date" className="input w-full sm:w-40"
                    value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                <input type="date" className="input w-full sm:w-40"
                    value={dateTo} onChange={e => setDateTo(e.target.value)} />
                <select className="input w-full sm:w-36"
                    value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                    <option value="">Todos los estados</option>
                    <option value="completed">Completadas</option>
                    <option value="cancelled">Canceladas</option>
                </select>
            </div>

            {/* Lista */}
            {!sales?.length ? (
                <EmptyState
                    icon="💰"
                    title="Sin ventas en este período"
                    description="Registra tu primera venta para comenzar."
                    action={
                        <Link to={`/businesses/${id}/sales/new`} className="btn-primary btn-sm">
                            <Plus className="w-4 h-4" /> Nueva venta
                        </Link>
                    }
                />
            ) : (
                <div className="card divide-y divide-gray-100">
                    {sales.map(sale => (
                        <SaleRow
                            key={sale.id}
                            sale={sale}
                            onClick={() => navigate(`/businesses/${id}/sales/${sale.id}`)}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

// ── Componentes internos ──────────────────────────────────────────────────────

function SaleRow({ sale, onClick }: { sale: SaleSummary; onClick: () => void }) {
    const hasCredit = Number(sale.amount_credit) > 0

    return (
        <div onClick={onClick}
            className="flex items-center gap-4 p-4 hover:bg-surface-50 cursor-pointer transition-colors">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-900">
                        {sale.client_name ?? 'Cliente ocasional'}
                    </p>
                    <Badge variant={STATUS_VARIANTS[sale.status]}>
                        {STATUS_LABELS[sale.status]}
                    </Badge>
                    {hasCredit && (
                        <Badge variant="yellow">Fiado</Badge>
                    )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                    {formatDate(sale.created_at)}
                    {sale.seller_name && ` · ${sale.seller_name}`}
                    {sale.payment_summary && (
                        <span className="ml-1 text-gray-400">· {sale.payment_summary}</span>
                    )}
                </p>
            </div>
            <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-gray-900">
                    ${Number(sale.total).toLocaleString()}
                </p>
                {hasCredit && (
                    <p className="text-xs text-yellow-600">
                        ${Number(sale.amount_credit).toLocaleString()} fiado
                    </p>
                )}
            </div>
        </div>
    )
}

function SummaryCard({ label, value, sub, color }: {
    label: string; value: string | number; sub: string
    color: 'green' | 'red' | 'yellow' | 'gray'
}) {
    const colors = {
        green: 'text-green-600', red: 'text-red-600',
        yellow: 'text-yellow-600', gray: 'text-gray-900',
    }
    return (
        <div className="card p-4">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={`text-lg font-bold ${colors[color]}`}>{value}</p>
            <p className="text-xs text-gray-400">{sub}</p>
        </div>
    )
}