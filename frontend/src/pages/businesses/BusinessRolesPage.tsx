import { useParams, Link } from 'react-router-dom'
import { Plus, Pencil, Trash2, Lock } from 'lucide-react'
import React from 'react'
import { useRoleList, useDeleteRole } from '@/hooks/useBusiness'
import { PageLoader, EmptyState, ConfirmDialog } from '@/components/ui'
import type { BusinessRole } from '@/types'

export function BusinessRolesPage() {
    const { id } = useParams<{ id: string }>()
    const businessId = Number(id)

    const { data: roles, isLoading } = useRoleList(businessId)
    const deleteRole = useDeleteRole(businessId)

    const [deleteTarget, setDeleteTarget] = React.useState<BusinessRole | null>(null)

    if (isLoading) return <PageLoader />

    const handleDelete = () => {
        if (!deleteTarget) return
        deleteRole.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
    }

    return (
        <div className="p-8 max-w-4xl mx-auto animate-fade-in">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Roles del negocio</h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Controla qué puede hacer cada usuario
                    </p>
                </div>
                <Link to={`/businesses/${id}/roles/new`} className="btn-primary">
                    <Plus className="w-4 h-4" />
                    Nuevo rol
                </Link>
            </div>

            {!roles || roles.length === 0 ? (
                <div className="card">
                    <EmptyState
                        title="Sin roles personalizados"
                        description="El rol 'Empleado' es el único disponible. Crea roles para controlar el acceso."
                        action={
                            <Link to={`/businesses/${id}/roles/new`} className="btn-primary btn-sm">
                                <Plus className="w-4 h-4" />
                                Crear rol
                            </Link>
                        }
                    />
                </div>
            ) : (
                <div className="space-y-3">
                    {roles.map((role) => (
                        <div key={role.id} className="card p-5">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-sm font-semibold text-gray-900">{role.name}</h3>
                                        {role.is_default && (
                                            <span className="flex items-center gap-1 text-[11px] bg-amber-50 text-amber-600 border border-amber-100 rounded-full px-2 py-0.5">
                                                <Lock className="w-2.5 h-2.5" />
                                                Por defecto
                                            </span>
                                        )}
                                        {role.can_manage_users && (
                                            <span className="text-[11px] bg-blue-50 text-blue-600 border border-blue-100 rounded-full px-2 py-0.5">
                                                Gestiona usuarios
                                            </span>
                                        )}
                                        {role.can_manage_roles && (
                                            <span className="text-[11px] bg-purple-50 text-purple-600 border border-purple-100 rounded-full px-2 py-0.5">
                                                Gestiona roles
                                            </span>
                                        )}
                                    </div>

                                    {role.description && (
                                        <p className="text-xs text-gray-500 mb-2">{role.description}</p>
                                    )}

                                    {/* Permisos agrupados */}
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        {Object.entries(
                                            role.permissions.reduce((acc, p) => {
                                                acc[p.module] = (acc[p.module] ?? 0) + 1
                                                return acc
                                            }, {} as Record<string, number>)
                                        ).map(([mod, count]) => (
                                            <span key={mod} className="badge badge-gray text-[11px]">
                                                {mod} ({count})
                                            </span>
                                        ))}
                                        {role.permissions.length === 0 && (
                                            <span className="text-xs text-gray-400">Sin permisos asignados</span>
                                        )}
                                    </div>
                                </div>

                                {/* Acciones */}
                                {!role.is_default && (
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        <Link
                                            to={`/businesses/${id}/roles/${role.id}`}
                                            className="btn-ghost btn-sm p-2"
                                            title="Editar"
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </Link>
                                        <button
                                            onClick={() => setDeleteTarget(role)}
                                            className="btn-ghost btn-sm p-2 text-red-400 hover:text-red-600 hover:bg-red-50"
                                            title="Eliminar"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <ConfirmDialog
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                title="Eliminar rol"
                message={`¿Eliminar el rol "${deleteTarget?.name}"? Los usuarios con este rol quedarán sin rol asignado.`}
                confirmLabel="Eliminar"
                danger
                loading={deleteRole.isPending}
            />
        </div>
    )
}