import { useParams, Link, useNavigate } from 'react-router-dom'
import { Plus, Search, AlertTriangle, TrendingDown, DollarSign, Package } from 'lucide-react'
import React from 'react'
import { useSuppliers, useSupplierPortfolio } from '@/hooks/useSuppliers'
import { PageLoader, EmptyState, Badge } from '@/components/ui'
import type { Supplier } from '@/types/suppliers.types'
import { formatDate } from '@/utils'

export function SuppliersListPage() {
    const { id } = useParams<{ id: string }>()
    const businessId = Number(id)
    const navigate = useNavigate()

    const [search, setSearch] = React.useState('')
    const [debtFilter, setDebtFilter] = React.useState<boolean | undefined>()

    const { data: suppliers, isLoading } = useSuppliers(businessId, {
        search: search || undefined,
        has_debt: debtFilter,
    })
    const { data: portfolio } = useSupplierPortfolio(businessId)

    if (isLoading) return <PageLoader />

    return (
        <div className="p-6 md:p-8 max-w-6xl mx-auto animate-fade-in space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Proveedores</h1>
                    <p className="text-sm text-gray-500">{suppliers?.length ?? 0} proveedores registrados</p>
                </div>
                <Link to={`/businesses/${id}/suppliers/new`} className="btn-primary btn-sm">
                    <Plus className="w-4 h-4" /> Nuevo proveedor
                </Link>
            </div>

            {/* Alerta deuda vencida */}
            {Number(portfolio?.total_overdue ?? 0) > 0 && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl">
                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-semibold text-red-700">Deudas vencidas con proveedores</p>
                        <p className="text-xs text-red-500">
                            Total vencido: ${Number(portfolio!.total_overdue).toLocaleString()} — Requieren pago urgente
                        </p>
                    </div>
                </div>
            )}

            {/* Resumen cartera proveedores */}
            {portfolio && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <SummaryCard icon={<DollarSign className="w-4 h-4" />} label="Total por pagar" value={`$${Number(portfolio.total_payable).toLocaleString()}`} color="blue" />
                    <SummaryCard icon={<AlertTriangle className="w-4 h-4" />} label="Vencido" value={`$${Number(portfolio.total_overdue).toLocaleString()}`} color="red" />
                    <SummaryCard icon={<TrendingDown className="w-4 h-4" />} label="Pagado (30 días)" value={`$${Number(portfolio.paid_last_30_days).toLocaleString()}`} color="green" />
                    <SummaryCard icon={<Package className="w-4 h-4" />} label="Con deuda" value={portfolio.total_suppliers_with_debt} color="gray" />
                </div>
            )}

            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        className="input pl-9 w-full"
                        placeholder="Buscar proveedor..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <select
                    className="input w-full sm:w-44"
                    value={debtFilter === undefined ? '' : String(debtFilter)}
                    onChange={e => setDebtFilter(e.target.value === '' ? undefined : e.target.value === 'true')}
                >
                    <option value="">Todos</option>
                    <option value="true">Con deuda</option>
                    <option value="false">Sin deuda</option>
                </select>
            </div>

            {/* Lista */}
            {!suppliers?.length ? (
                <EmptyState
                    icon="🏭"
                    title="Sin proveedores"
                    description="Registra tu primer proveedor para comenzar a gestionar compras."
                    action={
                        <Link to={`/businesses/${id}/suppliers/new`} className="btn-primary btn-sm">
                            <Plus className="w-4 h-4" /> Agregar proveedor
                        </Link>
                    }
                />
            ) : (
                <div className="card divide-y divide-gray-100">
                    {suppliers.map(supplier => (
                        <SupplierRow
                            key={supplier.id}
                            supplier={supplier}
                            onClick={() => navigate(`/businesses/${id}/suppliers/${supplier.id}`)}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

function SupplierRow({ supplier, onClick }: { supplier: Supplier; onClick: () => void }) {
    const hasDebt = Number(supplier.current_balance) > 0
    return (
        <div onClick={onClick} className="flex items-center gap-4 p-4 hover:bg-surface-50 cursor-pointer transition-colors">
            <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                <span className="text-base font-bold text-brand-600">{supplier.name[0].toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">{supplier.name}</p>
                    {supplier.status === 'inactive' && <Badge variant="gray">Inactivo</Badge>}
                </div>
                <p className="text-xs text-gray-400">
                    {supplier.contact_name ?? supplier.phone ?? 'Sin contacto'}
                    {supplier.last_purchase_at && ` · Última compra ${formatDate(supplier.last_purchase_at)}`}
                </p>
            </div>
            <div className="text-right shrink-0">
                {hasDebt ? (
                    <>
                        <p className="text-sm font-bold text-red-600">${Number(supplier.current_balance).toLocaleString()}</p>
                        <p className="text-xs text-gray-400">por pagar</p>
                    </>
                ) : (
                    <p className="text-xs text-green-600 font-medium">Al día</p>
                )}
            </div>
        </div>
    )
}

function SummaryCard({ icon, label, value, color }: {
    icon: React.ReactNode; label: string; value: string | number
    color: 'blue' | 'red' | 'green' | 'gray'
}) {
    const colors = { blue: 'text-brand-600 bg-brand-50', red: 'text-red-600 bg-red-50', green: 'text-green-600 bg-green-50', gray: 'text-gray-600 bg-gray-50' }
    const text = { blue: 'text-brand-700', red: 'text-red-700', green: 'text-green-700', gray: 'text-gray-900' }
    return (
        <div className="card p-4">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${colors[color]}`}>{icon}</div>
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={`text-lg font-bold ${text[color]}`}>{value}</p>
        </div>
    )
}