import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Ban, CheckCircle, Edit, Shield, CreditCard, Building2 } from 'lucide-react'
import React from 'react'
import { useAuthStore } from '@/store/authStore'
import { useAdminUser, useToggleUserActive, useUpdateUserFull } from '@/hooks/admin/useAdminUsers'
import {
    PageLoader, Badge, Modal, InputField, SelectField,
    ConfirmDialog, Spinner, ErrorAlert,
} from '@/components/ui'
import { formatDate, PLAN_LABELS, BUSINESS_TYPE_LABELS, getApiErrorMessage } from '@/utils'
import type { Business, SystemRole, SubscriptionPlan } from '@/types'
import type { UserUpdateFull } from '@/api/admin/users'

export function AdminUserDetailPage() {
    const { id } = useParams<{ id: string }>()
    const userId = Number(id)
    const { user: currentUser } = useAuthStore()
    const [showEditUser, setShowEditUser] = React.useState(false)
    const [showDeactivate, setShowDeactivate] = React.useState(false)

    const { data: user, isLoading } = useAdminUser(userId)
    const toggleActive = useToggleUserActive()

    if (isLoading) return <PageLoader />
    if (!user) return null

    const isSuperAdmin = currentUser?.system_role === 'super_admin'
    const isAdmin = currentUser?.system_role === 'admin' || isSuperAdmin
    const isSelf = currentUser?.id === userId

    const canEdit = isSuperAdmin
    const canToggleActive = isSuperAdmin && !isSelf

    const ownedCount = user.owned_businesses?.length ?? 0
    const memberCount = user.member_businesses?.length ?? 0

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <Link to="/admin/users" className="btn-ghost btn-sm p-2">
                    <ArrowLeft className="w-4 h-4" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-xl font-bold text-gray-900">{user.full_name ?? user.username}</h1>
                    <p className="text-sm text-gray-500">{user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                    {canEdit && (
                        <button onClick={() => setShowEditUser(true)} className="btn-secondary btn-sm">
                            <Edit className="w-4 h-4" />
                            Editar
                        </button>
                    )}
                    {canToggleActive && (
                        <button
                            onClick={() => setShowDeactivate(true)}
                            className={`btn-sm ${user.is_active ? 'btn-danger' : 'btn-primary'}`}
                        >
                            {user.is_active ? (
                                <><Ban className="w-4 h-4" /> Desactivar</>
                            ) : (
                                <><CheckCircle className="w-4 h-4" /> Activar</>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* Info cards */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="card p-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                            <Shield className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Rol del sistema</p>
                            <Badge variant={user.system_role === 'super_admin' ? 'red' : 'brand'}>
                                {user.system_role}
                            </Badge>
                        </div>
                    </div>
                </div>

                <div className="card p-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                            <CreditCard className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Plan</p>
                            <p className="text-sm font-semibold text-gray-900">
                                {PLAN_LABELS[user.subscription_plan]}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="card p-5">
                    <p className="text-xs text-gray-500 mb-1">Estado</p>
                    {user.is_active ? (
                        <Badge variant="green">Activo</Badge>
                    ) : (
                        <Badge variant="gray">Inactivo</Badge>
                    )}
                    {user.is_verified && (
                        <p className="text-xs text-green-600 mt-1">✓ Email verificado</p>
                    )}
                </div>

                <div className="card p-5">
                    <p className="text-xs text-gray-500 mb-1">Registro</p>
                    <p className="text-sm text-gray-900">{formatDate(user.created_at)}</p>
                </div>
            </div>

            {/* Personal info */}
            <div className="card p-6 mb-6">
                <h2 className="text-sm font-semibold text-gray-800 mb-4">Información personal</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                        <p className="text-xs text-gray-500 mb-1">Nombre completo</p>
                        <p className="text-sm text-gray-900">{user.full_name || '—'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 mb-1">Username</p>
                        <p className="text-sm text-gray-900">@{user.username}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 mb-1">Email</p>
                        <p className="text-sm text-gray-900">{user.email}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 mb-1">Teléfono</p>
                        <p className="text-sm text-gray-900">{user.phone || '—'}</p>
                    </div>
                </div>
            </div>

            {/* Owned businesses */}
            {ownedCount > 0 && (
                <div className="card p-6 mb-6">
                    <h2 className="text-sm font-semibold text-gray-800 mb-4">
                        Negocios propios ({ownedCount})
                    </h2>
                    <div className="space-y-2">
                        {user.owned_businesses?.map((b) => (
                            <BusinessRow key={b.id} business={b} />
                        ))}
                    </div>
                </div>
            )}

            {/* Member businesses */}
            {memberCount > 0 && (
                <div className="card p-6">
                    <h2 className="text-sm font-semibold text-gray-800 mb-4">
                        Negocios donde es empleado ({memberCount})
                    </h2>
                    <div className="space-y-2">
                        {user.member_businesses?.map((b) => (
                            <BusinessRow key={b.id} business={b} />
                        ))}
                    </div>
                </div>
            )}

            {ownedCount === 0 && memberCount === 0 && (
                <div className="card p-6">
                    <p className="text-sm text-gray-400 text-center py-8">
                        Este usuario no tiene negocios asociados
                    </p>
                </div>
            )}

            {showEditUser && (
                <EditUserFullModal user={user} onClose={() => setShowEditUser(false)} />
            )}

            <ConfirmDialog
                isOpen={showDeactivate}
                onClose={() => setShowDeactivate(false)}
                onConfirm={() => toggleActive.mutate(userId, { onSuccess: () => setShowDeactivate(false) })}
                title={user.is_active ? 'Desactivar usuario' : 'Activar usuario'}
                message={
                    user.is_active
                        ? `¿Desactivar a ${user.email}? No podrá iniciar sesión.`
                        : `¿Activar a ${user.email}?`
                }
                confirmLabel={user.is_active ? 'Desactivar' : 'Activar'}
                danger={user.is_active}
                loading={toggleActive.isPending}
            />
        </div>
    )
}

function BusinessRow({ business }: { business: Business }) {
    return (
        <Link
            to={`/admin/businesses/${business.id}`}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-50 transition-colors border border-gray-100"
        >
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{business.name}</p>
                <p className="text-xs text-gray-500">
                    {BUSINESS_TYPE_LABELS[business.business_type]} · {PLAN_LABELS[business.plan_type]}
                </p>
            </div>
            <div className="flex items-center gap-2">
                {business.is_active ? (
                    <Badge variant="green">Activo</Badge>
                ) : (
                    <Badge variant="gray">Inactivo</Badge>
                )}
                <span className="text-gray-300">→</span>
            </div>
        </Link>
    )
}

function EditUserFullModal({ user, onClose }: { user: any; onClose: () => void }) {
    const [formData, setFormData] = React.useState<UserUpdateFull>({
        full_name: user.full_name ?? '',
        email: user.email,
        phone: user.phone ?? '',
        system_role: user.system_role,
        subscription_plan: user.subscription_plan,
    })

    const update = useUpdateUserFull(user.id)

    return (
        <Modal isOpen onClose={onClose} title="Editar usuario" size="md">
            {update.error && (
                <div className="mb-4">
                    <ErrorAlert message={getApiErrorMessage(update.error)} />
                </div>
            )}
            <div className="space-y-4">
                <InputField
                    label="Nombre completo"
                    value={formData.full_name ?? ''}
                    onChange={(e) => setFormData((p) => ({ ...p, full_name: e.target.value }))}
                />
                <InputField
                    label="Email"
                    type="email"
                    value={formData.email ?? ''}
                    onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                />
                <InputField
                    label="Teléfono"
                    value={formData.phone ?? ''}
                    onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                />
                <SelectField
                    label="Rol del sistema"
                    value={formData.system_role ?? ''}
                    onChange={(e) => setFormData((p) => ({ ...p, system_role: e.target.value as SystemRole }))}
                    options={[
                        { value: 'user', label: 'Usuario' },
                        { value: 'support', label: 'Soporte' },
                        { value: 'admin', label: 'Admin' },
                        { value: 'super_admin', label: 'Super Admin' },
                    ]}
                />
                <SelectField
                    label="Plan de suscripción"
                    value={formData.subscription_plan ?? ''}
                    onChange={(e) => setFormData((p) => ({ ...p, subscription_plan: e.target.value as SubscriptionPlan }))}
                    options={[
                        { value: 'free', label: 'Free' },
                        { value: 'basic', label: 'Basic' },
                        { value: 'professional', label: 'Professional' },
                        { value: 'enterprise', label: 'Enterprise' },
                    ]}
                />
                <div className="flex gap-3 pt-2">
                    <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
                    <button
                        onClick={() => update.mutate(formData, { onSuccess: onClose })}
                        disabled={update.isPending}
                        className="btn-primary flex-1"
                    >
                        {update.isPending ? <Spinner size="sm" /> : 'Guardar cambios'}
                    </button>
                </div>
            </div>
        </Modal>
    )
}