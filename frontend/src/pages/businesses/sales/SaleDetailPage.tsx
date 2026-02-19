import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, XCircle } from 'lucide-react'
import React from 'react'
import { useSale, useCancelSale } from '@/hooks/useSales'
import { PageLoader, Badge, Modal, Spinner, ErrorAlert } from '@/components/ui'
import { formatDate, getApiErrorMessage } from '@/utils'
import type { SaleStatus } from '@/types/sales.types'

const STATUS_VARIANTS: Record<SaleStatus, 'green' | 'red' | 'yellow'> = {
    completed: 'green', cancelled: 'red', partial: 'yellow',
}

export function SaleDetailPage() {
    const { id, saleId } = useParams<{ id: string; saleId: string }>()
    const businessId = Number(id)

    const [cancelOpen, setCancelOpen] = React.useState(false)
    const [cancelReason, setCancelReason] = React.useState('')

    const { data: sale, isLoading } = useSale(businessId, Number(saleId))
    const cancelSale = useCancelSale(businessId)

    if (isLoading || !sale) return <PageLoader />

    const isCancelled = sale.status === 'cancelled'
    const creditPayments = sale.payments.filter(p => p.is_credit)
    const regularPayments = sale.payments.filter(p => !p.is_credit)

    return (
        <div className="p-6 md:p-8 max-w-3xl mx-auto animate-fade-in space-y-6">

            {/* Header */}
            <div className="flex items-center gap-3">
                <Link to={`/businesses/${id}/sales`} className="btn-ghost btn-sm p-2">
                    <ArrowLeft className="w-4 h-4" />
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-bold text-gray-900">Venta #{sale.id}</h1>
                        <Badge variant={STATUS_VARIANTS[sale.status]}>
                            {sale.status === 'completed' ? 'Completada'
                                : sale.status === 'cancelled' ? 'Cancelada' : 'Parcial'}
                        </Badge>
                    </div>
                    <p className="text-sm text-gray-400">{formatDate(sale.created_at)}</p>
                </div>
                {!isCancelled && (
                    <button onClick={() => setCancelOpen(true)} className="btn-danger btn-sm">
                        <XCircle className="w-4 h-4" /> Cancelar
                    </button>
                )}
            </div>

            {/* Info cancelación */}
            {isCancelled && sale.cancel_reason && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-700">
                    <p className="font-medium mb-1">Venta cancelada</p>
                    <p>{sale.cancel_reason}</p>
                    {sale.cancelled_at && (
                        <p className="text-xs mt-1 text-red-400">{formatDate(sale.cancelled_at)}</p>
                    )}
                </div>
            )}

            {/* Cliente, vendedor, notas */}
            <div className="card p-5 grid grid-cols-2 gap-4">
                <div>
                    <p className="text-xs text-gray-400 mb-0.5">Cliente</p>
                    {sale.client_id ? (
                        <Link to={`/businesses/${id}/clients/${sale.client_id}`}
                            className="text-sm font-medium text-brand-600 hover:underline">
                            {sale.client_name}
                        </Link>
                    ) : (
                        <p className="text-sm font-medium text-gray-700">Cliente ocasional</p>
                    )}
                </div>
                <div>
                    <p className="text-xs text-gray-400 mb-0.5">Vendedor</p>
                    <p className="text-sm font-medium text-gray-700">{sale.seller_name ?? '—'}</p>
                </div>
                <div className="col-span-2">
                    <p className="text-xs text-gray-400 mb-0.5">Notas</p>
                    <p className="text-sm text-gray-600">{sale.notes ?? '—'}</p>
                </div>
            </div>

            {/* Métodos de pago usados */}
            <div className="card p-5 space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Formas de pago
                </p>
                {sale.payments.length === 0 ? (
                    <p className="text-sm text-gray-400">Sin información de pago</p>
                ) : (
                    <div className="space-y-2">
                        {regularPayments.map(p => (
                            <div key={p.id} className="flex justify-between text-sm">
                                <span className="text-gray-600">
                                    💳 {p.payment_method_name ?? `Método #${p.payment_method_id}`}
                                </span>
                                <span className="font-medium text-gray-800">
                                    ${Number(p.amount).toLocaleString()}
                                </span>
                            </div>
                        ))}
                        {creditPayments.map(p => (
                            <div key={p.id} className="flex justify-between text-sm">
                                <span className="text-yellow-700">
                                    📒 {p.payment_method_name ?? 'Fiado'}
                                </span>
                                <span className="font-medium text-yellow-700">
                                    ${Number(p.amount).toLocaleString()}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Items */}
            <div className="card overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 bg-surface-50">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Productos</p>
                </div>
                <div className="divide-y divide-gray-100">
                    {sale.items.map(item => (
                        <div key={item.id} className="flex items-center justify-between px-5 py-3">
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-800">
                                    {item.product_name} — {item.presentation_name}
                                </p>
                                <p className="text-xs text-gray-400">
                                    {Number(item.quantity)} × ${Number(item.unit_price).toLocaleString()}
                                    {Number(item.discount) > 0 &&
                                        ` − $${Number(item.discount).toLocaleString()} desc.`}
                                </p>
                            </div>
                            <p className="text-sm font-semibold text-gray-800">
                                ${Number(item.subtotal).toLocaleString()}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Totales */}
                <div className="border-t border-gray-100 px-5 py-4 space-y-2">
                    <div className="flex justify-between text-sm text-gray-500">
                        <span>Subtotal</span>
                        <span>${Number(sale.subtotal).toLocaleString()}</span>
                    </div>
                    {Number(sale.discount) > 0 && (
                        <div className="flex justify-between text-sm text-gray-500">
                            <span>Descuento</span>
                            <span className="text-green-600">−${Number(sale.discount).toLocaleString()}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-base font-bold text-gray-900 pt-1 border-t border-gray-100">
                        <span>Total</span>
                        <span>${Number(sale.total).toLocaleString()}</span>
                    </div>
                    {Number(sale.amount_paid) > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                            <span>Pagado</span>
                            <span>${Number(sale.amount_paid).toLocaleString()}</span>
                        </div>
                    )}
                    {Number(sale.amount_credit) > 0 && (
                        <div className="flex justify-between text-sm text-yellow-600 font-medium">
                            <span>Fiado</span>
                            <span>${Number(sale.amount_credit).toLocaleString()}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal cancelar */}
            <Modal isOpen={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancelar venta" size="sm">
                <div className="space-y-4">
                    {cancelSale.error && <ErrorAlert message={getApiErrorMessage(cancelSale.error)} />}
                    <p className="text-sm text-gray-600">
                        Esta acción revertirá el stock y la deuda del cliente si aplica.
                    </p>
                    <div className="space-y-1">
                        <label className="label">Razón de cancelación *</label>
                        <input
                            className="input"
                            placeholder="Ej: Error en el pedido, cliente desistió..."
                            value={cancelReason}
                            onChange={e => setCancelReason(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2 pt-2">
                        <button onClick={() => setCancelOpen(false)} className="btn-secondary flex-1">
                            Cerrar
                        </button>
                        <button
                            onClick={() => cancelSale.mutate(
                                { saleId: sale.id, reason: cancelReason },
                                { onSuccess: () => setCancelOpen(false) }
                            )}
                            disabled={!cancelReason || cancelSale.isPending}
                            className="btn-danger flex-1"
                        >
                            {cancelSale.isPending ? <Spinner size="sm" /> : 'Cancelar venta'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}