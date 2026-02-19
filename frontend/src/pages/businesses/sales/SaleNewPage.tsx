import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Search, Plus, Minus, Trash2, ShoppingCart, User, X, CreditCard } from 'lucide-react'
import React from 'react'
import { useCreateSale, usePaymentMethods } from '@/hooks/useSales'
import { useProducts, useWarehouses } from '@/hooks/useInventory'
import { useClients } from '@/hooks/useClients'
import { ErrorAlert, Spinner, Modal, PageLoader } from '@/components/ui'
import { getApiErrorMessage } from '@/utils'
import type { CartItem, CartPayment, PaymentMethod } from '@/types/sales.types'
import type { Product, ProductPresentation } from '@/types'

export function SaleNewPage() {
    const { id } = useParams<{ id: string }>()
    const businessId = Number(id)
    const navigate = useNavigate()

    // Carrito
    const [items, setItems] = React.useState<CartItem[]>([])
    const [clientId, setClientId] = React.useState<number | undefined>()
    const [warehouseId, setWarehouseId] = React.useState<number>(0)
    const [payments, setPayments] = React.useState<CartPayment[]>([])
    const [discount, setDiscount] = React.useState('0')
    const [notes, setNotes] = React.useState('')

    // UI
    const [productSearch, setProductSearch] = React.useState('')
    const [clientSearch, setClientSearch] = React.useState('')
    const [showClientModal, setShowClientModal] = React.useState(false)

    const { data: products } = useProducts(businessId, { search: productSearch || undefined })
    const { data: warehouses } = useWarehouses(businessId)
    const { data: clients } = useClients(businessId, { search: clientSearch || undefined })
    const { data: paymentMethods } = usePaymentMethods(businessId)
    const createSale = useCreateSale(businessId)

    // Bodega por defecto
    React.useEffect(() => {
        const def = warehouses?.find(w => w.is_default) ?? warehouses?.[0]
        if (def && !warehouseId) setWarehouseId(def.id)
    }, [warehouses])

    // Totales
    const subtotal = items.reduce((acc, i) => acc + (i.quantity * i.unit_price) - i.discount, 0)
    const totalDiscount = Number(discount) || 0
    const total = Math.max(0, subtotal - totalDiscount)
    const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0)
    const remaining = Math.max(0, total - totalPaid)
    const hasCredit = payments.some(p => p.method.is_credit)
    const isBalanced = Math.abs(totalPaid - total) < 0.01

    // ── Carrito ───────────────────────────────────────────────────────────────

    const addItem = (pres: ProductPresentation, product: Product) => {
        const stockEntry = pres.stock.find(s => s.warehouse_id === warehouseId)
        setItems(prev => {
            const idx = prev.findIndex(i => i.presentation_id === pres.id)
            if (idx >= 0) {
                return prev.map((item, i) => i === idx ? { ...item, quantity: item.quantity + 1 } : item)
            }
            return [...prev, {
                presentation_id: pres.id,
                product_name: product.name,
                presentation_name: pres.name,
                quantity: 1,
                unit_price: Number(pres.sale_price),
                discount: 0,
                available_stock: stockEntry ? Number(stockEntry.quantity) : 0,
            }]
        })
        setProductSearch('')
    }

    const updateQty = (idx: number, qty: number) => {
        if (qty <= 0) return setItems(prev => prev.filter((_, i) => i !== idx))
        setItems(prev => prev.map((item, i) => i === idx ? { ...item, quantity: qty } : item))
    }

    const updatePrice = (idx: number, price: number) => {
        setItems(prev => prev.map((item, i) => i === idx ? { ...item, unit_price: price } : item))
    }

    const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx))

    // ── Pagos ─────────────────────────────────────────────────────────────────

    const addPayment = (method: PaymentMethod) => {
        // Un método solo puede aparecer una vez
        if (payments.some(p => p.method.id === method.id)) return
        // Crédito requiere cliente
        if (method.is_credit && !clientId) return
        // Por defecto asignar el remanente pendiente
        const amount = Math.max(0, total - totalPaid)
        setPayments(prev => [...prev, { method, amount }])
    }

    const updatePaymentAmount = (idx: number, amount: number) => {
        setPayments(prev => prev.map((p, i) => i === idx ? { ...p, amount: Math.max(0, amount) } : p))
    }

    const removePayment = (idx: number) => {
        setPayments(prev => prev.filter((_, i) => i !== idx))
    }

    /** Asigna automáticamente el total al único método si solo hay uno */
    const autoFillSingle = (method: PaymentMethod) => {
        if (payments.length === 0) {
            setPayments([{ method, amount: total }])
        } else {
            addPayment(method)
        }
    }

    const selectedClient = clients?.find(c => c.id === clientId)

    // Cuando se quita el cliente, eliminar pagos de crédito
    const handleRemoveClient = () => {
        setClientId(undefined)
        setPayments(prev => prev.filter(p => !p.method.is_credit))
    }

    const handleSubmit = () => {
        if (!items.length || !warehouseId || !isBalanced) return
        createSale.mutate({
            client_id: clientId,
            warehouse_id: warehouseId,
            items: items.map(i => ({
                presentation_id: i.presentation_id,
                quantity: i.quantity,
                unit_price: i.unit_price,
                discount: i.discount,
            })),
            payments: payments.map(p => ({
                payment_method_id: p.method.id,
                amount: p.amount,
            })),
            discount: totalDiscount,
            notes: notes || undefined,
        }, {
            onSuccess: (sale) => navigate(`/businesses/${id}/sales/${sale.id}`),
        })
    }

    const canSubmit = items.length > 0 && warehouseId && payments.length > 0 && isBalanced &&
        (!hasCredit || !!clientId)

    // Métodos disponibles (que aún no han sido agregados)
    const availableMethods = (paymentMethods ?? []).filter(
        m => !payments.some(p => p.method.id === m.id)
    )


    // ── Guard: sin métodos de pago configurados ───────────────────────────────
    if (paymentMethods !== undefined && paymentMethods.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-56px)] p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                    <CreditCard className="w-8 h-8 text-gray-400" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 mb-1">
                    Sin métodos de pago configurados
                </h2>
                <p className="text-sm text-gray-500 max-w-xs mb-6">
                    Necesitas al menos un método de pago para poder registrar ventas.
                </p>
                <div className="flex gap-3">
                    <Link to={`/businesses/${id}/sales`} className="btn-secondary btn-sm">Volver</Link>
                    <Link to={`/businesses/${id}/settings/payment-methods`} className="btn-primary btn-sm">
                        <Plus className="w-4 h-4" /> Crear método de pago
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-56px)] overflow-hidden">

            {/* ── Panel izquierdo — productos ── */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 border-r border-gray-100">
                <div className="flex items-center gap-3">
                    <Link to={`/businesses/${id}/sales`} className="btn-ghost btn-sm p-2">
                        <ArrowLeft className="w-4 h-4" />
                    </Link>
                    <h1 className="text-lg font-bold text-gray-900">Nueva venta</h1>
                </div>

                {/* Bodega */}
                {warehouses && warehouses.length > 1 && (
                    <select className="input w-full sm:w-60" value={warehouseId}
                        onChange={e => setWarehouseId(Number(e.target.value))}>
                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                )}

                {/* Buscador */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        className="input pl-9 w-full"
                        placeholder="Buscar producto para agregar..."
                        value={productSearch}
                        onChange={e => setProductSearch(e.target.value)}
                        autoFocus
                    />
                </div>

                {/* Resultados */}
                {productSearch && (
                    <div className="card divide-y divide-gray-100 max-h-64 overflow-y-auto">
                        {!products?.length ? (
                            <p className="text-sm text-gray-400 text-center py-4">Sin resultados</p>
                        ) : products.flatMap(product =>
                            product.presentations.filter(p => p.is_active).map(pres => {
                                const stock = pres.stock.find(s => s.warehouse_id === warehouseId)
                                const qty = stock ? Number(stock.quantity) : 0
                                return (
                                    <button
                                        key={pres.id}
                                        onClick={() => addItem(pres, product)}
                                        disabled={qty <= 0}
                                        className="flex items-center justify-between w-full px-4 py-3 hover:bg-surface-50 transition-colors disabled:opacity-40 text-left"
                                    >
                                        <div>
                                            <p className="text-sm font-medium text-gray-800">{product.name}</p>
                                            <p className="text-xs text-gray-400">{pres.name} · Stock: {qty}</p>
                                        </div>
                                        <p className="text-sm font-semibold text-gray-700">
                                            ${Number(pres.sale_price).toLocaleString()}
                                        </p>
                                    </button>
                                )
                            })
                        )}
                    </div>
                )}

                {/* Carrito */}
                {items.length > 0 ? (
                    <div className="space-y-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Productos en la venta
                        </p>
                        {items.map((item, idx) => (
                            <div key={item.presentation_id} className="card p-3 flex items-center gap-3">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-800 truncate">
                                        {item.product_name} — {item.presentation_name}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs text-gray-400">$</span>
                                        <input
                                            type="number"
                                            className="input py-0.5 px-2 text-xs w-24"
                                            value={item.unit_price}
                                            onChange={e => updatePrice(idx, Number(e.target.value))}
                                            min="0"
                                        />
                                        <span className="text-xs text-gray-400">
                                            Stock: {item.available_stock}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <button onClick={() => updateQty(idx, item.quantity - 1)}
                                        className="btn-ghost btn-sm p-1">
                                        <Minus className="w-3.5 h-3.5" />
                                    </button>
                                    <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                                    <button
                                        onClick={() => updateQty(idx, item.quantity + 1)}
                                        disabled={item.quantity >= item.available_stock}
                                        className="btn-ghost btn-sm p-1">
                                        <Plus className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                <p className="text-sm font-semibold text-gray-800 w-20 text-right shrink-0">
                                    ${((item.quantity * item.unit_price) - item.discount).toLocaleString()}
                                </p>
                                <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400">
                        <ShoppingCart className="w-10 h-10 mb-3 opacity-30" />
                        <p className="text-sm">Busca un producto para agregar a la venta</p>
                    </div>
                )}
            </div>

            {/* ── Panel derecho — cobro ── */}
            <div className="w-full lg:w-96 bg-white border-t lg:border-t-0 lg:border-l border-gray-100 flex flex-col">
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">

                    {/* Cliente (opcional) */}
                    <div>
                        <p className="label mb-2">Cliente <span className="text-gray-400 font-normal">(opcional)</span></p>
                        {selectedClient ? (
                            <div className="flex items-center justify-between p-3 bg-brand-50 rounded-xl">
                                <div>
                                    <p className="text-sm font-medium text-brand-800">{selectedClient.name}</p>
                                    <p className="text-xs text-brand-500">
                                        Deuda: ${Number(selectedClient.current_balance).toLocaleString()}
                                    </p>
                                </div>
                                <button onClick={handleRemoveClient}
                                    className="text-brand-400 hover:text-brand-600 text-xs">
                                    Quitar
                                </button>
                            </div>
                        ) : (
                            <button onClick={() => setShowClientModal(true)}
                                className="btn-secondary btn-sm w-full">
                                <User className="w-4 h-4" /> Seleccionar cliente
                            </button>
                        )}
                    </div>

                    {/* Descuento */}
                    <div className="space-y-1">
                        <label className="label">Descuento global ($)</label>
                        <input type="number" min="0" className="input"
                            value={discount} onChange={e => setDiscount(e.target.value)} />
                    </div>

                    {/* Métodos de pago agregados */}
                    <div className="space-y-2">
                        <p className="label">Formas de pago</p>

                        {payments.length === 0 && (
                            <p className="text-xs text-gray-400">
                                Agrega al menos un método de pago
                            </p>
                        )}

                        {payments.map((p, idx) => (
                            <div key={p.method.id}
                                className="flex items-center gap-2 p-2.5 rounded-xl border border-gray-100 bg-surface-50">
                                <span className="text-sm font-medium text-gray-700 flex-1 truncate">
                                    {p.method.is_credit ? '📒' : '💳'} {p.method.name}
                                    {p.method.is_credit && !clientId && (
                                        <span className="text-xs text-yellow-500 ml-1">(requiere cliente)</span>
                                    )}
                                </span>
                                <div className="flex items-center gap-1">
                                    <span className="text-xs text-gray-400">$</span>
                                    <input
                                        type="number"
                                        min="0"
                                        className="input py-0.5 px-2 text-sm w-24 text-right"
                                        value={p.amount}
                                        onChange={e => updatePaymentAmount(idx, Number(e.target.value))}
                                    />
                                </div>
                                <button onClick={() => removePayment(idx)}
                                    className="text-gray-300 hover:text-red-400 transition-colors">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}

                        {/* Indicador de saldo pendiente */}
                        {payments.length > 0 && !isBalanced && (
                            <div className={`text-xs font-medium px-1 ${remaining > 0 ? 'text-yellow-600' : 'text-red-500'}`}>
                                {remaining > 0
                                    ? `Falta asignar: $${remaining.toLocaleString()}`
                                    : `Excedido en: $${Math.abs(total - totalPaid).toLocaleString()}`
                                }
                            </div>
                        )}

                        {/* Botones de métodos disponibles */}
                        {availableMethods.length > 0 && items.length > 0 && (
                            <div className="pt-1">
                                <p className="text-xs text-gray-400 mb-2">Agregar método:</p>
                                <div className="flex flex-wrap gap-2">
                                    {availableMethods.map(m => (
                                        <button
                                            key={m.id}
                                            onClick={() => autoFillSingle(m)}
                                            disabled={m.is_credit && !clientId}
                                            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600
                                                       hover:border-brand-300 hover:text-brand-700 hover:bg-brand-50
                                                       disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                        >
                                            {m.is_credit ? '📒' : '💳'} {m.name}
                                        </button>
                                    ))}
                                </div>
                                {availableMethods.some(m => m.is_credit) && !clientId && (
                                    <p className="text-xs text-yellow-600 mt-1">
                                        Selecciona un cliente para habilitar el fiado
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Notas */}
                    <div className="space-y-1">
                        <label className="label">Notas (opcional)</label>
                        <input className="input" placeholder="Observaciones..."
                            value={notes} onChange={e => setNotes(e.target.value)} />
                    </div>

                    {createSale.error && (
                        <ErrorAlert message={getApiErrorMessage(createSale.error)} />
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-100 p-4 md:p-6 space-y-3 bg-white">
                    <div className="space-y-1.5">
                        <div className="flex justify-between text-sm text-gray-500">
                            <span>Subtotal</span>
                            <span>${subtotal.toLocaleString()}</span>
                        </div>
                        {totalDiscount > 0 && (
                            <div className="flex justify-between text-sm text-green-600">
                                <span>Descuento</span>
                                <span>−${totalDiscount.toLocaleString()}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-base font-bold text-gray-900 pt-1 border-t border-gray-100">
                            <span>Total</span>
                            <span>${total.toLocaleString()}</span>
                        </div>
                        {payments.length > 0 && (
                            <div className="flex justify-between text-sm text-gray-400">
                                <span>Asignado</span>
                                <span className={isBalanced ? 'text-green-600' : 'text-yellow-600'}>
                                    ${totalPaid.toLocaleString()}
                                </span>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={!canSubmit || createSale.isPending}
                        className="btn-primary w-full text-base py-3"
                    >
                        {createSale.isPending
                            ? <Spinner size="sm" />
                            : `Registrar venta · $${total.toLocaleString()}`
                        }
                    </button>
                </div>
            </div>

            {/* Modal selección de cliente */}
            <Modal isOpen={showClientModal} onClose={() => setShowClientModal(false)}
                title="Seleccionar cliente" size="md">
                <div className="space-y-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            className="input pl-9 w-full"
                            placeholder="Buscar cliente..."
                            value={clientSearch}
                            onChange={e => setClientSearch(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
                        {clients?.map(client => (
                            <button
                                key={client.id}
                                onClick={() => { setClientId(client.id); setShowClientModal(false) }}
                                className="flex items-center justify-between w-full px-3 py-3 hover:bg-surface-50 text-left transition-colors"
                            >
                                <div>
                                    <p className="text-sm font-medium text-gray-800">{client.name}</p>
                                    <p className="text-xs text-gray-400">{client.phone ?? 'Sin teléfono'}</p>
                                </div>
                                {Number(client.current_balance) > 0 && (
                                    <p className="text-xs text-yellow-600 font-medium">
                                        Debe ${Number(client.current_balance).toLocaleString()}
                                    </p>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </Modal>
        </div>
    )
}