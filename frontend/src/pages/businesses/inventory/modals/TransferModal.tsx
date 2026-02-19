import React from 'react'
import { Modal, ErrorAlert, Spinner } from '@/components/ui'
import type { ProductPresentation, Warehouse, TransferForm } from '@/types'

interface Props {
    isOpen: boolean; onClose: () => void
    presentation: ProductPresentation; warehouses: Warehouse[]
    onConfirm: (data: TransferForm) => void; loading: boolean; error?: string
}

export function TransferModal({ isOpen, onClose, presentation, warehouses, onConfirm, loading, error }: Props) {
    const [form, setForm] = React.useState({
        from_warehouse_id: warehouses[0]?.id ?? 0,
        to_warehouse_id: warehouses[1]?.id ?? 0,
        quantity: '',
        reason: '',
    })
    const set = (k: string, v: string | number) => setForm(p => ({ ...p, [k]: v }))

    const availableStock = presentation.stock.find(s => s.warehouse_id === form.from_warehouse_id)

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Transferir — ${presentation.name}`} size="sm">
            <div className="space-y-4">
                {error && <ErrorAlert message={error} />}

                <div className="space-y-1">
                    <label className="label">Bodega origen</label>
                    <select className="input" value={form.from_warehouse_id} onChange={e => set('from_warehouse_id', Number(e.target.value))}>
                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                    {availableStock && (
                        <p className="text-xs text-gray-400">Disponible: {Number(availableStock.quantity).toLocaleString()}</p>
                    )}
                </div>
                <div className="space-y-1">
                    <label className="label">Bodega destino</label>
                    <select className="input" value={form.to_warehouse_id} onChange={e => set('to_warehouse_id', Number(e.target.value))}>
                        {warehouses.filter(w => w.id !== form.from_warehouse_id).map(w => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="label">Cantidad *</label>
                    <input className="input" type="number" min="0.01" step="0.01" placeholder="0"
                        value={form.quantity} onChange={e => set('quantity', e.target.value)} />
                </div>
                <div className="space-y-1">
                    <label className="label">Razón (opcional)</label>
                    <input className="input" placeholder="Ej: Reabastecimiento mostrador"
                        value={form.reason} onChange={e => set('reason', e.target.value)} />
                </div>

                <div className="flex gap-2 pt-2">
                    <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
                    <button
                        onClick={() => onConfirm({ presentation_id: presentation.id, from_warehouse_id: form.from_warehouse_id, to_warehouse_id: form.to_warehouse_id, quantity: Number(form.quantity), reason: form.reason || undefined })}
                        disabled={!form.quantity || form.from_warehouse_id === form.to_warehouse_id || loading}
                        className="btn-primary flex-1"
                    >
                        {loading ? <Spinner size="sm" /> : 'Transferir'}
                    </button>
                </div>
            </div>
        </Modal>
    )
}