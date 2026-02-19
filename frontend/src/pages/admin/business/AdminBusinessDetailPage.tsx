import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Settings as SettingsIcon, CheckCircle, XCircle, Edit, Trash2 } from 'lucide-react'
import React from 'react'
import { useAdminBusiness, useUpdateBusinessModules, useUpdateBusinessFull, useDeleteBusiness } from '@/hooks/admin/useAdminBusinesses'
import {
    PageLoader, Avatar, Badge, Modal, Checkbox, Spinner,
    InputField, SelectField, TextareaField, ErrorAlert, ConfirmDialog,
} from '@/components/ui'
import { formatDate, PLAN_LABELS, BUSINESS_TYPE_LABELS, MODULE_LABELS, getApiErrorMessage } from '@/utils'
import type { Business, BusinessType, PlanType } from '@/types'

interface BusinessUser {
    id: number
    user_id: number
    user_email: string
    user_name: string
    role_name: string | null
    is_active: boolean
    joined_at: string
}

export function AdminBusinessDetailPage() {
    const { id } = useParams<{ id: string }>()
    const businessId = Number(id)
    const [showModuleEdit, setShowModuleEdit] = React.useState(false)
    const [showEditBusiness, setShowEditBusiness] = React.useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false)

    const { data: business, isLoading } = useAdminBusiness(businessId)

    if (isLoading) return <PageLoader />
    if (!business) return null

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <Link to="/admin/businesses" className="btn-ghost btn-sm p-2">
                    <ArrowLeft className="w-4 h-4" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-xl font-bold text-gray-900">{business.name}</h1>
                    <p className="text-sm text-gray-500">
                        {BUSINESS_TYPE_LABELS[business.business_type]} · Creado {formatDate(business.created_at)}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setShowEditBusiness(true)} className="btn-secondary btn-sm">
                        <Edit className="w-4 h-4" />
                        Editar
                    </button>
                    <button onClick={() => setShowDeleteConfirm(true)} className="btn-danger btn-sm">
                        <Trash2 className="w-4 h-4" />
                        Eliminar
                    </button>
                </div>
            </div>

            {/* Info cards */}
            <div className="grid sm:grid-cols-2 gap-4 mb-6">
                <div className="card p-5">
                    <p className="text-xs text-gray-500 mb-1">Plan</p>
                    <p className="text-lg font-bold text-gray-900">{PLAN_LABELS[business.plan_type]}</p>
                </div>
                <div className="card p-5">
                    <p className="text-xs text-gray-500 mb-1">Estado</p>
                    {business.is_active ? (
                        <Badge variant="green">Activo</Badge>
                    ) : (
                        <Badge variant="gray">Inactivo</Badge>
                    )}
                </div>
                <div className="card p-5">
                    <p className="text-xs text-gray-500 mb-1">Límite de usuarios</p>
                    <p className="text-lg font-bold text-gray-900">{business.max_users}</p>
                </div>
                <div className="card p-5">
                    <p className="text-xs text-gray-500 mb-1">Límite de productos</p>
                    <p className="text-lg font-bold text-gray-900">{business.max_products.toLocaleString()}</p>
                </div>
            </div>

            {/* Modules */}
            <div className="card p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-gray-800">Módulos habilitados</h2>
                    <button
                        onClick={() => setShowModuleEdit(true)}
                        className="btn-secondary btn-sm"
                    >
                        <SettingsIcon className="w-4 h-4" />
                        Configurar
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    {Object.entries(MODULE_LABELS).map(([key, { label, icon }]) => {
                        const enabled = (business as any)[key]
                        return (
                            <div
                                key={key}
                                className={`flex items-center gap-2.5 p-3 rounded-xl border ${enabled ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                                    }`}
                            >
                                {enabled ? (
                                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                                ) : (
                                    <XCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                )}
                                <span className={`text-sm ${enabled ? 'text-gray-900' : 'text-gray-500'}`}>
                                    {icon} {label}
                                </span>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Description */}
            {business.description && (
                <div className="card p-5 mb-6">
                    <p className="text-xs text-gray-500 mb-2">Descripción</p>
                    <p className="text-sm text-gray-700">{business.description}</p>
                </div>
            )}

            {/* Owner */}
            <div className="card p-6 mb-6">
                <h2 className="text-sm font-semibold text-gray-800 mb-4">Dueño del negocio</h2>
                <Link
                    to={`/admin/users/${business.owner_id}`}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-50 transition-colors border border-gray-100"
                >
                    <Avatar name={business.owner_name ?? null} size="md" />
                    <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{business.owner_name ?? 'Usuario'}</p>
                        <p className="text-xs text-gray-500">{business.owner_email}</p>
                    </div>
                    <span className="text-gray-300">→</span>
                </Link>
            </div>

            {/* Users */}
            {business.users && business.users.length > 0 && (
                <div className="card p-6 mb-6">
                    <h2 className="text-sm font-semibold text-gray-800 mb-4">
                        Empleados ({business.users.length})
                    </h2>
                    <div className="space-y-2">
                        {business.users.map((u) => (
                            <Link
                                key={u.id}
                                to={`/admin/users/${u.user_id}`}
                                className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-50 transition-colors border border-gray-100"
                            >
                                <Avatar name={u.user_name} size="sm" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900">{u.user_name}</p>
                                    <p className="text-xs text-gray-500">{u.user_email}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {u.role_name && (
                                        <Badge variant="brand">
                                            {u.role_name}
                                        </Badge>
                                    )}
                                    {u.is_active ? (
                                        <Badge variant="green">Activo</Badge>
                                    ) : (
                                        <Badge variant="gray">Inactivo</Badge>
                                    )}
                                    <span className="text-gray-300">→</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Edit business modal */}
            {showEditBusiness && (
                <EditBusinessFullModal business={business} onClose={() => setShowEditBusiness(false)} />
            )}

            {/* Edit modules modal */}
            {showModuleEdit && (
                <EditModulesModal
                    business={business}
                    onClose={() => setShowModuleEdit(false)}
                />
            )}

            {/* Delete confirm */}
            <DeleteBusinessDialog
                business={business}
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
            />
        </div>
    )
}

function EditBusinessFullModal({ business, onClose }: { business: Business; onClose: () => void }) {
    const [formData, setFormData] = React.useState({
        name: business.name,
        description: business.description ?? '',
        business_type: business.business_type,
        plan_type: business.plan_type,
        max_users: business.max_users,
        max_products: business.max_products,
    })

    const update = useUpdateBusinessFull(business.id)

    return (
        <Modal isOpen onClose={onClose} title="Editar negocio completo" size="md">
            {update.error && (
                <div className="mb-4">
                    <ErrorAlert message={getApiErrorMessage(update.error)} />
                </div>
            )}

            <div className="space-y-4">
                <InputField
                    label="Nombre"
                    value={formData.name}
                    onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                />

                <TextareaField
                    label="Descripción"
                    value={formData.description}
                    onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                />

                <SelectField
                    label="Tipo de negocio"
                    value={formData.business_type}
                    onChange={(e) =>
                        setFormData((p) => ({ ...p, business_type: e.target.value as BusinessType }))
                    }
                    options={[
                        { value: 'retail', label: 'Minorista / Tienda' },
                        { value: 'restaurant', label: 'Restaurante / Comidas' },
                        { value: 'wholesale', label: 'Mayorista' },
                        { value: 'other', label: 'Otro' },
                    ]}
                />

                <SelectField
                    label="Plan"
                    value={formData.plan_type}
                    onChange={(e) => setFormData((p) => ({ ...p, plan_type: e.target.value as PlanType }))}
                    options={[
                        { value: 'free', label: 'Free' },
                        { value: 'basic', label: 'Basic' },
                        { value: 'professional', label: 'Professional' },
                        { value: 'enterprise', label: 'Enterprise' },
                    ]}
                />

                <div className="grid grid-cols-2 gap-3">
                    <InputField
                        label="Máx. usuarios"
                        type="number"
                        value={formData.max_users}
                        onChange={(e) => setFormData((p) => ({ ...p, max_users: Number(e.target.value) }))}
                    />
                    <InputField
                        label="Máx. productos"
                        type="number"
                        value={formData.max_products}
                        onChange={(e) => setFormData((p) => ({ ...p, max_products: Number(e.target.value) }))}
                    />
                </div>

                <div className="flex gap-3 pt-2">
                    <button onClick={onClose} className="btn-secondary flex-1">
                        Cancelar
                    </button>
                    <button onClick={() => update.mutate(formData, { onSuccess: onClose })} className="btn-primary flex-1">
                        {update.isPending ? <Spinner size="sm" /> : 'Guardar cambios'}
                    </button>
                </div>
            </div>
        </Modal>
    )
}

function DeleteBusinessDialog({
    business,
    isOpen,
    onClose,
}: {
    business: Business
    isOpen: boolean
    onClose: () => void
}) {
    const navigate = useNavigate()

    const deleteBusiness = useDeleteBusiness()

    return (
        <ConfirmDialog
            isOpen={isOpen}
            onClose={onClose}
            onConfirm={() => deleteBusiness.mutate(business.id)}
            title="Eliminar negocio"
            message={`¿Eliminar "${business.name}"? Esta acción no se puede deshacer y eliminará todos los datos asociados.`}
            confirmLabel="Eliminar negocio"
            danger
            loading={deleteBusiness.isPending}
        />
    )
}

function EditModulesModal({ business, onClose }: { business: Business; onClose: () => void }) {
    const [modules, setModules] = React.useState({
        module_inventory: business.module_inventory,
        module_sales: business.module_sales,
        module_clients: business.module_clients,
        module_portfolio: business.module_portfolio,
        module_finance: business.module_finance,
        module_suppliers: business.module_suppliers,
        module_reports: business.module_reports,
        module_waste: business.module_waste,
    })

    const updateModules = useUpdateBusinessModules(business.id)

    const handleSave = () => {
        updateModules.mutate(modules, { onSuccess: onClose })
    }

    return (
        <Modal isOpen onClose={onClose} title="Configurar módulos" size="md">
            <div className="space-y-3 mb-6">
                {Object.entries(MODULE_LABELS).map(([key, { label, icon }]) => (
                    <Checkbox
                        key={key}
                        label={`${icon} ${label}`}
                        checked={modules[key as keyof typeof modules]}
                        onChange={(v) => setModules((prev) => ({ ...prev, [key]: v }))}
                    />
                ))}
            </div>

            <div className="flex gap-3">
                <button onClick={onClose} className="btn-secondary flex-1">
                    Cancelar
                </button>
                <button
                    onClick={handleSave}
                    disabled={updateModules.isPending}
                    className="btn-primary flex-1"
                >
                    {updateModules.isPending ? <Spinner size="sm" /> : 'Guardar cambios'}
                </button>
            </div>
        </Modal>
    )
}