import React from 'react'
import { Modal, ErrorAlert, Spinner } from '@/components/ui'
import type { ProductPresentation, Warehouse, AdjustmentForm } from '@/types'

interface Props {
    isOpen: boolean; onClose: () => void
    presentation: ProductPresentation; warehouses: Warehouse[]
    onConfirm: (data: AdjustmentForm) => void; loading: boolean; error?: string
}

export function AdjustmentModal({ isOpen, onClose, presentation, warehouses, onConfirm, loading, error }: Props) {
    const defaultWarehouse = warehouses.find(w => w.is_default)
    const [form, setForm] = React.useState({
        warehouse_id: defaultWarehouse?.id ?? warehouses[0]?.id ?? 0,
        quantity: '',
        reason: '',
    })
    const set = (k: string, v: string | number) => setForm(p => ({ ...p, [k]: v }))

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Ajuste — ${presentation.name}`} size="sm">
            <div className="space-y-4">
                {error && <ErrorAlert message={error} />}
                <p className="text-xs text-gray-500">Usa valores negativos para reducir el stock (ej: -5) y positivos para aumentarlo.</p>

                <div className="space-y-1">
                    <label className="label">Bodega</label>
                    <select className="input" value={form.warehouse_id} onChange={e => set('warehouse_id', Number(e.target.value))}>
                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="label">Cantidad *</label>
                    <input className="input" type="number" placeholder="Ej: -5 o +10"
                        value={form.quantity} onChange={e => set('quantity', e.target.value)} />
                </div>
                <div className="space-y-1">
                    <label className="label">Razón del ajuste *</label>
                    <input className="input" placeholder="Ej: Conteo físico, error de registro..."
                        value={form.reason} onChange={e => set('reason', e.target.value)} />
                </div>

                <div className="flex gap-2 pt-2">
                    <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
                    <button
                        onClick={() => onConfirm({ presentation_id: presentation.id, warehouse_id: form.warehouse_id, quantity: Number(form.quantity), reason: form.reason })}
                        disabled={!form.quantity || !form.reason || loading}
                        className="btn-primary flex-1"
                    >
                        {loading ? <Spinner size="sm" /> : 'Aplicar ajuste'}
                    </button>
                </div>
            </div>
        </Modal>
    )
}