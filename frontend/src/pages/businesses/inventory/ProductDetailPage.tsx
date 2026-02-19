import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Pencil, Package, ArrowDownToLine, ArrowUpDown, ArrowRightLeft, Trash2 } from 'lucide-react'
import React from 'react'
import {
    useProduct, useDeleteProduct, useWarehouses,
    useRegisterEntry, useRegisterAdjustment, useRegisterTransfer,
} from '@/hooks/useInventory'
import { PageLoader, Badge, ConfirmDialog, ErrorAlert, Spinner, Modal } from '@/components/ui'
import { getApiErrorMessage, formatDate } from '@/utils'
import type { ProductPresentation, EntryForm, AdjustmentForm, TransferForm } from '@/types'
import { EntryModal } from './modals/EntryModal'
import { AdjustmentModal } from './modals/AdjustmentModal'
import { TransferModal } from './modals/TransferModal'
import { useLots } from '@/hooks/useInventory'
import { useMovements } from '@/hooks/useInventory'

type Tab = 'stock' | 'lots' | 'movements'

export function ProductDetailPage() {
    const { id, productId } = useParams<{ id: string; productId: string }>()
    const businessId = Number(id)
    const pId = Number(productId)
    const navigate = useNavigate()

    const [tab, setTab] = React.useState<Tab>('stock')
    const [deleteOpen, setDeleteOpen] = React.useState(false)
    const [entryOpen, setEntryOpen] = React.useState(false)
    const [adjustOpen, setAdjustOpen] = React.useState(false)
    const [transferOpen, setTransferOpen] = React.useState(false)
    const [selectedPresentation, setSelectedPresentation] = React.useState<ProductPresentation | null>(null)

    const { data: product, isLoading } = useProduct(businessId, pId)
    const { data: warehouses } = useWarehouses(businessId)
    const deleteProduct = useDeleteProduct(businessId)
    const registerEntry = useRegisterEntry(businessId)
    const registerAdjustment = useRegisterAdjustment(businessId)
    const registerTransfer = useRegisterTransfer(businessId)

    if (isLoading || !product) return <PageLoader />

    const openEntry = (pres: ProductPresentation) => { setSelectedPresentation(pres); setEntryOpen(true) }
    const openAdjust = (pres: ProductPresentation) => { setSelectedPresentation(pres); setAdjustOpen(true) }
    const openTransfer = (pres: ProductPresentation) => { setSelectedPresentation(pres); setTransferOpen(true) }

    return (
        <div className="p-6 md:p-8 max-w-4xl mx-auto animate-fade-in space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Link to={`/businesses/${id}/inventory`} className="btn-ghost btn-sm p-2">
                    <ArrowLeft className="w-4 h-4" />
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-bold text-gray-900">{product.name}</h1>
                        {product.is_perishable && <span className="text-sm text-orange-500">🕐 Perecedero</span>}
                    </div>
                    <p className="text-sm text-gray-400">
                        {product.category?.name ?? 'Sin categoría'}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Link to={`/businesses/${id}/inventory/products/${productId}/edit`} className="btn-secondary btn-sm">
                        <Pencil className="w-4 h-4" /> Editar
                    </Link>
                    <button onClick={() => setDeleteOpen(true)} className="btn-danger btn-sm">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Resumen stock total */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {product.presentations.map(pres => (
                    <div key={pres.id} className="card p-4">
                        <p className="text-xs text-gray-500 mb-1">{pres.name}</p>
                        <p className="text-lg font-bold text-gray-900">
                            {pres.stock.reduce((a, s) => a + Number(s.quantity), 0).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-400">${Number(pres.sale_price).toLocaleString()} c/u</p>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-100">
                <div className="flex gap-1">
                    {(['stock', 'lots', 'movements'] as Tab[]).map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={`px-4 py-2.5 text-sm font-medium border-b-2 capitalize transition-colors ${tab === t ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {t === 'stock' ? 'Stock por bodega' : t === 'lots' ? 'Lotes' : 'Movimientos'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab: Stock por bodega y presentación */}
            {tab === 'stock' && (
                <div className="space-y-4">
                    {product.presentations.map(pres => (
                        <div key={pres.id} className="card p-5">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <p className="text-sm font-semibold text-gray-800">{pres.name}</p>
                                    <p className="text-xs text-gray-400">
                                        Precio: ${Number(pres.sale_price).toLocaleString()} · Mín: {pres.min_stock}
                                        {pres.barcode && ` · ${pres.barcode}`}
                                    </p>
                                </div>
                                <div className="flex gap-1.5">
                                    <button onClick={() => openEntry(pres)} className="btn-primary btn-sm" title="Registrar entrada">
                                        <ArrowDownToLine className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => openAdjust(pres)} className="btn-secondary btn-sm" title="Ajustar">
                                        <ArrowUpDown className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => openTransfer(pres)} className="btn-secondary btn-sm" title="Transferir">
                                        <ArrowRightLeft className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                {pres.stock.length === 0 ? (
                                    <p className="text-xs text-gray-400">Sin stock registrado en ninguna bodega</p>
                                ) : pres.stock.map((s, i) => (
                                    <div key={i} className="flex justify-between items-center py-1.5 border-t border-gray-50">
                                        <span className="text-sm text-gray-600">{s.warehouse_name}</span>
                                        <span className={`text-sm font-medium ${Number(s.quantity) <= pres.min_stock && pres.min_stock > 0 ? 'text-yellow-600' : 'text-gray-800'}`}>
                                            {Number(s.quantity).toLocaleString()}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    {/* Agregar presentación */}
                    <Link
                        to={`/businesses/${id}/inventory/products/${productId}/edit`}
                        className="flex items-center gap-2 text-sm text-brand-600 hover:underline"
                    >
                        <Plus className="w-4 h-4" /> Agregar presentación
                    </Link>
                </div>
            )}

            {/* Tab: Lotes */}
            {tab === 'lots' && (
                <div className="space-y-4">
                    {product.presentations.map(pres => (
                        <div key={pres.id}>
                            <p className="text-sm font-semibold text-gray-700 mb-2">{pres.name}</p>
                            <LotsList businessId={businessId} productId={pId} presentation={pres} />
                        </div>
                    ))}
                </div>
            )}

            {/* Tab: Movimientos */}
            {tab === 'movements' && (
                <MovementsList businessId={businessId} presentations={product.presentations} />
            )}

            {/* Modales */}
            {selectedPresentation && (
                <>
                    <EntryModal
                        isOpen={entryOpen}
                        onClose={() => setEntryOpen(false)}
                        presentation={selectedPresentation}
                        warehouses={warehouses ?? []}
                        isPerishable={product.is_perishable}
                        onConfirm={(data) => registerEntry.mutate(data, { onSuccess: () => setEntryOpen(false) })}
                        loading={registerEntry.isPending}
                        error={registerEntry.error ? getApiErrorMessage(registerEntry.error) : undefined}
                    />
                    <AdjustmentModal
                        isOpen={adjustOpen}
                        onClose={() => setAdjustOpen(false)}
                        presentation={selectedPresentation}
                        warehouses={warehouses ?? []}
                        onConfirm={(data) => registerAdjustment.mutate(data, { onSuccess: () => setAdjustOpen(false) })}
                        loading={registerAdjustment.isPending}
                        error={registerAdjustment.error ? getApiErrorMessage(registerAdjustment.error) : undefined}
                    />
                    <TransferModal
                        isOpen={transferOpen}
                        onClose={() => setTransferOpen(false)}
                        presentation={selectedPresentation}
                        warehouses={warehouses ?? []}
                        onConfirm={(data) => registerTransfer.mutate(data, { onSuccess: () => setTransferOpen(false) })}
                        loading={registerTransfer.isPending}
                        error={registerTransfer.error ? getApiErrorMessage(registerTransfer.error) : undefined}
                    />
                </>
            )}

            <ConfirmDialog
                isOpen={deleteOpen}
                onClose={() => setDeleteOpen(false)}
                onConfirm={() => deleteProduct.mutate(pId, { onSuccess: () => navigate(`/businesses/${id}/inventory`) })}
                loading={deleteProduct.isPending}
                danger
                title="Eliminar producto"
                message={`¿Eliminar ${product.name}? Solo es posible si no tiene stock activo.`}
                confirmLabel="Eliminar"
            />
        </div>
    )
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function LotsList({ businessId, productId, presentation }: {
    businessId: number; productId: number; presentation: ProductPresentation
}) {
    const { data: lots } = useLots(businessId, productId, presentation.id)

    if (!lots?.length) return <p className="text-xs text-gray-400 mb-4">Sin lotes registrados</p>

    return (
        <div className="card divide-y divide-gray-100 mb-4">
            {lots.map((lot: any) => (
                <div key={lot.id} className="flex items-center justify-between p-3">
                    <div>
                        <p className="text-sm font-medium text-gray-800">
                            {lot.lot_number ? `Lote ${lot.lot_number}` : 'Sin número de lote'}
                        </p>
                        <p className="text-xs text-gray-400">
                            Llegó: {formatDate(lot.arrival_date)}
                            {lot.expiry_date && ` · Vence: ${formatDate(lot.expiry_date)}`}
                            {lot.cost_per_unit && ` · Costo: $${Number(lot.cost_per_unit).toLocaleString()}`}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className={`text-sm font-semibold ${lot.is_expired ? 'text-red-600' : lot.days_to_expiry !== null && lot.days_to_expiry <= 7 ? 'text-orange-500' : 'text-gray-800'}`}>
                            {Number(lot.remaining).toLocaleString()}
                        </p>
                        {lot.is_expired && <Badge variant="red">Vencido</Badge>}
                        {!lot.is_expired && lot.days_to_expiry !== null && lot.days_to_expiry <= 7 && (
                            <Badge variant="yellow">{lot.days_to_expiry}d</Badge>
                        )}
                    </div>
                </div>
            ))}
        </div>
    )
}

function MovementsList({ businessId, presentations }: {
    businessId: number; presentations: ProductPresentation[]
}) {
    const presentationId = presentations[0]?.id
    const { data: movements } = useMovements(businessId, { presentation_id: presentationId })

    const LABELS: Record<string, { label: string; color: string }> = {
        entry: { label: 'Entrada', color: 'text-green-600' },
        sale: { label: 'Venta', color: 'text-blue-600' },
        adjustment: { label: 'Ajuste', color: 'text-yellow-600' },
        transfer_out: { label: 'Transferencia salida', color: 'text-orange-500' },
        transfer_in: { label: 'Transferencia entrada', color: 'text-teal-600' },
        waste: { label: 'Merma', color: 'text-red-600' },
    }

    if (!movements?.length) return <p className="text-sm text-gray-400 text-center py-8">Sin movimientos registrados</p>

    return (
        <div className="card divide-y divide-gray-100">
            {movements.map(m => {
                const info = LABELS[m.movement_type] ?? { label: m.movement_type, color: 'text-gray-600' }
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
    )
}