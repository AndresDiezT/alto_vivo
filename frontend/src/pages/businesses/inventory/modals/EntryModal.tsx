import React from 'react'
import { Modal, ErrorAlert, Spinner } from '@/components/ui'
import type { ProductPresentation, Warehouse, EntryForm } from '@/types'

interface Props {
    isOpen: boolean
    onClose: () => void
    presentation: ProductPresentation
    warehouses: Warehouse[]
    isPerishable: boolean
    onConfirm: (data: EntryForm) => void
    loading: boolean
    error?: string
}

export function EntryModal({ isOpen, onClose, presentation, warehouses, isPerishable, onConfirm, loading, error }: Props) {
    const defaultWarehouse = warehouses.find(w => w.is_default)
    const [form, setForm] = React.useState({
        warehouse_id: defaultWarehouse?.id ?? warehouses[0]?.id ?? 0,
        quantity: '',
        cost_per_unit: '',
        lot_number: '',
        expiry_date: '',
        reason: '',
    })

    const set = (k: string, v: string | number) => setForm(p => ({ ...p, [k]: v }))

    const handleConfirm = () => {
        onConfirm({
            presentation_id: presentation.id,
            warehouse_id: form.warehouse_id,
            quantity: Number(form.quantity),
            cost_per_unit: form.cost_per_unit ? Number(form.cost_per_unit) : undefined,
            lot_number: form.lot_number || undefined,
            expiry_date: form.expiry_date || undefined,
            reason: form.reason || undefined,
        })
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Entrada — ${presentation.name}`} size="md">
            <div className="space-y-4">
                {error && <ErrorAlert message={error} />}

                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <label className="label">Bodega</label>
                        <select className="input" value={form.warehouse_id} onChange={e => set('warehouse_id', Number(e.target.value))}>
                            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="label">Cantidad *</label>
                        <input className="input" type="number" min="0.01" step="0.01" placeholder="0"
                            value={form.quantity} onChange={e => set('quantity', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                        <label className="label">Costo por unidad</label>
                        <input className="input" type="number" min="0" placeholder="$0"
                            value={form.cost_per_unit} onChange={e => set('cost_per_unit', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                        <label className="label">Nº lote proveedor</label>
                        <input className="input" placeholder="Ej: LOT-2024-001"
                            value={form.lot_number} onChange={e => set('lot_number', e.target.value)} />
                    </div>
                    {isPerishable && (
                        <div className="col-span-2 space-y-1">
                            <label className="label">Fecha de vencimiento</label>
                            <input className="input" type="date"
                                value={form.expiry_date} onChange={e => set('expiry_date', e.target.value)} />
                        </div>
                    )}
                    <div className="col-span-2 space-y-1">
                        <label className="label">Nota (opcional)</label>
                        <input className="input" placeholder="Ej: Compra a proveedor X"
                            value={form.reason} onChange={e => set('reason', e.target.value)} />
                    </div>
                </div>

                <div className="flex gap-2 pt-2">
                    <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
                    <button onClick={handleConfirm} disabled={!form.quantity || !form.warehouse_id || loading} className="btn-primary flex-1">
                        {loading ? <Spinner size="sm" /> : 'Registrar entrada'}
                    </button>
                </div>
            </div>
        </Modal>
    )
}