import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Pencil, Plus, TrendingUp, CreditCard, ShoppingBag, Trash2 } from 'lucide-react'
import React from 'react'
import {
    useClient, useClientStats, useClientPurchases,
    useClientCreditMovements, useAddCreditMovement, useDeleteClient,
} from '@/hooks/useClients'
import {
    PageLoader, Avatar, Badge, Spinner, ErrorAlert, ConfirmDialog, Modal,
} from '@/components/ui'
import type { ClientStatus, CreditMovementForm } from '@/types'
import { formatDate, getApiErrorMessage } from '@/utils'

const STATUS_VARIANT: Record<ClientStatus, 'green' | 'gray' | 'red' | 'yellow'> = {
    active: 'green', inactive: 'gray', moroso: 'red', blocked: 'yellow',
}
const STATUS_LABEL: Record<ClientStatus, string> = {
    active: 'Activo', inactive: 'Inactivo', moroso: 'Moroso', blocked: 'Bloqueado',
}

type Tab = 'stats' | 'purchases' | 'credit'

export function ClientDetailPage() {
    const { id, clientId } = useParams<{ id: string; clientId: string }>()
    const businessId = Number(id)
    const cId = Number(clientId)
    const navigate = useNavigate()

    const [tab, setTab] = React.useState<Tab>('stats')
    const [showPayment, setShowPayment] = React.useState(false)
    const [showCharge, setShowCharge] = React.useState(false)
    const [deleteOpen, setDeleteOpen] = React.useState(false)

    const { data: client, isLoading } = useClient(businessId, cId)
    const { data: stats } = useClientStats(businessId, cId)
    const { data: purchases } = useClientPurchases(businessId, cId)
    const { data: creditMovements } = useClientCreditMovements(businessId, cId)
    const addMovement = useAddCreditMovement(businessId, cId)
    const deleteClient = useDeleteClient(businessId)

    if (isLoading || !client) return <PageLoader />

    const handleMovement = (type: 'charge' | 'payment', amount: string, description?: string) => {
        addMovement.mutate(
            { amount, movement_type: type, description },
            { onSuccess: () => { setShowPayment(false); setShowCharge(false) } }
        )
    }

    return (
        <div className="p-6 md:p-8 max-w-4xl mx-auto animate-fade-in space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Link to={`/businesses/${id}/clients`} className="btn-ghost btn-sm p-2">
                    <ArrowLeft className="w-4 h-4" />
                </Link>
                <div className="flex-1 flex items-center gap-3">
                    <Avatar name={client.name} size="lg" />
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold text-gray-900">{client.name}</h1>
                            <Badge variant={STATUS_VARIANT[client.status]}>{STATUS_LABEL[client.status]}</Badge>
                        </div>
                        <p className="text-sm text-gray-500">
                            {client.client_type === 'empresa' ? '🏢 Empresa' : '👤 Natural'}
                            {client.phone && ` · ${client.phone}`}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Link to={`/businesses/${id}/clients/${clientId}/edit`} className="btn-secondary btn-sm">
                        <Pencil className="w-4 h-4" /> Editar
                    </Link>
                    <button onClick={() => setDeleteOpen(true)} className="btn-danger btn-sm">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Tarjetas resumen */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Deuda actual" value={`$${Number(client.current_balance).toLocaleString()}`} color={Number(client.current_balance) > 0 ? 'red' : 'green'} />
                <StatCard label="Crédito disponible" value={`$${Number(stats?.available_credit ?? 0).toLocaleString()}`} color="blue" />
                <StatCard label="Total compras" value={stats?.total_purchases ?? 0} color="gray" />
                <StatCard label="Ticket promedio" value={`$${Number(stats?.average_ticket ?? 0).toLocaleString()}`} color="gray" />
            </div>

            {/* Acciones de cartera */}
            {Number(client.credit_limit) > 0 && (
                <div className="flex gap-2">
                    <button onClick={() => setShowPayment(true)} className="btn-primary btn-sm">
                        <CreditCard className="w-4 h-4" /> Registrar abono
                    </button>
                    <button onClick={() => setShowCharge(true)} className="btn-secondary btn-sm">
                        <Plus className="w-4 h-4" /> Cargar deuda
                    </button>
                </div>
            )}

            {/* Tabs */}
            <div className="border-b border-gray-100">
                <div className="flex gap-1">
                    {([
                        { key: 'stats', label: 'Información', icon: <TrendingUp className="w-4 h-4" /> },
                        { key: 'purchases', label: 'Compras', icon: <ShoppingBag className="w-4 h-4" /> },
                        { key: 'credit', label: 'Cartera', icon: <CreditCard className="w-4 h-4" /> },
                    ] as const).map(t => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.key
                                    ? 'border-brand-600 text-brand-700'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {t.icon}{t.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab: Información */}
            {tab === 'stats' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="card p-5 space-y-3">
                        <h3 className="text-sm font-semibold text-gray-800">Datos de contacto</h3>
                        <InfoRow label="Teléfono" value={client.phone} />
                        <InfoRow label="Email" value={client.email} />
                        <InfoRow label="Dirección" value={client.address} />
                        <InfoRow label="Documento / NIT" value={client.document_id} />
                    </div>
                    <div className="card p-5 space-y-3">
                        <h3 className="text-sm font-semibold text-gray-800">Crédito</h3>
                        <InfoRow label="Límite de crédito" value={`$${Number(client.credit_limit).toLocaleString()}`} />
                        <InfoRow label="Días de crédito" value={`${client.credit_days} días`} />
                        <InfoRow label="Método favorito" value={stats?.most_bought_payment_method} />
                        <InfoRow label="Última compra" value={client.last_purchase_at ? formatDate(client.last_purchase_at) : null} />
                    </div>
                    {client.notes && (
                        <div className="card p-5 sm:col-span-2">
                            <h3 className="text-sm font-semibold text-gray-800 mb-2">Notas internas</h3>
                            <p className="text-sm text-gray-600">{client.notes}</p>
                        </div>
                    )}
                </div>
            )}

            {/* Tab: Compras */}
            {tab === 'purchases' && (
                <div className="card divide-y divide-gray-100">
                    {!purchases?.length ? (
                        <p className="text-sm text-gray-400 text-center py-10">Sin compras registradas</p>
                    ) : purchases.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-4">
                            <div>
                                <p className="text-sm font-medium text-gray-800">${Number(p.total).toLocaleString()}</p>
                                <p className="text-xs text-gray-400">
                                    {p.payment_method ?? 'Sin método'} · {formatDate(p.created_at)}
                                </p>
                            </div>
                            {p.is_credit && <Badge variant="yellow">Fiado</Badge>}
                        </div>
                    ))}
                </div>
            )}

            {/* Tab: Cartera */}
            {tab === 'credit' && (
                <div className="card divide-y divide-gray-100">
                    {!creditMovements?.length ? (
                        <p className="text-sm text-gray-400 text-center py-10">Sin movimientos de cartera</p>
                    ) : creditMovements.map(m => (
                        <div key={m.id} className="flex items-center justify-between p-4">
                            <div>
                                <p className="text-sm text-gray-600">{m.description ?? (m.movement_type === 'payment' ? 'Abono' : 'Cargo')}</p>
                                <p className="text-xs text-gray-400">{formatDate(m.created_at)}</p>
                            </div>
                            <p className={`text-sm font-semibold ${m.movement_type === 'payment' ? 'text-green-600' : 'text-red-600'}`}>
                                {m.movement_type === 'payment' ? '-' : '+'}${Number(m.amount).toLocaleString()}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal abono */}
            <MovementModal
                isOpen={showPayment}
                onClose={() => setShowPayment(false)}
                title="Registrar abono"
                type="payment"
                onConfirm={(amount, desc) => handleMovement('payment', String(amount), desc)}
                loading={addMovement.isPending}
                error={addMovement.error ? getApiErrorMessage(addMovement.error) : undefined}
            />

            {/* Modal cargo */}
            <MovementModal
                isOpen={showCharge}
                onClose={() => setShowCharge(false)}
                title="Cargar deuda"
                type="charge"
                onConfirm={(amount, desc) => handleMovement('charge', String(amount), desc)}
                loading={addMovement.isPending}
                error={addMovement.error ? getApiErrorMessage(addMovement.error) : undefined}
            />

            <ConfirmDialog
                isOpen={deleteOpen}
                onClose={() => setDeleteOpen(false)}
                onConfirm={() => deleteClient.mutate(cId, { onSuccess: () => navigate(`/businesses/${id}/clients`) })}
                loading={deleteClient.isPending}
                danger
                title="Eliminar cliente"
                message={`¿Seguro que deseas eliminar a ${client.name}?`}
                confirmLabel="Eliminar"
            />
        </div>
    )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
    const colors: Record<string, string> = {
        red: 'text-red-600', green: 'text-green-600', blue: 'text-brand-600', gray: 'text-gray-800',
    }
    return (
        <div className="card p-4">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={`text-lg font-bold ${colors[color]}`}>{value}</p>
        </div>
    )
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
    return (
        <div className="flex justify-between text-sm">
            <span className="text-gray-400">{label}</span>
            <span className="text-gray-700 font-medium">{value ?? '—'}</span>
        </div>
    )
}

function MovementModal({ isOpen, onClose, title, type, onConfirm, loading, error }: {
    isOpen: boolean; onClose: () => void; title: string; type: 'charge' | 'payment'
    onConfirm: (amount: number, description?: string) => void; loading: boolean; error?: string
}) {
    const [amount, setAmount] = React.useState('')
    const [description, setDescription] = React.useState('')

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
            <div className="space-y-4">
                {error && <ErrorAlert message={error} />}
                <div className="space-y-1">
                    <label className="label">Monto</label>
                    <input
                        className="input"
                        type="number"
                        min="0"
                        placeholder="$0"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                    />
                </div>
                <div className="space-y-1">
                    <label className="label">Descripción (opcional)</label>
                    <input
                        className="input"
                        placeholder={type === 'payment' ? 'Ej: Pago en efectivo' : 'Ej: Compra de mercancía'}
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 pt-2">
                    <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
                    <button
                        onClick={() => onConfirm(Number(amount), description || undefined)}
                        disabled={!amount || Number(amount) <= 0 || loading}
                        className="btn-primary flex-1"
                    >
                        {loading ? <Spinner size="sm" /> : 'Confirmar'}
                    </button>
                </div>
            </div>
        </Modal>
    )
}