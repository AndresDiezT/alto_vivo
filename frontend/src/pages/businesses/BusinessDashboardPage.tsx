import { useParams, Link } from 'react-router-dom'
import { Users, Shield, Settings, ArrowRight } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useBusiness, useBusinessUsers, useRoleList } from '@/hooks/useBusiness'
import { PageLoader, Badge } from '@/components/ui'
import { MODULE_LABELS, PLAN_LABELS, BUSINESS_TYPE_LABELS, formatDate } from '@/utils'

export function BusinessDashboardPage() {
    const { id } = useParams<{ id: string }>()
    const businessId = Number(id)
    const { user } = useAuthStore()
    const { data: business, isLoading } = useBusiness(businessId)
    const { data: users } = useBusinessUsers(businessId)
    const { data: roles } = useRoleList(businessId)

    if (isLoading || !business) return <PageLoader />

    const isOwner = business.owner_id === user?.id
    const activeModules = Object.entries(MODULE_LABELS).filter(([key]) => (business as any)[key])
    const inactiveModules = Object.entries(MODULE_LABELS).filter(([key]) => !(business as any)[key])

    return (
        <div className="p-8 max-w-5xl mx-auto animate-fade-in">
            {/* Header */}
            <div className="flex items-start justify-between mb-8">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <h1 className="text-2xl font-bold text-gray-900">{business.name}</h1>
                        <Badge variant="gray">{BUSINESS_TYPE_LABELS[business.business_type]}</Badge>
                    </div>
                    {business.description && (
                        <p className="text-sm text-gray-500">{business.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                        Creado el {formatDate(business.created_at)}
                    </p>
                </div>

                {isOwner && (
                    <Link to={`/businesses/${id}/settings`} className="btn-secondary btn-sm">
                        <Settings className="w-4 h-4" />
                        Configuración
                    </Link>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="card p-5">
                    <p className="text-xs text-gray-500 mb-1">Plan</p>
                    <p className="text-lg font-bold text-gray-900">{PLAN_LABELS[business.plan_type]}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Suscripción activa</p>
                </div>
                <div className="card p-5">
                    <p className="text-xs text-gray-500 mb-1">Usuarios</p>
                    <p className="text-lg font-bold text-gray-900">
                        {(users?.length ?? 0) + 1}
                        <span className="text-sm font-normal text-gray-400"> / {business.max_users + 1}</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">Incluyendo dueño</p>
                </div>
                <div className="card p-5">
                    <p className="text-xs text-gray-500 mb-1">Módulos</p>
                    <p className="text-lg font-bold text-gray-900">
                        {activeModules.length}
                        <span className="text-sm font-normal text-gray-400"> / 8</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">Activos</p>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Módulos activos */}
                <div className="card p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-semibold text-gray-800">Módulos activos</h2>
                    </div>
                    <div className="space-y-1">
                        {activeModules.map(([key, { label, icon }]) => (
                            <Link
                                key={key}
                                to={`/businesses/${id}/${key.replace('module_', '')}`}
                                className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-surface-50 transition-colors group"
                            >
                                <span className="text-sm text-gray-700">
                                    {icon} {label}
                                </span>
                                <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-brand-500 transition-colors" />
                            </Link>
                        ))}
                    </div>

                    {inactiveModules.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-xs text-gray-400 mb-2">No incluidos en tu plan</p>
                            {inactiveModules.map(([key, { label, icon }]) => (
                                <div key={key} className="flex items-center gap-2 px-3 py-2 text-gray-300 text-sm">
                                    {icon} {label}
                                    <span className="ml-auto text-[10px] bg-gray-50 text-gray-400 rounded-full px-1.5 py-0.5 border">
                                        Pro
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Admin acciones */}
                {isOwner && (
                    <div className="space-y-4">
                        <div className="card p-5">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-sm font-semibold text-gray-800">Equipo</h2>
                                <Link to={`/businesses/${id}/users`} className="text-xs text-brand-600 hover:underline">
                                    Gestionar →
                                </Link>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                                    <Users className="w-5 h-5 text-blue-500" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">
                                        {users?.length ?? 0} empleado{users?.length !== 1 ? 's' : ''}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        Máximo {business.max_users} según tu plan
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="card p-5">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-sm font-semibold text-gray-800">Roles</h2>
                                <Link to={`/businesses/${id}/roles`} className="text-xs text-brand-600 hover:underline">
                                    Gestionar →
                                </Link>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                                    <Shield className="w-5 h-5 text-purple-500" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">
                                        {roles?.length ?? 0} rol{roles?.length !== 1 ? 'es' : ''}
                                    </p>
                                    <p className="text-xs text-gray-400">Incluye el rol Empleado por defecto</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}