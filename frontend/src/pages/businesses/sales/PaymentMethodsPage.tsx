import { useParams, Link } from 'react-router-dom'
import { Plus, Pencil, Trash2, Lock, ArrowLeft } from 'lucide-react'
import React from 'react'
import {
    usePaymentMethods,
    useCreatePaymentMethod,
    useUpdatePaymentMethod,
    useDeletePaymentMethod,
} from '@/hooks/useSales'
import {
    PageLoader, EmptyState, Badge, Modal, ErrorAlert, Spinner, ConfirmDialog,
} from '@/components/ui'
import { getApiErrorMessage } from '@/utils'
import type { PaymentMethod } from '@/types/sales.types'

type FormState = { name: string; description: string; is_credit: boolean }
const EMPTY_FORM: FormState = { name: '', description: '', is_credit: false }

export function PaymentMethodsPage() {
    const { id } = useParams<{ id: string }>()
    const businessId = Number(id)

    const [showForm, setShowForm] = React.useState(false)
    const [editing, setEditing] = React.useState<PaymentMethod | null>(null)
    const [deleteTarget, setDeleteTarget] = React.useState<PaymentMethod | null>(null)
    const [form, setForm] = React.useState<FormState>(EMPTY_FORM)

    const { data: methods, isLoading } = usePaymentMethods(businessId)
    const createMethod = useCreatePaymentMethod(businessId)
    const updateMethod = useUpdatePaymentMethod(businessId)
    const deleteMethod = useDeletePaymentMethod(businessId)

    const openCreate = () => {
        setEditing(null)
        setForm(EMPTY_FORM)
        setShowForm(true)
    }

    const openEdit = (m: PaymentMethod) => {
        setEditing(m)
        setForm({ name: m.name, description: m.description ?? '', is_credit: m.is_credit })
        setShowForm(true)
    }

    const handleSubmit = () => {
        if (!form.name.trim()) return

        if (editing) {
            updateMethod.mutate(
                { id: editing.id, data: { name: form.name, description: form.description || undefined } },
                { onSuccess: () => setShowForm(false) }
            )
        } else {
            createMethod.mutate(
                { name: form.name, description: form.description || undefined, is_credit: form.is_credit },
                { onSuccess: () => setShowForm(false) }
            )
        }
    }

    const handleDelete = (m: PaymentMethod) => {
        deleteMethod.mutate(m.id, { onSuccess: () => setDeleteTarget(null) })
    }

    const mutation = editing ? updateMethod : createMethod
    const hasCredit = methods?.some(m => m.is_credit && m.is_active)

    if (isLoading) return <PageLoader />

    return (
        <div className="p-6 md:p-8 max-w-3xl mx-auto animate-fade-in space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link to={`/businesses/${id}/sales`} className="btn-ghost btn-sm p-2">
                        <ArrowLeft className="w-4 h-4" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Métodos de pago</h1>
                        <p className="text-sm text-gray-500">
                            Configura cómo tus clientes pueden pagar
                        </p>
                    </div>
                </div>
                <button onClick={openCreate} className="btn-primary btn-sm">
                    <Plus className="w-4 h-4" /> Nuevo método
                </button>
            </div>

            {/* Lista */}
            {!methods?.length ? (
                <EmptyState
                    icon="💳"
                    title="Sin métodos de pago"
                    description="Crea al menos un método de pago para poder registrar ventas."
                    action={
                        <button onClick={openCreate} className="btn-primary btn-sm">
                            <Plus className="w-4 h-4" /> Crear método
                        </button>
                    }
                />
            ) : (
                <div className="card divide-y divide-gray-100">
                    {methods.map(m => (
                        <div key={m.id} className="flex items-center gap-4 p-4">
                            <div className="w-9 h-9 rounded-xl bg-surface-100 flex items-center justify-center shrink-0">
                                <span className="text-lg">{m.is_credit ? '📒' : '💳'}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium text-gray-900">{m.name}</p>
                                    {m.is_credit && <Badge variant="yellow">Fiado</Badge>}
                                    {m.is_default && (
                                        <Badge variant="gray">Por defecto</Badge>
                                    )}
                                    {!m.is_active && (
                                        <Badge variant="red">Inactivo</Badge>
                                    )}
                                </div>
                                {m.description && (
                                    <p className="text-xs text-gray-400 mt-0.5">{m.description}</p>
                                )}
                            </div>
                            <div className="flex gap-1 shrink-0">
                                {m.is_default ? (
                                    // Métodos por defecto no se pueden editar ni borrar
                                    <div className="p-2 text-gray-300" title="Método por defecto — no editable">
                                        <Lock className="w-4 h-4" />
                                    </div>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => openEdit(m)}
                                            className="btn-ghost btn-sm p-2 text-gray-400 hover:text-gray-700"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setDeleteTarget(m)}
                                            className="btn-ghost btn-sm p-2 text-gray-400 hover:text-red-500"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Nota informativa */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700 space-y-1">
                <p className="font-medium">¿Cómo funcionan los métodos de pago?</p>
                <p className="text-blue-600 text-xs">
                    Al crear una venta puedes seleccionar uno o varios métodos a la vez (pagos mixtos).
                    El método marcado como <strong>Fiado</strong> descuenta de la cartera del cliente.
                    Solo puede existir un método de fiado activo.
                </p>
            </div>

            {/* Modal crear / editar */}
            <Modal
                isOpen={showForm}
                onClose={() => setShowForm(false)}
                title={editing ? 'Editar método de pago' : 'Nuevo método de pago'}
                size="sm"
            >
                <div className="space-y-4">
                    {mutation.error && (
                        <ErrorAlert message={getApiErrorMessage(mutation.error)} />
                    )}

                    <div className="space-y-1">
                        <label className="label">Nombre *</label>
                        <input
                            className="input"
                            placeholder="Ej: Efectivo, Nequi, Daviplata..."
                            value={form.name}
                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            autoFocus
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="label">Descripción (opcional)</label>
                        <input
                            className="input"
                            placeholder="Ej: Transferencia bancaria Bancolombia"
                            value={form.description}
                            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                        />
                    </div>

                    {/* is_credit solo al crear, y solo si no existe ya uno */}
                    {!editing && (
                        <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all
                            ${form.is_credit
                                ? 'border-yellow-400 bg-yellow-50'
                                : 'border-gray-100 hover:border-gray-200'
                            }
                            ${hasCredit ? 'opacity-40 cursor-not-allowed' : ''}
                        `}>
                            <input
                                type="checkbox"
                                className="rounded"
                                checked={form.is_credit}
                                disabled={!!hasCredit}
                                onChange={e => setForm(f => ({ ...f, is_credit: e.target.checked }))}
                            />
                            <div>
                                <p className="text-sm font-medium text-gray-800">
                                    📒 Es un método de fiado (crédito)
                                </p>
                                <p className="text-xs text-gray-400">
                                    {hasCredit
                                        ? 'Ya existe un método de fiado activo — solo se permite uno'
                                        : 'Las ventas con este método descontarán de la cartera del cliente'
                                    }
                                </p>
                            </div>
                        </label>
                    )}

                    <div className="flex gap-2 pt-2">
                        <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">
                            Cancelar
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={!form.name.trim() || mutation.isPending}
                            className="btn-primary flex-1"
                        >
                            {mutation.isPending
                                ? <Spinner size="sm" />
                                : editing ? 'Guardar cambios' : 'Crear método'
                            }
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Confirm borrar */}
            <ConfirmDialog
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
                loading={deleteMethod.isPending}
                danger
                title="Desactivar método de pago"
                message={`¿Deseas desactivar "${deleteTarget?.name}"? Las ventas existentes no se verán afectadas.`}
                confirmLabel="Desactivar"
            />
        </div>
    )
}