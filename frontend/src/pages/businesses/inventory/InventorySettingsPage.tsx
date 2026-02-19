import { useParams } from 'react-router-dom'
import { Plus, Pencil, Trash2, ArrowLeft } from 'lucide-react'
import React from 'react'
import { Link } from 'react-router-dom'
import {
    useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory,
    useWarehouses, useCreateWarehouse, useUpdateWarehouse, useDeleteWarehouse,
} from '@/hooks/useInventory'
import { PageLoader, Modal, ConfirmDialog, ErrorAlert, Spinner } from '@/components/ui'
import { getApiErrorMessage } from '@/utils'
import type { ProductCategory, Warehouse } from '@/types'

const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#14b8a6']

export function InventorySettingsPage() {
    const { id } = useParams<{ id: string }>()
    const businessId = Number(id)

    const { data: categories, isLoading: loadingCats } = useCategories(businessId)
    const { data: warehouses, isLoading: loadingWh } = useWarehouses(businessId)

    const createCat = useCreateCategory(businessId)
    const updateCat = useUpdateCategory(businessId)
    const deleteCat = useDeleteCategory(businessId)
    const createWh = useCreateWarehouse(businessId)
    const updateWh = useUpdateWarehouse(businessId)
    const deleteWh = useDeleteWarehouse(businessId)

    // Category modal state
    const [catModal, setCatModal] = React.useState(false)
    const [editCat, setEditCat] = React.useState<ProductCategory | null>(null)
    const [deleteCatTarget, setDeleteCatTarget] = React.useState<ProductCategory | null>(null)
    const [catForm, setCatForm] = React.useState({ name: '', description: '', color: COLORS[0] })

    // Warehouse modal state
    const [whModal, setWhModal] = React.useState(false)
    const [editWh, setEditWh] = React.useState<Warehouse | null>(null)
    const [deleteWhTarget, setDeleteWhTarget] = React.useState<Warehouse | null>(null)
    const [whForm, setWhForm] = React.useState({ name: '', description: '', is_default: false })

    const openCatModal = (cat?: ProductCategory) => {
        setEditCat(cat ?? null)
        setCatForm(cat ? { name: cat.name, description: cat.description ?? '', color: cat.color } : { name: '', description: '', color: COLORS[0] })
        setCatModal(true)
    }
    const openWhModal = (wh?: Warehouse) => {
        setEditWh(wh ?? null)
        setWhForm(wh ? { name: wh.name, description: wh.description ?? '', is_default: wh.is_default } : { name: '', description: '', is_default: false })
        setWhModal(true)
    }

    const saveCat = () => {
        if (editCat) {
            updateCat.mutate({ id: editCat.id, data: catForm }, { onSuccess: () => setCatModal(false) })
        } else {
            createCat.mutate(catForm, { onSuccess: () => setCatModal(false) })
        }
    }
    const saveWh = () => {
        if (editWh) {
            updateWh.mutate({ id: editWh.id, data: whForm }, { onSuccess: () => setWhModal(false) })
        } else {
            createWh.mutate(whForm, { onSuccess: () => setWhModal(false) })
        }
    }

    if (loadingCats || loadingWh) return <PageLoader />

    return (
        <div className="p-6 md:p-8 max-w-3xl mx-auto animate-fade-in space-y-8">
            <div className="flex items-center gap-3">
                <Link to={`/businesses/${id}/inventory`} className="btn-ghost btn-sm p-2">
                    <ArrowLeft className="w-4 h-4" />
                </Link>
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Configuración de Inventario</h1>
                    <p className="text-sm text-gray-500">Configura tu inventario</p>
                </div>
            </div>

            {/* Categorías */}
            <section className="space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-gray-800">Categorías</h2>
                    <button onClick={() => openCatModal()} className="btn-primary btn-sm">
                        <Plus className="w-4 h-4" /> Nueva categoría
                    </button>
                </div>
                <div className="card divide-y divide-gray-100">
                    {!categories?.length ? (
                        <p className="text-sm text-gray-400 text-center py-8">Sin categorías. Crea la primera para organizar tus productos.</p>
                    ) : categories.map(cat => (
                        <div key={cat.id} className="flex items-center gap-3 p-3">
                            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-800">{cat.name}</p>
                                {cat.description && <p className="text-xs text-gray-400">{cat.description}</p>}
                            </div>
                            <div className="flex gap-1">
                                <button onClick={() => openCatModal(cat)} className="btn-ghost btn-sm p-1.5">
                                    <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => setDeleteCatTarget(cat)} className="btn-ghost btn-sm p-1.5 text-red-500">
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Bodegas */}
            <section className="space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-gray-800">Bodegas</h2>
                    <button onClick={() => openWhModal()} className="btn-primary btn-sm">
                        <Plus className="w-4 h-4" /> Nueva bodega
                    </button>
                </div>
                <div className="card divide-y divide-gray-100">
                    {!warehouses?.length ? (
                        <p className="text-sm text-gray-400 text-center py-8">Sin bodegas. Crea al menos una para gestionar el stock.</p>
                    ) : warehouses.map(wh => (
                        <div key={wh.id} className="flex items-center gap-3 p-3">
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium text-gray-800">{wh.name}</p>
                                    {wh.is_default && <span className="text-[10px] bg-brand-50 text-brand-700 px-1.5 py-0.5 rounded-full">Principal</span>}
                                </div>
                                {wh.description && <p className="text-xs text-gray-400">{wh.description}</p>}
                            </div>
                            <div className="flex gap-1">
                                <button onClick={() => openWhModal(wh)} className="btn-ghost btn-sm p-1.5">
                                    <Pencil className="w-3.5 h-3.5" />
                                </button>
                                {!wh.is_default && (
                                    <button onClick={() => setDeleteWhTarget(wh)} className="btn-ghost btn-sm p-1.5 text-red-500">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Modal categoría */}
            <Modal isOpen={catModal} onClose={() => setCatModal(false)} title={editCat ? 'Editar categoría' : 'Nueva categoría'} size="sm">
                <div className="space-y-4">
                    {(createCat.error || updateCat.error) && (
                        <ErrorAlert message={getApiErrorMessage((createCat.error || updateCat.error)!)} />
                    )}
                    <div className="space-y-1">
                        <label className="label">Nombre *</label>
                        <input className="input" value={catForm.name} onChange={e => setCatForm(p => ({ ...p, name: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                        <label className="label">Descripción</label>
                        <input className="input" value={catForm.description} onChange={e => setCatForm(p => ({ ...p, description: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                        <label className="label">Color</label>
                        <div className="flex gap-2 flex-wrap">
                            {COLORS.map(c => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setCatForm(p => ({ ...p, color: c }))}
                                    className={`w-7 h-7 rounded-full transition-transform ${catForm.color === c ? 'scale-125 ring-2 ring-offset-2 ring-gray-400' : 'hover:scale-110'}`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                        <button onClick={() => setCatModal(false)} className="btn-secondary flex-1">Cancelar</button>
                        <button onClick={saveCat} disabled={!catForm.name || createCat.isPending || updateCat.isPending} className="btn-primary flex-1">
                            {(createCat.isPending || updateCat.isPending) ? <Spinner size="sm" /> : 'Guardar'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Modal bodega */}
            <Modal isOpen={whModal} onClose={() => setWhModal(false)} title={editWh ? 'Editar bodega' : 'Nueva bodega'} size="sm">
                <div className="space-y-4">
                    {(createWh.error || updateWh.error) && (
                        <ErrorAlert message={getApiErrorMessage((createWh.error || updateWh.error)!)} />
                    )}
                    <div className="space-y-1">
                        <label className="label">Nombre *</label>
                        <input className="input" value={whForm.name} onChange={e => setWhForm(p => ({ ...p, name: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                        <label className="label">Descripción</label>
                        <input className="input" placeholder="Ej: Bodega principal, Mostrador..." value={whForm.description} onChange={e => setWhForm(p => ({ ...p, description: e.target.value }))} />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={whForm.is_default} onChange={e => setWhForm(p => ({ ...p, is_default: e.target.checked }))} />
                        <span className="text-sm text-gray-700">Bodega principal</span>
                    </label>
                    <div className="flex gap-2 pt-2">
                        <button onClick={() => setWhModal(false)} className="btn-secondary flex-1">Cancelar</button>
                        <button onClick={saveWh} disabled={!whForm.name || createWh.isPending || updateWh.isPending} className="btn-primary flex-1">
                            {(createWh.isPending || updateWh.isPending) ? <Spinner size="sm" /> : 'Guardar'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Confirms */}
            <ConfirmDialog
                isOpen={!!deleteCatTarget} onClose={() => setDeleteCatTarget(null)}
                onConfirm={() => deleteCat.mutate(deleteCatTarget!.id, { onSuccess: () => setDeleteCatTarget(null) })}
                loading={deleteCat.isPending} danger
                title="Eliminar categoría"
                message={`¿Eliminar "${deleteCatTarget?.name}"? Los productos de esta categoría quedarán sin categoría.`}
                confirmLabel="Eliminar"
            />
            <ConfirmDialog
                isOpen={!!deleteWhTarget} onClose={() => setDeleteWhTarget(null)}
                onConfirm={() => deleteWh.mutate(deleteWhTarget!.id, { onSuccess: () => setDeleteWhTarget(null) })}
                loading={deleteWh.isPending} danger
                title="Eliminar bodega"
                message={`¿Eliminar "${deleteWhTarget?.name}"? Solo es posible si no tiene stock activo.`}
                confirmLabel="Eliminar"
            />
        </div>
    )
}