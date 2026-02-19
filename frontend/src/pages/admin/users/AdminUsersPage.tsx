
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Ban, CheckCircle, Edit, X } from 'lucide-react'
import { useAdminUsers, useUpdateUserAdmin, useToggleUserActive } from '@/hooks/admin/useAdminUsers'
import { useAuthStore } from '@/store/authStore'
import {
    PageLoader, Avatar, Badge, Modal, SelectField, ConfirmDialog, Spinner,
} from '@/components/ui'
import { formatDate } from '@/utils'
import type { User, SystemRole, SubscriptionPlan } from '@/types'
import type { AdminUsersFilters } from '@/api/admin/users'
import { useDebounce } from '@/hooks/useDebounce'

export function AdminUsersPage() {
    const { user: currentUser } = useAuthStore()
    const navigate = useNavigate()
    const [editUser, setEditUser] = React.useState<User | null>(null)
    const [deactivateUser, setDeactivateUser] = React.useState<User | null>(null)

    const [rawSearch, setRawSearch] = React.useState('')
    const [filters, setFilters] = React.useState<AdminUsersFilters>({})
    const search = useDebounce(rawSearch, 300)

    const { data: users, isLoading } = useAdminUsers({ search: search || undefined, ...filters })

    const activeFiltersCount = Object.values(filters).filter((v) => v !== undefined).length

    const setFilter = <K extends keyof AdminUsersFilters>(
        key: K,
        value: AdminUsersFilters[K]
    ) => {
        setFilters((prev) => {
            const next = { ...prev }

            if (
                value === undefined ||
                (typeof value === 'string' && value.trim() === '')
            ) {
                delete next[key]
            } else {
                next[key] = value
            }

            return next
        })
    }

    const clearFilters = () => {
        setFilters({})
        setRawSearch('')
    }

    if (isLoading) return <PageLoader />

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Usuarios del sistema</h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {users?.length ?? 0} usuarios encontrados
                    </p>
                </div>
            </div>

            {/* Search + Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1 sm:max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por email, username o nombre..."
                        value={rawSearch}
                        onChange={(e) => setRawSearch(e.target.value)}
                        className="input pl-10 w-full"
                    />
                </div>

                {/* Filter selects inline */}
                <select
                    className="input w-full sm:w-auto"
                    value={filters.system_role ?? ''}
                    onChange={(e) => setFilter('system_role', e.target.value as SystemRole || undefined)}
                >
                    <option value="">Todos los roles</option>
                    <option value="user">Usuario</option>
                    <option value="support">Soporte</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                </select>

                <select
                    className="input w-full sm:w-auto"
                    value={filters.subscription_plan ?? ''}
                    onChange={(e) => setFilter('subscription_plan', e.target.value as SubscriptionPlan || undefined)}
                >
                    <option value="">Todos los planes</option>
                    <option value="free">Free</option>
                    <option value="basic">Basic</option>
                    <option value="professional">Professional</option>
                    <option value="enterprise">Enterprise</option>
                </select>

                <select
                    className="input w-full sm:w-auto"
                    value={filters.is_active === undefined ? '' : String(filters.is_active)}
                    onChange={(e) =>
                        setFilter('is_active', e.target.value === '' ? undefined : e.target.value === 'true')
                    }
                >
                    <option value="">Todos los estados</option>
                    <option value="true">Activos</option>
                    <option value="false">Inactivos</option>
                </select>

                <select
                    className="input w-full sm:w-auto"
                    value={filters.is_verified === undefined ? '' : String(filters.is_verified)}
                    onChange={(e) =>
                        setFilter('is_verified', e.target.value === '' ? undefined : e.target.value === 'true')
                    }
                >
                    <option value="">Verificación</option>
                    <option value="true">Verificados</option>
                    <option value="false">Sin verificar</option>
                </select>

                {(activeFiltersCount > 0 || rawSearch) && (
                    <button onClick={clearFilters} className="btn-ghost btn-sm flex items-center gap-1.5 whitespace-nowrap">
                        <X className="w-4 h-4" />
                        Limpiar
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-surface-50 border-b border-gray-100">
                            <tr>
                                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Usuario</th>
                                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Rol</th>
                                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Plan</th>
                                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Estado</th>
                                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Registro</th>
                                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {users?.map((u) => (
                                <tr
                                    key={u.id}
                                    onClick={() => navigate(`/admin/users/${u.id}`)}
                                    className="hover:bg-surface-50 transition-colors cursor-pointer"
                                >
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <Avatar name={u.full_name ?? u.username} size="sm" />
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">
                                                    {u.full_name ?? u.username}
                                                </p>
                                                <p className="text-xs text-gray-500 truncate">{u.email}</p>
                                                {u.is_verified && (
                                                    <span className="text-xs text-green-600">✓ verificado</span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <Badge variant={
                                            u.system_role === 'super_admin' ? 'red' :
                                                u.system_role === 'admin' ? 'yellow' :
                                                    u.system_role === 'support' ? 'brand' : 'gray'
                                        }>
                                            {u.system_role}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-sm text-gray-600 capitalize">{u.subscription_plan}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        {u.is_active ? <Badge variant="green">Activo</Badge> : <Badge variant="gray">Inactivo</Badge>}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-xs text-gray-500">{formatDate(u.created_at)}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-end gap-1">
                                            {currentUser?.system_role === 'super_admin' && (
                                                <>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setEditUser(u) }}
                                                        className="btn-ghost btn-sm p-2"
                                                        title="Editar"
                                                    >
                                                        <Edit className="w-3.5 h-3.5" />
                                                    </button>
                                                    {u.id !== currentUser.id && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setDeactivateUser(u) }}
                                                            className="btn-ghost btn-sm p-2 text-red-500 hover:bg-red-50"
                                                            title={u.is_active ? 'Desactivar' : 'Activar'}
                                                        >
                                                            {u.is_active ? <Ban className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {users?.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-sm text-gray-400">No se encontraron usuarios</p>
                    </div>
                )}
            </div>

            {editUser && <EditUserModal user={editUser} onClose={() => setEditUser(null)} />}
            {deactivateUser && <DeactivateUserDialog user={deactivateUser} onClose={() => setDeactivateUser(null)} />}
        </div>
    )
}

function EditUserModal({ user, onClose }: { user: User; onClose: () => void }) {
    const [systemRole, setSystemRole] = React.useState(user.system_role)
    const [subscriptionPlan, setSubscriptionPlan] = React.useState(user.subscription_plan)

    const updateUser = useUpdateUserAdmin()

    const handleSave = () => {
        updateUser.mutate(
            {
                userId: user.id,
                data: {
                    system_role: systemRole,
                    subscription_plan: subscriptionPlan,
                },
            },
            { onSuccess: onClose }
        )
    }

    return (
        <Modal isOpen onClose={onClose} title="Editar usuario" size="sm">
            <div className="space-y-4">
                <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Usuario</p>
                    <p className="text-sm text-gray-900">{user.email}</p>
                </div>

                <SelectField
                    label="Rol del sistema"
                    value={systemRole}
                    onChange={(e) => setSystemRole(e.target.value as SystemRole)}
                    options={[
                        { value: 'user', label: 'Usuario' },
                        { value: 'support', label: 'Soporte' },
                        { value: 'admin', label: 'Admin' },
                        { value: 'super_admin', label: 'Super Admin' },
                    ]}
                />

                <SelectField
                    label="Plan de suscripción"
                    value={subscriptionPlan}
                    onChange={(e) => setSubscriptionPlan(e.target.value as SubscriptionPlan)}
                    options={[
                        { value: 'free', label: 'Free' },
                        { value: 'basic', label: 'Basic' },
                        { value: 'professional', label: 'Professional' },
                        { value: 'enterprise', label: 'Enterprise' },
                    ]}
                />

                <div className="flex gap-3 pt-2">
                    <button onClick={onClose} className="btn-secondary flex-1">
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={updateUser.isPending}
                        className="btn-primary flex-1"
                    >
                        {updateUser.isPending ? <Spinner size="sm" /> : 'Guardar'}
                    </button>
                </div>
            </div>
        </Modal>
    )
}

function DeactivateUserDialog({ user, onClose }: { user: User; onClose: () => void }) {
    const toggleActive = useToggleUserActive()

    const handleConfirm = () => {
        toggleActive.mutate(user.id, { onSuccess: onClose })
    }

    return (
        <ConfirmDialog
            isOpen
            onClose={onClose}
            onConfirm={handleConfirm}
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
    )
}