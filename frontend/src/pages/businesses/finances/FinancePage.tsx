import { useParams, useNavigate } from 'react-router-dom'
import { Plus, DollarSign, TrendingUp, TrendingDown, CreditCard, Pencil, Trash2, Lock, Unlock } from 'lucide-react'
import React from 'react'
import {
    useFinanceSummary, useCashRegisters,
    useCreateRegister, useUpdateRegister, useDeleteRegister,
} from '@/hooks/useFinance'
import { useWarehouses } from '@/hooks/useInventory'
import { PageLoader, EmptyState, Badge, Modal, ConfirmDialog, ErrorAlert, Spinner } from '@/components/ui'
import { getApiErrorMessage } from '@/utils'
import type { CashRegister } from '@/types/finances.types'

export function FinancePage() {
    const { id } = useParams<{ id: string }>()
    const businessId = Number(id)
    const navigate = useNavigate()

    const [createOpen, setCreateOpen] = React.useState(false)
    const [editTarget, setEditTarget] = React.useState<CashRegister | null>(null)
    const [deleteTarget, setDeleteTarget] = React.useState<CashRegister | null>(null)
    const [form, setForm] = React.useState({ name: '', warehouse_id: 0 })

    const { data: summary, isLoading: loadingSummary } = useFinanceSummary(businessId)
    const { data: registers, isLoading: loadingRegisters } = useCashRegisters(businessId)
    const { data: warehouses } = useWarehouses(businessId)
    const createRegister = useCreateRegister(businessId)
    const updateRegister = useUpdateRegister(businessId)
    const deleteRegister = useDeleteRegister(businessId)

    React.useEffect(() => {
        const def = warehouses?.find(w => w.is_default) ?? warehouses?.[0]
        if (def && !form.warehouse_id) setForm(p => ({ ...p, warehouse_id: def.id }))
    }, [warehouses])

    const openCreate = () => {
        const def = warehouses?.find(w => w.is_default) ?? warehouses?.[0]
        setForm({ name: '', warehouse_id: def?.id ?? 0 })
        setCreateOpen(true)
    }

    const openEdit = (r: CashRegister) => {
        setEditTarget(r)
        setForm({ name: r.name, warehouse_id: r.warehouse_id })
    }

    const handleSave = () => {
        if (editTarget) {
            updateRegister.mutate(
                { id: editTarget.id, data: { name: form.name } },
                { onSuccess: () => setEditTarget(null) }
            )
        } else {
            createRegister.mutate(form, { onSuccess: () => setCreateOpen(false) })
        }
    }

    const mutation = editTarget ? updateRegister : createRegister

    if (loadingSummary || loadingRegisters) return <PageLoader />

    const netColor = Number(summary?.today_net ?? 0) >= 0 ? 'text-green-700' : 'text-red-700'

    return (
        <div className="p-6 md:p-8 max-w-5xl mx-auto animate-fade-in space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Finanzas</h1>
                    <p className="text-sm text-gray-500">Control de caja y flujo de dinero</p>
                </div>
                <button onClick={openCreate} className="btn-primary btn-sm">
                    <Plus className="w-4 h-4" /> Nueva caja
                </button>
            </div>

            {/* Resumen del día */}
            {summary && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <SummaryCard
                        icon={<TrendingUp className="w-4 h-4" />}
                        label="Ingresos hoy"
                        value={`$${Number(summary.today_revenue).toLocaleString()}`}
                        color="green"
                    />
                    <SummaryCard
                        icon={<TrendingDown className="w-4 h-4" />}
                        label="Gastos hoy"
                        value={`$${Number(summary.today_expenses).toLocaleString()}`}
                        color="red"
                    />
                    <SummaryCard
                        icon={<CreditCard className="w-4 h-4" />}
                        label="Fiado hoy"
                        value={`$${Number(summary.today_credit).toLocaleString()}`}
                        color="yellow"
                    />
                    <div className="card p-4">
                        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center mb-3">
                            <DollarSign className="w-4 h-4 text-gray-600" />
                        </div>
                        <p className="text-xs text-gray-500 mb-1">Neto hoy</p>
                        <p className={`text-lg font-bold ${netColor}`}>
                            ${Number(summary.today_net).toLocaleString()}
                        </p>
                    </div>
                </div>
            )}

            {/* Estado de cajas */}
            {(summary?.open_sessions ?? 0) > 0 && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-100 rounded-xl text-sm text-green-700">
                    <Unlock className="w-4 h-4" />
                    <span>{summary!.open_sessions} caja{summary!.open_sessions > 1 ? 's' : ''} abierta{summary!.open_sessions > 1 ? 's' : ''} en este momento</span>
                </div>
            )}

            {/* Lista de cajas */}
            <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-700">Cajas registradas</p>
                {!registers?.length ? (
                    <EmptyState
                        icon="🏧"
                        title="Sin cajas registradas"
                        description="Crea tu primera caja para comenzar a gestionar el dinero."
                        action={
                            <button onClick={openCreate} className="btn-primary btn-sm">
                                <Plus className="w-4 h-4" /> Crear caja
                            </button>
                        }
                    />
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                        {registers.map(register => (
                            <RegisterCard
                                key={register.id}
                                register={register}
                                onClick={() => navigate(`/businesses/${id}/finance/registers/${register.id}`)}
                                onEdit={() => openEdit(register)}
                                onDelete={() => setDeleteTarget(register)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Modal crear / editar caja */}
            <Modal
                isOpen={createOpen || !!editTarget}
                onClose={() => { setCreateOpen(false); setEditTarget(null) }}
                title={editTarget ? 'Editar caja' : 'Nueva caja'}
                size="sm"
            >
                <div className="space-y-4">
                    {mutation.error && <ErrorAlert message={getApiErrorMessage(mutation.error)} />}
                    <div className="space-y-1">
                        <label className="label">Nombre *</label>
                        <input
                            className="input" placeholder="Ej: Caja principal, Caja mostrador..."
                            value={form.name}
                            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                            autoFocus
                        />
                    </div>
                    {!editTarget && (
                        <div className="space-y-1">
                            <label className="label">Bodega</label>
                            <select
                                className="input"
                                value={form.warehouse_id}
                                onChange={e => setForm(p => ({ ...p, warehouse_id: Number(e.target.value) }))}
                            >
                                {warehouses?.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                        </div>
                    )}
                    <div className="flex gap-2 pt-2">
                        <button
                            onClick={() => { setCreateOpen(false); setEditTarget(null) }}
                            className="btn-secondary flex-1"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!form.name || mutation.isPending}
                            className="btn-primary flex-1"
                        >
                            {mutation.isPending ? <Spinner size="sm" /> : editTarget ? 'Guardar' : 'Crear caja'}
                        </button>
                    </div>
                </div>
            </Modal>

            <ConfirmDialog
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={() => deleteRegister.mutate(deleteTarget!.id, { onSuccess: () => setDeleteTarget(null) })}
                loading={deleteRegister.isPending}
                danger
                title="Eliminar caja"
                message={`¿Eliminar "${deleteTarget?.name}"? Solo es posible si no tiene sesión abierta.`}
                confirmLabel="Eliminar"
            />
        </div>
    )
}

function RegisterCard({ register, onClick, onEdit, onDelete }: {
    register: CashRegister
    onClick: () => void
    onEdit: () => void
    onDelete: () => void
}) {
    const isOpen = !!register.open_session_id

    return (
        <div className="card p-5 hover:shadow-md transition-shadow cursor-pointer" onClick={onClick}>
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isOpen ? 'bg-green-50' : 'bg-gray-50'
                        }`}>
                        {isOpen
                            ? <Unlock className="w-5 h-5 text-green-600" />
                            : <Lock className="w-5 h-5 text-gray-400" />
                        }
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-900">{register.name}</p>
                        <Badge variant={isOpen ? 'green' : 'gray'}>
                            {isOpen ? 'Abierta' : 'Cerrada'}
                        </Badge>
                    </div>
                </div>
                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <button onClick={onEdit} className="btn-ghost btn-sm p-1.5">
                        <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={onDelete} className="btn-ghost btn-sm p-1.5 text-red-400">
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
            {isOpen ? (
                <div className="space-y-1">
                    <p className="text-xs text-gray-400">Abierta por {register.opened_by_name ?? '—'}</p>
                    <p className="text-sm font-medium text-gray-700">
                        Base: ${Number(register.opening_amount ?? 0).toLocaleString()}
                    </p>
                </div>
            ) : (
                <p className="text-xs text-gray-400">Sin sesión activa · Toca para abrir</p>
            )}
        </div>
    )
}

function SummaryCard({ icon, label, value, color }: {
    icon: React.ReactNode; label: string; value: string
    color: 'green' | 'red' | 'yellow'
}) {
    const bg = { green: 'bg-green-50 text-green-600', red: 'bg-red-50 text-red-600', yellow: 'bg-yellow-50 text-yellow-600' }
    const text = { green: 'text-green-700', red: 'text-red-700', yellow: 'text-yellow-700' }
    return (
        <div className="card p-4">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${bg[color]}`}>{icon}</div>
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={`text-lg font-bold ${text[color]}`}>{value}</p>
        </div>
    )
}