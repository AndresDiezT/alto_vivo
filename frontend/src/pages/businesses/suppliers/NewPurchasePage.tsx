import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Search, Plus, Minus, Trash2 } from 'lucide-react'
import React from 'react'
import { useSupplier, useSupplierProducts, useCreatePurchase } from '@/hooks/useSuppliers'
import { useProducts, useWarehouses } from '@/hooks/useInventory'
import { PageLoader, ErrorAlert, Spinner } from '@/components/ui'
import { getApiErrorMessage } from '@/utils'
import type { PurchaseItemForm } from '@/types/suppliers.types'

export function NewPurchasePage() {
    const { id, supplierId } = useParams<{ id: string; supplierId: string }>()
    const businessId = Number(id)
    const sId = Number(supplierId)
    const navigate = useNavigate()

    const [items, setItems] = React.useState<PurchaseItemForm[]>([])
    const [warehouseId, setWarehouseId] = React.useState(0)
    const [amountPaid, setAmountPaid] = React.useState('')
    const [discount, setDiscount] = React.useState('0')
    const [notes, setNotes] = React.useState('')
    const [expectedDate, setExpectedDate] = React.useState('')
    const [productSearch, setProductSearch] = React.useState('')

    const { data: supplier } = useSupplier(businessId, sId)
    const { data: supplierProducts } = useSupplierProducts(businessId, sId)
    const { data: allProducts } = useProducts(businessId, { search: productSearch || undefined })
    const { data: warehouses } = useWarehouses(businessId)
    const createPurchase = useCreatePurchase(businessId, sId)

    React.useEffect(() => {
        const def = warehouses?.find(w => w.is_default) ?? warehouses?.[0]
        if (def && !warehouseId) setWarehouseId(def.id)
    }, [warehouses])

    const subtotal = items.reduce((a, i) => a + i.quantity * i.cost_per_unit, 0)
    const totalDiscount = Number(discount) || 0
    const total = Math.max(0, subtotal - totalDiscount)
    const paid = Number(amountPaid) || 0
    const credit = Math.max(0, total - paid)

    const addItem = (presentationId: number, productName: string, presentationName: string, costPrice?: string, isPerishable?: boolean) => {
        const existing = items.findIndex(i => i.presentation_id === presentationId)
        if (existing >= 0) {
            setItems(prev => prev.map((item, idx) => idx === existing ? { ...item, quantity: item.quantity + 1 } : item))
        } else {
            setItems(prev => [...prev, {
                presentation_id: presentationId,
                quantity: 1,
                cost_per_unit: costPrice ? Number(costPrice) : 0,
                product_name: productName,
                presentation_name: presentationName,
                is_perishable: isPerishable,
            }])
        }
        setProductSearch('')
    }

    const updateItem = (idx: number, field: keyof PurchaseItemForm, value: any) => {
        setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
    }

    const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx))

    const handleSubmit = () => {
        createPurchase.mutate({
            warehouse_id: warehouseId,
            items: items.map(i => ({
                presentation_id: i.presentation_id,
                quantity: i.quantity,
                cost_per_unit: i.cost_per_unit,
                lot_number: i.lot_number || undefined,
                expiry_date: i.expiry_date || undefined,
            })),
            amount_paid: paid,
            discount: totalDiscount,
            notes: notes || undefined,
            expected_payment_date: expectedDate || undefined,
        }, {
            onSuccess: () => navigate(`/businesses/${id}/suppliers/${supplierId}`),
        })
    }

    if (!supplier) return <PageLoader />

    return (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-56px)] overflow-hidden">

            {/* Panel izquierdo */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 border-r border-gray-100">
                <div className="flex items-center gap-3">
                    <Link to={`/businesses/${id}/suppliers/${supplierId}`} className="btn-ghost btn-sm p-2">
                        <ArrowLeft className="w-4 h-4" />
                    </Link>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900">Nueva compra</h1>
                        <p className="text-sm text-gray-400">{supplier.name}</p>
                    </div>
                </div>

                {/* Bodega */}
                {warehouses && warehouses.length > 1 && (
                    <select className="input w-full sm:w-60" value={warehouseId} onChange={e => setWarehouseId(Number(e.target.value))}>
                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                )}

                {/* Productos del proveedor (acceso rápido) */}
                {(supplierProducts?.length ?? 0) > 0 && !productSearch && (
                    <div>
                        <p className="text-xs font-semibold text-gray-500 mb-2">Productos de {supplier.name}</p>
                        <div className="flex flex-wrap gap-2">
                            {supplierProducts!.map(sp => (
                                <button
                                    key={sp.id}
                                    onClick={() => addItem(sp.presentation_id, sp.product_name ?? '', sp.presentation_name ?? '', sp.cost_price ?? undefined)}
                                    className="btn-secondary btn-sm text-xs"
                                >
                                    {sp.product_name} — {sp.presentation_name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Buscador general */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        className="input pl-9 w-full"
                        placeholder="Buscar cualquier producto del inventario..."
                        value={productSearch}
                        onChange={e => setProductSearch(e.target.value)}
                    />
                </div>

                {productSearch && (
                    <div className="card divide-y divide-gray-100 max-h-56 overflow-y-auto">
                        {allProducts?.flatMap(product =>
                            product.presentations.filter(p => p.is_active).map(pres => (
                                <button
                                    key={pres.id}
                                    onClick={() => addItem(pres.id, product.name, pres.name, undefined, product.is_perishable)}
                                    className="flex items-center justify-between w-full px-4 py-3 hover:bg-surface-50 text-left"
                                >
                                    <div>
                                        <p className="text-sm font-medium text-gray-800">{product.name}</p>
                                        <p className="text-xs text-gray-400">{pres.name}</p>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                )}

                {/* Items */}
                {items.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Productos a comprar</p>
                        {items.map((item, idx) => (
                            <div key={item.presentation_id} className="card p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-800">{item.product_name} — {item.presentation_name}</p>
                                    </div>
                                    <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    <div className="space-y-1">
                                        <label className="text-xs text-gray-400">Cantidad</label>
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => updateItem(idx, 'quantity', Math.max(1, item.quantity - 1))} className="btn-ghost btn-sm p-1">
                                                <Minus className="w-3 h-3" />
                                            </button>
                                            <input
                                                type="number" min="0.01" step="0.01"
                                                className="input py-1 px-2 text-sm w-16 text-center"
                                                value={item.quantity}
                                                onChange={e => updateItem(idx, 'quantity', Number(e.target.value))}
                                            />
                                            <button onClick={() => updateItem(idx, 'quantity', item.quantity + 1)} className="btn-ghost btn-sm p-1">
                                                <Plus className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-gray-400">Costo c/u</label>
                                        <input
                                            type="number" min="0" className="input py-1 px-2 text-sm"
                                            value={item.cost_per_unit}
                                            onChange={e => updateItem(idx, 'cost_per_unit', Number(e.target.value))}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-gray-400">Nº lote</label>
                                        <input
                                            className="input py-1 px-2 text-sm"
                                            placeholder="Opcional"
                                            value={item.lot_number ?? ''}
                                            onChange={e => updateItem(idx, 'lot_number', e.target.value)}
                                        />
                                    </div>
                                    {item.is_perishable && (
                                        <div className="space-y-1">
                                            <label className="text-xs text-gray-400">Vencimiento</label>
                                            <input
                                                type="date" className="input py-1 px-2 text-sm"
                                                value={item.expiry_date ?? ''}
                                                onChange={e => updateItem(idx, 'expiry_date', e.target.value)}
                                            />
                                        </div>
                                    )}
                                </div>
                                <div className="text-right text-sm font-semibold text-gray-800">
                                    Subtotal: ${(item.quantity * item.cost_per_unit).toLocaleString()}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Panel derecho — pago */}
            <div className="w-full lg:w-96 bg-white border-t lg:border-t-0 lg:border-l border-gray-100 flex flex-col overflow-y-auto">
                <div className="flex-1 p-4 md:p-6 space-y-4">
                    <div className="space-y-1">
                        <label className="label">Descuento ($)</label>
                        <input type="number" min="0" className="input" value={discount} onChange={e => setDiscount(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                        <label className="label">Monto pagado ahora</label>
                        <input
                            type="number" min="0" className="input text-lg"
                            placeholder={`$${total.toLocaleString()}`}
                            value={amountPaid}
                            onChange={e => setAmountPaid(e.target.value)}
                        />
                        {credit > 0 && (
                            <p className="text-xs text-red-500">Quedará debiendo: ${credit.toLocaleString()}</p>
                        )}
                    </div>
                    {credit > 0 && (
                        <div className="space-y-1">
                            <label className="label">Fecha esperada de pago</label>
                            <input type="date" className="input" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} />
                        </div>
                    )}
                    <div className="space-y-1">
                        <label className="label">Notas (opcional)</label>
                        <input className="input" placeholder="Observaciones..." value={notes} onChange={e => setNotes(e.target.value)} />
                    </div>
                    {createPurchase.error && <ErrorAlert message={getApiErrorMessage(createPurchase.error)} />}
                </div>

                <div className="border-t border-gray-100 p-4 md:p-6 space-y-3">
                    <div className="space-y-1.5">
                        <div className="flex justify-between text-sm text-gray-500">
                            <span>Subtotal</span><span>${subtotal.toLocaleString()}</span>
                        </div>
                        {totalDiscount > 0 && (
                            <div className="flex justify-between text-sm text-green-600">
                                <span>Descuento</span><span>−${totalDiscount.toLocaleString()}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-base font-bold text-gray-900 pt-1 border-t border-gray-100">
                            <span>Total</span><span>${total.toLocaleString()}</span>
                        </div>
                    </div>
                    <button
                        onClick={handleSubmit}
                        disabled={!items.length || !warehouseId || createPurchase.isPending}
                        className="btn-primary w-full py-3"
                    >
                        {createPurchase.isPending ? <Spinner size="sm" /> : `Registrar compra $${total.toLocaleString()}`}
                    </button>
                </div>
            </div>
        </div>
    )
}