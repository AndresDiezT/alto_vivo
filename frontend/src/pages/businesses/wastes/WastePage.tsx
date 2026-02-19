import { useParams } from 'react-router-dom'
import { Plus, AlertTriangle, Zap, Package, DollarSign } from 'lucide-react'
import React from 'react'
import { useWasteRecords, useWasteSummary, useCreateWaste, useProcessExpired } from '@/hooks/useWaste'
import { useProducts, useWarehouses } from '@/hooks/useInventory'
import { useLots } from '@/hooks/useInventory'
import { PageLoader, EmptyState, Badge, Modal, ErrorAlert, Spinner, ConfirmDialog } from '@/components/ui'
import { formatDate, getApiErrorMessage } from '@/utils'
import type { WasteCause, WasteRecord } from '@/types/wastes.types'
import type { Product, ProductPresentation } from '@/types'

const CAUSE_LABELS: Record<WasteCause, { label: string; color: string; variant: 'red' | 'yellow' | 'gray' | 'brand' | 'green' }> = {
    damaged: { label: 'Dañado', color: 'text-orange-600', variant: 'yellow' },
    expired: { label: 'Vencido', color: 'text-red-600', variant: 'red' },
    theft: { label: 'Robo / Pérdida', color: 'text-red-700', variant: 'red' },
    inventory_error: { label: 'Error de inventario', color: 'text-gray-600', variant: 'gray' },
    sample: { label: 'Muestra / Regalo', color: 'text-brand-600', variant: 'brand' },
}

