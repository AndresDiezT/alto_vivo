import { useParams, Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, TrendingDown, TrendingUp, DollarSign, Search, CreditCard } from 'lucide-react'
import React from 'react'
import {
    usePortfolioSummary, useClientsWithDebt,
    usePortfolioMovements, usePortfolioPayment,
} from '@/hooks/usePortfolio'
import { PageLoader, EmptyState, Badge, Modal, ErrorAlert, Spinner, Avatar } from '@/components/ui'
import { formatDate, getApiErrorMessage } from '@/utils'
import type { Client, ClientStatus } from '@/types'

const STATUS_LABEL: Record<ClientStatus, string> = {
    active: 'Al día', inactive: 'Inactivo', moroso: 'Moroso', blocked: 'Bloqueado',
}
const STATUS_VARIANT: Record<ClientStatus, 'green' | 'gray' | 'red' | 'yellow'> = {
    active: 'green', inactive: 'gray', moroso: 'red', blocked: 'yellow',
}

type Tab = 'clients' | 'movements'

export function PortfolioPage() {
    const { id } = useParams<{ id: string }>()
    const businessId = Number(id)
    const navigate = useNavigate()

    const [tab, setTab] = React.useState<Tab>('clients')
    const [search, setSearch] = React.useState('')
    const [movementFilter, setMovementFilter] = React.useState('')
    const [paymentTarget, setPaymentTarget] = React.useState<Client | null>(null)
    const [paymentAmount, setPaymentAmount] = React.useState('')
    const [paymentDesc, setPaymentDesc] = React.useState('')

    const { data: summary, isLoading: loadingSummary } = usePortfolioSummary(businessId)
    const { data: clients, isLoading: loadingClients } = useClientsWithDebt(businessId)
    const { data: movements, isLoading: loadingMovements } = usePortfolioMovements(businessId, movementFilter || undefined)
    const payment = usePortfolioPayment(businessId)

    const filtered = clients?.filter(c =>
        !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone?.includes(search)
    )

    // Alertas visuales — morosos separados
    const morosos = filtered?.filter(c => c.status === 'moroso') ?? []
    const otros = filtered?.filter(c => c.status !== 'moroso') ?? []

    const handlePayment = () => {
        if (!paymentTarget || !paymentAmount) return
        payment.mutate(
            {
                clientId: paymentTarget.id,
                data: {
                    amount: String(paymentAmount),
                    movement_type: 'payment',
                    description: paymentDesc || `Abono desde cartera`,
                },
            },
            {
                onSuccess: () => {
                    setPaymentTarget(null)
                    setPaymentAmount('')
                    setPaymentDesc('')
                },
            }
        )
    }

    if (loadingSummary) return <PageLoader />

    return (
        <div className="p-6 md:p-8 max-w-6xl mx-auto animate-fade-in space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-xl font-bold text-gray-900">Cartera</h1>
                <p className="text-sm text-gray-500">Gestión de créditos y cobros pendientes</p>
            </div>

            {/* Alerta morosos */}
            {(summary?.morosos_count ?? 0) > 0 && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl">
                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-semibold text-red-700">
                            {summary!.morosos_count} cliente{summary!.morosos_count > 1 ? 's' : ''} en mora
                        </p>
                        <p className="text-xs text-red-500">
                            Total vencido: ${Number(summary!.total_overdue).toLocaleString()} — Requieren atención inmediata
                        </p>
                    </div>
                </div>
            )}

            {/* Tarjetas resumen */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <SummaryCard
                    icon={<DollarSign className="w-4 h-4" />}
                    label="Total en cartera"
                    value={`$${Number(summary?.total_portfolio ?? 0).toLocaleString()}`}
                    color="blue"
                />
                <SummaryCard
                    icon={<AlertTriangle className="w-4 h-4" />}
                    label="Cartera vencida"
                    value={`$${Number(summary?.total_overdue ?? 0).toLocaleString()}`}
                    color="red"
                />
                <SummaryCard
                    icon={<TrendingUp className="w-4 h-4" />}
                    label="Cobrado (30 días)"
                    value={`$${Number(summary?.collected_last_30_days ?? 0).toLocaleString()}`}
                    color="green"
                />
                <SummaryCard
                    icon={<TrendingDown className="w-4 h-4" />}
                    label="Clientes con deuda"
                    value={summary?.total_clients_with_debt ?? 0}
                    color="gray"
                />
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-100">
                <div className="flex gap-1">
                    <button
                        onClick={() => setTab('clients')}
                        className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === 'clients' ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Clientes con deuda
                        {(clients?.length ?? 0) > 0 && (
                            <span className="ml-1.5 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                                {clients?.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setTab('movements')}
                        className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === 'movements' ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Historial de movimientos
                    </button>
                </div>
            </div>

            {/* Tab: Clientes con deuda */}
            {tab === 'clients' && (
                <div className="space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            className="input pl-9 w-full sm:w-80"
                            placeholder="Buscar cliente..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>

                    {loadingClients ? <PageLoader /> : !filtered?.length ? (
                        <EmptyState
                            icon="✅"
                            title="Sin deudas pendientes"
                            description="Todos los clientes están al día."
                        />
                    ) : (
                        <div className="space-y-4">
                            {/* Morosos primero */}
                            {morosos.length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <AlertTriangle className="w-3.5 h-3.5" /> Morosos
                                    </p>
                                    <div className="card divide-y divide-gray-100 border-red-100">
                                        {morosos.map(client => (
                                            <ClientDebtRow
                                                key={client.id}
                                                client={client}
                                                onPay={() => setPaymentTarget(client)}
                                                onView={() => navigate(`/businesses/${id}/clients/${client.id}`)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Resto */}
                            {otros.length > 0 && (
                                <div>
                                    {morosos.length > 0 && (
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Al corriente</p>
                                    )}
                                    <div className="card divide-y divide-gray-100">
                                        {otros.map(client => (
                                            <ClientDebtRow
                                                key={client.id}
                                                client={client}
                                                onPay={() => setPaymentTarget(client)}
                                                onView={() => navigate(`/businesses/${id}/clients/${client.id}`)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Tab: Historial movimientos */}
            {tab === 'movements' && (
                <div className="space-y-4">
                    <select
                        className="input w-44"
                        value={movementFilter}
                        onChange={e => setMovementFilter(e.target.value)}
                    >
                        <option value="">Todos</option>
                        <option value="charge">Solo cargos</option>
                        <option value="payment">Solo abonos</option>
                    </select>

                    {loadingMovements ? <PageLoader /> : !movements?.length ? (
                        <EmptyState icon="📋" title="Sin movimientos" description="No hay movimientos de cartera registrados." />
                    ) : (
                        <div className="card divide-y divide-gray-100">
                            {movements.map(m => (
                                <div key={m.id} className="flex items-center justify-between p-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${m.movement_type === 'payment' ? 'bg-green-50' : 'bg-red-50'
                                            }`}>
                                            {m.movement_type === 'payment'
                                                ? <TrendingUp className="w-4 h-4 text-green-600" />
                                                : <TrendingDown className="w-4 h-4 text-red-500" />
                                            }
                                        </div>
                                        <div>
                                            <button
                                                onClick={() => navigate(`/businesses/${id}/clients/${m.client_id}`)}
                                                className="text-sm font-medium text-gray-800 hover:text-brand-600 transition-colors"
                                            >
                                                {m.client_name ?? 'Cliente eliminado'}
                                            </button>
                                            <p className="text-xs text-gray-400">
                                                {m.description ?? (m.movement_type === 'payment' ? 'Abono' : 'Cargo')}
                                                {' · '}{formatDate(m.created_at)}
                                            </p>
                                        </div>
                                    </div>
                                    <p className={`text-sm font-semibold ${m.movement_type === 'payment' ? 'text-green-600' : 'text-red-500'
                                        }`}>
                                        {m.movement_type === 'payment' ? '+' : '-'}${Number(m.amount).toLocaleString()}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Modal abono */}
            <Modal
                isOpen={!!paymentTarget}
                onClose={() => { setPaymentTarget(null); setPaymentAmount(''); setPaymentDesc('') }}
                title={`Registrar abono — ${paymentTarget?.name}`}
                size="sm"
            >
                <div className="space-y-4">
                    {payment.error && <ErrorAlert message={getApiErrorMessage(payment.error)} />}

                    {paymentTarget && (
                        <div className="p-3 bg-surface-50 rounded-xl">
                            <p className="text-xs text-gray-500">Deuda actual</p>
                            <p className="text-lg font-bold text-red-600">
                                ${Number(paymentTarget.current_balance).toLocaleString()}
                            </p>
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="label">Monto del abono *</label>
                        <input
                            type="number"
                            className="input text-lg"
                            min="0.01"
                            step="0.01"
                            placeholder="$0"
                            value={paymentAmount}
                            onChange={e => setPaymentAmount(e.target.value)}
                            autoFocus
                        />
                        {paymentTarget && Number(paymentAmount) > 0 && (
                            <p className="text-xs text-gray-400">
                                Saldo restante: ${Math.max(0, Number(paymentTarget.current_balance) - Number(paymentAmount)).toLocaleString()}
                            </p>
                        )}
                    </div>

                    <div className="space-y-1">
                        <label className="label">Descripción (opcional)</label>
                        <input
                            className="input"
                            placeholder="Ej: Pago en efectivo, transferencia..."
                            value={paymentDesc}
                            onChange={e => setPaymentDesc(e.target.value)}
                        />
                    </div>

                    {/* Atajos de monto */}
                    {paymentTarget && (
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPaymentAmount(String(Number(paymentTarget.current_balance)))}
                                className="btn-secondary btn-sm flex-1 text-xs"
                            >
                                Pago total
                            </button>
                            <button
                                onClick={() => setPaymentAmount(String(Math.floor(Number(paymentTarget.current_balance) / 2)))}
                                className="btn-secondary btn-sm flex-1 text-xs"
                            >
                                50%
                            </button>
                        </div>
                    )}

                    <div className="flex gap-2 pt-2">
                        <button
                            onClick={() => { setPaymentTarget(null); setPaymentAmount(''); setPaymentDesc('') }}
                            className="btn-secondary flex-1"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handlePayment}
                            disabled={!paymentAmount || Number(paymentAmount) <= 0 || payment.isPending}
                            className="btn-primary flex-1"
                        >
                            {payment.isPending ? <Spinner size="sm" /> : 'Registrar abono'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function ClientDebtRow({ client, onPay, onView }: {
    client: Client
    onPay: () => void
    onView: () => void
}) {
    const daysOverdue = client.last_purchase_at
        ? Math.floor((Date.now() - new Date(client.last_purchase_at).getTime()) / (1000 * 60 * 60 * 24))
        : null

    return (
        <div className="flex items-center gap-3 p-4">
            <Avatar name={client.name} size="sm" />
            <div className="flex-1 min-w-0 cursor-pointer" onClick={onView}>
                <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">{client.name}</p>
                    <Badge variant={STATUS_VARIANT[client.status as ClientStatus]}>
                        {STATUS_LABEL[client.status as ClientStatus]}
                    </Badge>
                </div>
                <p className="text-xs text-gray-400">
                    {client.phone ?? 'Sin teléfono'}
                    {daysOverdue !== null && ` · Última compra hace ${daysOverdue}d`}
                </p>
            </div>
            <div className="text-right shrink-0 mr-2">
                <p className="text-sm font-bold text-red-600">
                    ${Number(client.current_balance).toLocaleString()}
                </p>
                {client.credit_limit && Number(client.credit_limit) > 0 && (
                    <p className="text-xs text-gray-400">
                        límite ${Number(client.credit_limit).toLocaleString()}
                    </p>
                )}
            </div>
            <button
                onClick={onPay}
                className="btn-primary btn-sm shrink-0"
            >
                <CreditCard className="w-3.5 h-3.5" /> Abonar
            </button>
        </div>
    )
}

function SummaryCard({ icon, label, value, color }: {
    icon: React.ReactNode
    label: string
    value: string | number
    color: 'blue' | 'red' | 'green' | 'gray'
}) {
    const colors = {
        blue: 'text-brand-600 bg-brand-50',
        red: 'text-red-600 bg-red-50',
        green: 'text-green-600 bg-green-50',
        gray: 'text-gray-600 bg-gray-50',
    }
    const textColors = {
        blue: 'text-brand-700', red: 'text-red-700',
        green: 'text-green-700', gray: 'text-gray-900',
    }
    return (
        <div className="card p-4">
            <div className={`w-8 h-8 rounded-lg ${colors[color]} flex items-center justify-center mb-3`}>
                {icon}
            </div>
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={`text-lg font-bold ${textColors[color]}`}>{value}</p>
        </div>
    )
}