import { useParams, Link } from 'react-router-dom'
import { Plus, Pencil, Trash2, Crown } from 'lucide-react'
import React from 'react'
import { useBusiness, useBusinessUsers, useRemoveUser, useUpdateUserRole, useRoleList } from '@/hooks/useBusiness'
import {
    PageLoader, EmptyState, Avatar, ConfirmDialog,
    Modal, SelectField, ErrorAlert, Spinner,
} from '@/components/ui'
import { useAuthStore } from '@/store/authStore'
import { formatDate, getApiErrorMessage } from '@/utils'
import type { BusinessUserResponse } from '@/types'

export function BusinessUsersPage() {
    const { id } = useParams<{ id: string }>()
    const businessId = Number(id)
    const { user } = useAuthStore()

    const { data: business } = useBusiness(businessId)
    const { data: users, isLoading } = useBusinessUsers(businessId)
    const { data: roles } = useRoleList(businessId)

    const removeUser = useRemoveUser(businessId)
    const updateRole = useUpdateUserRole(businessId)

    const [removeTarget, setRemoveTarget] = React.useState<BusinessUserResponse | null>(null)
    const [editTarget, setEditTarget] = React.useState<BusinessUserResponse | null>(null)
    const [selectedRole, setSelectedRole] = React.useState<string>('')

    const isOwner = business?.owner_id === user?.id

    if (isLoading) return <PageLoader />

    const handleRemove = () => {
        if (!removeTarget) return
        removeUser.mutate(removeTarget.user_id, { onSuccess: () => setRemoveTarget(null) })
    }

    const handleRoleChange = () => {
        if (!editTarget || !selectedRole) return
        updateRole.mutate(
            { userId: editTarget.user_id, roleId: Number(selectedRole) },
            { onSuccess: () => setEditTarget(null) }
        )
    }

    const openEditRole = (u: BusinessUserResponse) => {
        setEditTarget(u)
        setSelectedRole(String(u.role_id ?? ''))
    }

    const roleOptions = (roles ?? []).map((r) => ({ value: String(r.id), label: r.name }))

    return (
        <div className="p-8 max-w-4xl mx-auto animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Usuarios del negocio</h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {(users?.length ?? 0) + 1} personas ·{' '}
                        máx. {(business?.max_users ?? 1) + 1} según plan
                    </p>
                </div>
                {isOwner && (
                    <Link to={`/businesses/${id}/users/invite`} className="btn-primary">
                        <Plus className="w-4 h-4" />
                        Invitar usuario
                    </Link>
                )}
            </div>

            {/* Tabla */}
            <div className="card overflow-hidden">
                {/* Dueño */}
                <div className="flex items-center gap-4 p-4 bg-amber-50 border-b border-amber-100">
                    <Avatar name={user?.full_name ?? user?.username ?? null} size="md" />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-gray-900">
                                {user?.full_name ?? user?.username}
                            </p>
                            <span className="badge badge-yellow text-[11px]">
                                <Crown className="w-2.5 h-2.5" /> Dueño
                            </span>
                        </div>
                        <p className="text-xs text-gray-500">{user?.email}</p>
                    </div>
                </div>

                {/* Empleados */}
                {!users || users.length === 0 ? (
                    <EmptyState
                        icon={<span className="text-3xl">👥</span>}
                        title="Sin empleados aún"
                        description="Invita usuarios para que trabajen en este negocio."
                        action={
                            isOwner ? (
                                <Link to={`/businesses/${id}/users/invite`} className="btn-primary btn-sm">
                                    <Plus className="w-4 h-4" />
                                    Invitar usuario
                                </Link>
                            ) : undefined
                        }
                    />
                ) : (
                    <div className="divide-y divide-gray-50">
                        {users.map((u) => (
                            <div key={u.id} className="flex items-center gap-4 p-4 hover:bg-surface-50 transition-colors">
                                <Avatar name={u.user_name} size="md" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-900">{u.user_name}</p>
                                    <p className="text-xs text-gray-400">
                                        {u.user_email} · Se unió {formatDate(u.joined_at)}
                                    </p>
                                </div>

                                {/* Rol */}
                                <span className="badge badge-brand text-xs">
                                    {u.role_name ?? 'Sin rol'}
                                </span>

                                {/* Acciones (solo dueño) */}
                                {isOwner && (
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => openEditRole(u)}
                                            className="btn-ghost btn-sm p-2"
                                            title="Cambiar rol"
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => setRemoveTarget(u)}
                                            className="btn-ghost btn-sm p-2 text-red-400 hover:text-red-600 hover:bg-red-50"
                                            title="Eliminar"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal: cambiar rol */}
            <Modal
                isOpen={!!editTarget}
                onClose={() => setEditTarget(null)}
                title="Cambiar rol"
                size="sm"
            >
                {updateRole.error && (
                    <div className="mb-3">
                        <ErrorAlert message={getApiErrorMessage(updateRole.error)} />
                    </div>
                )}
                <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                        Cambiar el rol de <strong>{editTarget?.user_name}</strong>
                    </p>
                    <SelectField
                        label="Nuevo rol"
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value)}
                        options={roleOptions}
                    />
                    <div className="flex gap-2 justify-end">
                        <button onClick={() => setEditTarget(null)} className="btn-secondary btn-sm">
                            Cancelar
                        </button>
                        <button
                            onClick={handleRoleChange}
                            disabled={updateRole.isPending}
                            className="btn-primary btn-sm"
                        >
                            {updateRole.isPending ? <Spinner size="sm" /> : 'Guardar'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Confirm: eliminar */}
            <ConfirmDialog
                isOpen={!!removeTarget}
                onClose={() => setRemoveTarget(null)}
                onConfirm={handleRemove}
                title="Remover usuario"
                message={`¿Remover a ${removeTarget?.user_name} del negocio?`}
                confirmLabel="Remover"
                danger
                loading={removeUser.isPending}
            />
        </div>
    )
}