export function WastePage() {
    const { id } = useParams<{ id: string }>()
    const businessId = Number(id)

    const today = new Date().toISOString().split('T')[0]
    const monthStart = today.slice(0, 7) + '-01'

    const [createOpen, setCreateOpen] = React.useState(false)
    const [autoConfirm, setAutoConfirm] = React.useState(false)
    const [causeFilter, setCauseFilter] = React.useState('')
    const [dateFrom, setDateFrom] = React.useState(monthStart)
    const [dateTo, setDateTo] = React.useState(today)
    const [autoFilter, setAutoFilter] = React.useState<boolean | undefined>()

    // Form state
    const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null)
    const [selectedPresentation, setSelectedPresentation] = React.useState<ProductPresentation | null>(null)
    const [productSearch, setProductSearch] = React.useState('')
    const [form, setForm] = React.useState({
        warehouse_id: 0,
        lot_id: undefined as number | undefined,
        cause: 'damaged' as WasteCause,
        quantity: '',
        notes: '',
    })

    const { data: records, isLoading } = useWasteRecords(businessId, {
        cause: causeFilter || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        is_auto: autoFilter,
    })
    const { data: summary } = useWasteSummary(businessId, {
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
    })
    const { data: products } = useProducts(businessId, { search: productSearch || undefined })
    const { data: warehouses } = useWarehouses(businessId)
    const { data: lots } = useLots(
        businessId,
        selectedProduct?.id ?? 0,
        selectedPresentation?.id ?? 0
    )

    const createWaste = useCreateWaste(businessId)
    const processExpired = useProcessExpired(businessId)

    React.useEffect(() => {
        const def = warehouses?.find(w => w.is_default) ?? warehouses?.[0]
        if (def) setForm(p => ({ ...p, warehouse_id: def.id }))
    }, [warehouses])

    const resetForm = () => {
        setSelectedProduct(null)
        setSelectedPresentation(null)
        setProductSearch('')
        setForm(p => ({ ...p, lot_id: undefined, cause: 'damaged', quantity: '', notes: '' }))
    }

    const handleCreate = () => {
        if (!selectedPresentation) return
        createWaste.mutate({
            presentation_id: selectedPresentation.id,
            warehouse_id: form.warehouse_id,
            lot_id: form.lot_id,
            cause: form.cause,
            quantity: Number(form.quantity),
            notes: form.notes || undefined,
        }, {
            onSuccess: () => { setCreateOpen(false); resetForm() }
        })
    }

    const availableStock = selectedPresentation?.stock.find(
        s => s.warehouse_id === form.warehouse_id
    )

    if (isLoading) return <PageLoader />

    return (
        <div className="p-6 md:p-8 max-w-5xl mx-auto animate-fade-in space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Mermas</h1>
                    <p className="text-sm text-gray-500">Registro y control de pérdidas de inventario</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setAutoConfirm(true)}
                        className="btn-secondary btn-sm"
                    >
                        <Zap className="w-4 h-4" /> Procesar vencidos
                    </button>
                    <button onClick={() => setCreateOpen(true)} className="btn-primary btn-sm">
                        <Plus className="w-4 h-4" /> Registrar merma
                    </button>
                </div>
            </div>

            {/* Resumen del período */}
            {summary && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="card p-4">
                        <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center mb-3">
                            <Package className="w-4 h-4 text-red-500" />
                        </div>
                        <p className="text-xs text-gray-500 mb-1">Total registros</p>
                        <p className="text-lg font-bold text-gray-900">{summary.total_records}</p>
                    </div>
                    <div className="card p-4">
                        <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center mb-3">
                            <DollarSign className="w-4 h-4 text-red-500" />
                        </div>
                        <p className="text-xs text-gray-500 mb-1">Costo total perdido</p>
                        <p className="text-lg font-bold text-red-600">${Number(summary.total_cost).toLocaleString()}</p>
                    </div>
                    {summary.by_cause.slice(0, 2).map(bc => (
                        <div key={bc.cause} className="card p-4">
                            <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center mb-3">
                                <AlertTriangle className="w-4 h-4 text-gray-400" />
                            </div>
                            <p className="text-xs text-gray-500 mb-1">{CAUSE_LABELS[bc.cause].label}</p>
                            <p className="text-lg font-bold text-gray-900">{bc.count}</p>
                            <p className="text-xs text-gray-400">${Number(bc.total_cost).toLocaleString()}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Desglose por causa */}
            {summary && summary.by_cause.length > 0 && (
                <div className="card p-5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                        Desglose por causa — período seleccionado
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        {(Object.keys(CAUSE_LABELS) as WasteCause[]).map(cause => {
                            const data = summary.by_cause.find(b => b.cause === cause)
                            return (
                                <div key={cause} className="text-center p-3 bg-surface-50 rounded-xl">
                                    <p className="text-xs text-gray-400 mb-1">{CAUSE_LABELS[cause].label}</p>
                                    <p className="text-base font-bold text-gray-800">{data?.count ?? 0}</p>
                                    <p className="text-xs text-gray-400">${Number(data?.total_cost ?? 0).toLocaleString()}</p>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-3">
                <input type="date" className="input w-full sm:w-40" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                <input type="date" className="input w-full sm:w-40" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                <select className="input w-full sm:w-48" value={causeFilter} onChange={e => setCauseFilter(e.target.value)}>
                    <option value="">Todas las causas</option>
                    {(Object.entries(CAUSE_LABELS) as [WasteCause, typeof CAUSE_LABELS[WasteCause]][]).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                    ))}
                </select>
                <select
                    className="input w-full sm:w-40"
                    value={autoFilter === undefined ? '' : String(autoFilter)}
                    onChange={e => setAutoFilter(e.target.value === '' ? undefined : e.target.value === 'true')}
                >
                    <option value="">Todas</option>
                    <option value="false">Manuales</option>
                    <option value="true">Automáticas</option>
                </select>
            </div>

            {/* Lista */}
            {!records?.length ? (
                <EmptyState
                    icon="📋"
                    title="Sin mermas en este período"
                    description="Registra una merma o procesa los lotes vencidos automáticamente."
                />
            ) : (
                <div className="card divide-y divide-gray-100">
                    {records.map(record => (
                        <WasteRow key={record.id} record={record} />
                    ))}
                </div>
            )}

            {/* Modal registrar merma */}
            <Modal
                isOpen={createOpen}
                onClose={() => { setCreateOpen(false); resetForm() }}
                title="Registrar merma"
                size="md"
            >
                <div className="space-y-4">
                    {createWaste.error && <ErrorAlert message={getApiErrorMessage(createWaste.error)} />}

                    {/* Buscar producto */}
                    {!selectedPresentation ? (
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <label className="label">Buscar producto *</label>
                                <input
                                    className="input w-full"
                                    placeholder="Nombre del producto..."
                                    value={productSearch}
                                    onChange={e => setProductSearch(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            {productSearch && (
                                <div className="max-h-56 overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-50">
                                    {products?.flatMap(product =>
                                        product.presentations.filter(p => p.is_active).map(pres => (
                                            <button
                                                key={pres.id}
                                                onClick={() => {
                                                    setSelectedProduct(product)
                                                    setSelectedPresentation(pres)
                                                    setProductSearch('')
                                                }}
                                                className="flex items-center justify-between w-full px-4 py-3 hover:bg-surface-50 text-left"
                                            >
                                                <div>
                                                    <p className="text-sm font-medium text-gray-800">{product.name}</p>
                                                    <p className="text-xs text-gray-400">{pres.name}</p>
                                                </div>
                                                <p className="text-xs text-gray-400">
                                                    Stock: {pres.stock.reduce((a, s) => a + Number(s.quantity), 0)}
                                                </p>
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center justify-between p-3 bg-brand-50 rounded-xl">
                            <div>
                                <p className="text-sm font-medium text-brand-800">{selectedProduct?.name}</p>
                                <p className="text-xs text-brand-500">{selectedPresentation.name}</p>
                            </div>
                            <button
                                onClick={() => { setSelectedPresentation(null); setSelectedProduct(null) }}
                                className="text-xs text-brand-400 hover:text-brand-600"
                            >
                                Cambiar
                            </button>
                        </div>
                    )}

                    {selectedPresentation && (
                        <>
                            {/* Bodega */}
                            <div className="space-y-1">
                                <label className="label">Bodega *</label>
                                <select
                                    className="input"
                                    value={form.warehouse_id}
                                    onChange={e => setForm(p => ({ ...p, warehouse_id: Number(e.target.value), lot_id: undefined }))}
                                >
                                    {warehouses?.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                </select>
                                {availableStock && (
                                    <p className="text-xs text-gray-400">
                                        Stock disponible: {Number(availableStock.quantity).toLocaleString()}
                                    </p>
                                )}
                            </div>

                            {/* Lote (opcional) */}
                            {lots && lots.length > 0 && (
                                <div className="space-y-1">
                                    <label className="label">Lote afectado (opcional)</label>
                                    <select
                                        className="input"
                                        value={form.lot_id ?? ''}
                                        onChange={e => setForm(p => ({ ...p, lot_id: e.target.value ? Number(e.target.value) : undefined }))}
                                    >
                                        <option value="">Sin lote específico</option>
                                        {lots.map(lot => (
                                            <option key={lot.id} value={lot.id}>
                                                {lot.lot_number ?? 'Sin número'} — {Number(lot.remaining).toLocaleString()} restantes
                                                {lot.expiry_date && ` · Vence ${lot.expiry_date.split('T')[0]}`}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Causa */}
                            <div className="space-y-1">
                                <label className="label">Causa *</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(Object.entries(CAUSE_LABELS) as [WasteCause, typeof CAUSE_LABELS[WasteCause]][]).map(([k, v]) => (
                                        <button
                                            key={k}
                                            type="button"
                                            onClick={() => setForm(p => ({ ...p, cause: k }))}
                                            className={`p-2.5 rounded-xl border-2 text-xs font-medium transition-all ${form.cause === k
                                                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                                                    : 'border-gray-100 text-gray-500 hover:border-gray-200'
                                                }`}
                                        >
                                            {v.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Cantidad */}
                            <div className="space-y-1">
                                <label className="label">Cantidad *</label>
                                <input
                                    type="number" min="0.01" step="0.01" className="input"
                                    placeholder="0"
                                    value={form.quantity}
                                    onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))}
                                />
                            </div>

                            {/* Notas */}
                            <div className="space-y-1">
                                <label className="label">Notas (opcional)</label>
                                <input
                                    className="input"
                                    placeholder="Describe la causa de la merma..."
                                    value={form.notes}
                                    onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                                />
                            </div>
                        </>
                    )}

                    <div className="flex gap-2 pt-2">
                        <button onClick={() => { setCreateOpen(false); resetForm() }} className="btn-secondary flex-1">
                            Cancelar
                        </button>
                        <button
                            onClick={handleCreate}
                            disabled={!selectedPresentation || !form.quantity || !form.warehouse_id || createWaste.isPending}
                            className="btn-primary flex-1"
                        >
                            {createWaste.isPending ? <Spinner size="sm" /> : 'Registrar merma'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Confirm procesar vencidos */}
            <ConfirmDialog
                isOpen={autoConfirm}
                onClose={() => setAutoConfirm(false)}
                onConfirm={() => processExpired.mutate(undefined, {
                    onSuccess: (result) => {
                        setAutoConfirm(false)
                        if (result.processed === 0) alert('No hay lotes vencidos con stock disponible.')
                    }
                })}
                loading={processExpired.isPending}
                danger
                title="Procesar lotes vencidos"
                message="Esto generará mermas automáticas para todos los lotes vencidos que aún tengan inventario disponible. Esta acción no se puede deshacer."
                confirmLabel="Procesar vencidos"
            />
        </div>
    )
}

function WasteRow({ record }: { record: WasteRecord }) {
    const cause = CAUSE_LABELS[record.cause]
    return (
        <div className="flex items-center gap-4 p-4">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-900">
                        {record.product_name} — {record.presentation_name}
                    </p>
                    <Badge variant={cause.variant}>{cause.label}</Badge>
                    {record.is_auto && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Zap className="w-3 h-3" /> Auto
                        </span>
                    )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                    {record.warehouse_name}
                    {record.lot_number && ` · Lote ${record.lot_number}`}
                    {' · '}{formatDate(record.created_at)}
                    {record.creator_name && ` · ${record.creator_name}`}
                    {record.notes && ` · "${record.notes}"`}
                </p>
            </div>
            <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-gray-800">
                    {Number(record.quantity).toLocaleString()} und.
                </p>
                {record.total_cost && (
                    <p className="text-xs text-red-500">
                        ${Number(record.total_cost).toLocaleString()}
                    </p>
                )}
            </div>
        </div>
    )
}