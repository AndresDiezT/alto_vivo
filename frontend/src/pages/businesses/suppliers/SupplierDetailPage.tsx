import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Pencil, Trash2, ShoppingCart, CreditCard, Package, Plus, X } from 'lucide-react'
import React from 'react'
import {
    useSupplier, useSupplierStats, useSupplierProducts, useSupplierPurchases,
    useSupplierPayments, useAddSupplierPayment, useDeleteSupplier,
    useRemoveSupplierProduct, useAddSupplierProduct,
} from '@/hooks/useSuppliers'
import { useProducts } from '@/hooks/useInventory'
import { PageLoader, Badge, ConfirmDialog, Modal, ErrorAlert, Spinner } from '@/components/ui'
import { formatDate, getApiErrorMessage } from '@/utils'
import type { SupplierPurchase, SupplierPaymentStatus } from '@/types/suppliers.types'

const PAYMENT_STATUS: Record<SupplierPaymentStatus, { label: string; variant: 'green' | 'yellow' | 'red' }> = {
    paid: { label: 'Pagado', variant: 'green' },
    pending: { label: 'Pendiente', variant: 'yellow' },
    overdue: { label: 'Vencido', variant: 'red' },
}

type Tab = 'purchases' | 'payments' | 'products'

export function SupplierDetailPage() {
    const { id, supplierId } = useParams<{ id: string; supplierId: string }>()
    const businessId = Number(id)
    const sId = Number(supplierId)
    const navigate = useNavigate()

    const [tab, setTab] = React.useState<Tab>('purchases')
    const [deleteOpen, setDeleteOpen] = React.useState(false)
    const [paymentOpen, setPaymentOpen] = React.useState(false)
    const [paymentAmount, setPaymentAmount] = React.useState('')
    const [paymentDesc, setPaymentDesc] = React.useState('')
    const [addProductOpen, setAddProductOpen] = React.useState(false)
    const [selectedPresentation, setSelectedPresentation] = React.useState<number>(0)
    const [costPrice, setCostPrice] = React.useState('')
    const [productSearch, setProductSearch] = React.useState('')

    const { data: supplier, isLoading } = useSupplier(businessId, sId)
    const { data: stats } = useSupplierStats(businessId, sId)
    const { data: purchases } = useSupplierPurchases(businessId, sId)
    const { data: payments } = useSupplierPayments(businessId, sId)
    const { data: supplierProducts } = useSupplierProducts(businessId, sId)
    const { data: allProducts } = useProducts(businessId, { search: productSearch || undefined })
    const addPayment = useAddSupplierPayment(businessId, sId)
    const deleteSupplier = useDeleteSupplier(businessId)
    const removeProduct = useRemoveSupplierProduct(businessId, sId)
    const addProduct = useAddSupplierProduct(businessId, sId)

    if (isLoading || !supplier) return <PageLoader />

    const hasDebt = Number(supplier.current_balance) > 0

    const handlePayment = () => {
        addPayment.mutate(
            { amount: Number(paymentAmount), description: paymentDesc || undefined },
            { onSuccess: () => { setPaymentOpen(false); setPaymentAmount(''); setPaymentDesc('') } }
        )
    }

    const handleAddProduct = () => {
        if (!selectedPresentation) return
        addProduct.mutate(
            { presentation_id: selectedPresentation, cost_price: costPrice ? Number(costPrice) : undefined },
            { onSuccess: () => { setAddProductOpen(false); setSelectedPresentation(0); setCostPrice('') } }
        )
    }

    return (
        <div className="p-6 md:p-8 max-w-4xl mx-auto animate-fade-in space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Link to={`/businesses/${id}/suppliers`} className="btn-ghost btn-sm p-2">
                    <ArrowLeft className="w-4 h-4" />
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-bold text-gray-900">{supplier.name}</h1>
                        <Badge variant={supplier.status === 'active' ? 'green' : 'gray'}>
                            {supplier.status === 'active' ? 'Activo' : 'Inactivo'}
                        </Badge>
                    </div>
                    <p className="text-sm text-gray-400">
                        {supplier.contact_name ?? supplier.phone ?? 'Sin contacto registrado'}
                    </p>
                </div>
                <div className="flex gap-2">
                    {hasDebt && (
                        <button onClick={() => setPaymentOpen(true)} className="btn-primary btn-sm">
                            <CreditCard className="w-4 h-4" /> Pagar deuda
                        </button>
                    )}
                    <Link
                        to={`/businesses/${id}/suppliers/${supplierId}/purchase`}
                        className="btn-secondary btn-sm"
                    >
                        <ShoppingCart className="w-4 h-4" /> Nueva compra
                    </Link>
                    <Link to={`/businesses/${id}/suppliers/${supplierId}/edit`} className="btn-secondary btn-sm">
                        <Pencil className="w-4 h-4" />
                    </Link>
                    <button onClick={() => setDeleteOpen(true)} className="btn-danger btn-sm">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Info del proveedor */}
            <div className="card p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: 'Teléfono', value: supplier.phone ?? '—' },
                    { label: 'Email', value: supplier.email ?? '—' },
                    { label: 'NIT / CC', value: supplier.document_id ?? '—' },
                    { label: 'Dirección', value: supplier.address ?? '—' },
                ].map(({ label, value }) => (
                    <div key={label}>
                        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                        <p className="text-sm text-gray-700">{value}</p>
                    </div>
                ))}
            </div>

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="card p-4">
                        <p className="text-xs text-gray-400 mb-1">Compras realizadas</p>
                        <p className="text-lg font-bold text-gray-900">{stats.total_purchases}</p>
                    </div>
                    <div className="card p-4">
                        <p className="text-xs text-gray-400 mb-1">Total comprado</p>
                        <p className="text-lg font-bold text-gray-900">${Number(stats.total_spent).toLocaleString()}</p>
                    </div>
                    <div className="card p-4">
                        <p className="text-xs text-gray-400 mb-1">Deuda actual</p>
                        <p className={`text-lg font-bold ${hasDebt ? 'text-red-600' : 'text-green-600'}`}>
                            ${Number(supplier.current_balance).toLocaleString()}
                        </p>
                    </div>
                    <div className="card p-4">
                        <p className="text-xs text-gray-400 mb-1">Promedio por compra</p>
                        <p className="text-lg font-bold text-gray-900">${Number(stats.average_purchase).toLocaleString()}</p>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="border-b border-gray-100">
                <div className="flex gap-1">
                    {([
                        { key: 'purchases', label: 'Compras', count: purchases?.length },
                        { key: 'payments', label: 'Pagos', count: payments?.length },
                        { key: 'products', label: 'Productos', count: supplierProducts?.length },
                    ] as const).map(t => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {t.label}
                            {(t.count ?? 0) > 0 && (
                                <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                                    {t.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab: Compras */}
            {tab === 'purchases' && (
                <div className="space-y-3">
                    {!purchases?.length ? (
                        <div className="text-center py-10 text-gray-400 text-sm">Sin compras registradas</div>
                    ) : purchases.map(purchase => (
                        <PurchaseCard key={purchase.id} purchase={purchase} />
                    ))}
                </div>
            )}

            {/* Tab: Pagos */}
            {tab === 'payments' && (
                <div className="card divide-y divide-gray-100">
                    {!payments?.length ? (
                        <p className="text-sm text-gray-400 text-center py-8">Sin pagos registrados</p>
                    ) : payments.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-4">
                            <div>
                                <p className="text-sm font-medium text-gray-800">
                                    {p.description ?? 'Pago a proveedor'}
                                </p>
                                <p className="text-xs text-gray-400">{formatDate(p.created_at)}</p>
                            </div>
                            <p className="text-sm font-semibold text-green-600">
                                +${Number(p.amount).toLocaleString()}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {/* Tab: Productos */}
            {tab === 'products' && (
                <div className="space-y-3">
                    <button onClick={() => setAddProductOpen(true)} className="btn-secondary btn-sm">
                        <Plus className="w-4 h-4" /> Asociar producto
                    </button>
                    <div className="card divide-y divide-gray-100">
                        {!supplierProducts?.length ? (
                            <p className="text-sm text-gray-400 text-center py-8">Sin productos asociados</p>
                        ) : supplierProducts.map(sp => (
                            <div key={sp.id} className="flex items-center justify-between p-4">
                                <div>
                                    <p className="text-sm font-medium text-gray-800">{sp.product_name}</p>
                                    <p className="text-xs text-gray-400">{sp.presentation_name}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    {sp.cost_price && (
                                        <p className="text-sm text-gray-600">${Number(sp.cost_price).toLocaleString()}</p>
                                    )}
                                    <button
                                        onClick={() => removeProduct.mutate(sp.id)}
                                        className="text-red-400 hover:text-red-600"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Modal pago */}
            <Modal
                isOpen={paymentOpen}
                onClose={() => { setPaymentOpen(false); setPaymentAmount('') }}
                title="Pagar deuda al proveedor"
                size="sm"
            >
                <div className="space-y-4">
                    {addPayment.error && <ErrorAlert message={getApiErrorMessage(addPayment.error)} />}
                    <div className="p-3 bg-red-50 rounded-xl">
                        <p className="text-xs text-gray-500">Deuda actual</p>
                        <p className="text-lg font-bold text-red-600">
                            ${Number(supplier.current_balance).toLocaleString()}
                        </p>
                    </div>
                    <div className="space-y-1">
                        <label className="label">Monto del pago *</label>
                        <input
                            type="number" min="0.01" className="input text-lg"
                            placeholder="$0" autoFocus
                            value={paymentAmount}
                            onChange={e => setPaymentAmount(e.target.value)}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="label">Descripción (opcional)</label>
                        <input
                            className="input" placeholder="Ej: Transferencia bancaria..."
                            value={paymentDesc}
                            onChange={e => setPaymentDesc(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setPaymentAmount(String(Number(supplier.current_balance)))} className="btn-secondary btn-sm flex-1 text-xs">
                            Pago total
                        </button>
                        <button onClick={() => setPaymentAmount(String(Math.floor(Number(supplier.current_balance) / 2)))} className="btn-secondary btn-sm flex-1 text-xs">
                            50%
                        </button>
                    </div>
                    <div className="flex gap-2 pt-2">
                        <button onClick={() => setPaymentOpen(false)} className="btn-secondary flex-1">Cancelar</button>
                        <button
                            onClick={handlePayment}
                            disabled={!paymentAmount || Number(paymentAmount) <= 0 || addPayment.isPending}
                            className="btn-primary flex-1"
                        >
                            {addPayment.isPending ? <Spinner size="sm" /> : 'Registrar pago'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Modal asociar producto */}
            <Modal
                isOpen={addProductOpen}
                onClose={() => setAddProductOpen(false)}
                title="Asociar producto al proveedor"
                size="md"
            >
                <div className="space-y-4">
                    {addProduct.error && <ErrorAlert message={getApiErrorMessage(addProduct.error)} />}
                    <div className="relative">
                        <input
                            className="input w-full"
                            placeholder="Buscar producto..."
                            value={productSearch}
                            onChange={e => setProductSearch(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div className="max-h-56 overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-50">
                        {allProducts?.flatMap(product =>
                            product.presentations.filter(p => p.is_active).map(pres => (
                                <button
                                    key={pres.id}
                                    onClick={() => setSelectedPresentation(pres.id)}
                                    className={`flex items-center justify-between w-full px-4 py-2.5 text-left transition-colors ${selectedPresentation === pres.id ? 'bg-brand-50' : 'hover:bg-surface-50'
                                        }`}
                                >
                                    <div>
                                        <p className="text-sm font-medium text-gray-800">{product.name}</p>
                                        <p className="text-xs text-gray-400">{pres.name}</p>
                                    </div>
                                    {selectedPresentation === pres.id && (
                                        <span className="text-xs text-brand-600 font-medium">Seleccionado</span>
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                    <div className="space-y-1">
                        <label className="label">Precio de costo habitual (opcional)</label>
                        <input
                            type="number" min="0" className="input"
                            placeholder="$0"
                            value={costPrice}
                            onChange={e => setCostPrice(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2 pt-2">
                        <button onClick={() => setAddProductOpen(false)} className="btn-secondary flex-1">Cancelar</button>
                        <button
                            onClick={handleAddProduct}
                            disabled={!selectedPresentation || addProduct.isPending}
                            className="btn-primary flex-1"
                        >
                            {addProduct.isPending ? <Spinner size="sm" /> : 'Asociar'}
                        </button>
                    </div>
                </div>
            </Modal>

            <ConfirmDialog
                isOpen={deleteOpen}
                onClose={() => setDeleteOpen(false)}
                onConfirm={() => deleteSupplier.mutate(sId, { onSuccess: () => navigate(`/businesses/${id}/suppliers`) })}
                loading={deleteSupplier.isPending}
                danger
                title="Eliminar proveedor"
                message={`¿Eliminar a ${supplier.name}? Solo es posible si no tiene deuda pendiente.`}
                confirmLabel="Eliminar"
            />
        </div>
    )
}

function PurchaseCard({ purchase }: { purchase: SupplierPurchase }) {
    const [open, setOpen] = React.useState(false)
    const status = PAYMENT_STATUS[purchase.payment_status]

    return (
        <div className="card overflow-hidden">
            <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-50"
                onClick={() => setOpen(p => !p)}
            >
                <div>
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-800">Compra #{purchase.id}</p>
                        <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                    <p className="text-xs text-gray-400">
                        {formatDate(purchase.created_at)}
                        {purchase.expected_payment_date && ` · Pago esperado: ${formatDate(purchase.expected_payment_date)}`}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">${Number(purchase.total).toLocaleString()}</p>
                    {Number(purchase.amount_credit) > 0 && (
                        <p className="text-xs text-red-500">Debe ${Number(purchase.amount_credit).toLocaleString()}</p>
                    )}
                </div>
            </div>
            {open && (
                <div className="border-t border-gray-100 divide-y divide-gray-50">
                    {purchase.items.map(item => (
                        <div key={item.id} className="flex items-center justify-between px-5 py-2.5">
                            <div>
                                <p className="text-sm text-gray-700">{item.product_name} — {item.presentation_name}</p>
                                <p className="text-xs text-gray-400">
                                    {Number(item.quantity)} × ${Number(item.cost_per_unit).toLocaleString()}
                                    {item.lot_number && ` · Lote ${item.lot_number}`}
                                </p>
                            </div>
                            <p className="text-sm font-medium text-gray-800">${Number(item.subtotal).toLocaleString()}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}