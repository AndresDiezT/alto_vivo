import { Link, useNavigate } from 'react-router-dom'
import { Plus, Building2, ChevronRight, ArrowUpRight } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useBusinessList } from '@/hooks/useBusiness'
import { PageLoader, EmptyState, Badge } from '@/components/ui'
import { PLAN_LABELS, BUSINESS_TYPE_LABELS, getPlanBadgeClass } from '@/utils'
import type { Business } from '@/types'

const MAX_BUSINESSES: Record<string, number> = {
    free: 1, basic: 3, professional: 10, enterprise: 999,
}

export function DashboardPage() {
    const { user } = useAuthStore()
    const { data: businesses, isLoading } = useBusinessList()
    const navigate = useNavigate()

    const maxAllowed = MAX_BUSINESSES[user?.subscription_plan ?? 'free']
    const ownedCount = businesses?.filter((b) => b.owner_id === user?.id).length ?? 0
    const canCreate = ownedCount < maxAllowed

    if (isLoading) return <PageLoader />

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6 sm:mb-8">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                        Hola, {user?.full_name?.split(' ')[0] ?? user?.username} 👋
                    </h1>
                    <p className="text-gray-500 mt-0.5 text-sm">
                        Tienes{' '}
                        <span className="font-medium text-gray-700">
                            {businesses?.length ?? 0} negocio{businesses?.length !== 1 ? 's' : ''}
                        </span>{' '}
                        activos
                    </p>
                </div>

                {canCreate && (
                    <Link to="/businesses/new" className="btn-primary w-full sm:w-auto">
                        <Plus className="w-4 h-4" />
                        Nuevo negocio
                    </Link>
                )}
            </div>

            {/* Plan banner */}
            <div className="card p-4 sm:p-5 mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-5 h-5 text-brand-600" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-800">
                            Plan {PLAN_LABELS[user?.subscription_plan ?? 'free']}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                            {ownedCount} de {maxAllowed === 999 ? 'ilimitados' : maxAllowed} negocios propios
                        </p>
                    </div>
                </div>
                {user?.subscription_plan !== 'enterprise' && (
                    <button
                        onClick={() => navigate('/profile')}
                        className="btn-secondary btn-sm w-full sm:w-auto"
                    >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        Actualizar plan
                    </button>
                )}
            </div>

            {/* Negocios */}
            {!businesses || businesses.length === 0 ? (
                <div className="card">
                    <EmptyState
                        icon={<Building2 className="w-10 h-10 text-gray-300" />}
                        title="Sin negocios aún"
                        description="Crea tu primer negocio para comenzar a gestionar inventario, ventas y más."
                        action={
                            <Link to="/businesses/new" className="btn-primary">
                                <Plus className="w-4 h-4" />
                                Crear negocio
                            </Link>
                        }
                    />
                </div>
            ) : (
                <div>
                    {/* Mis negocios */}
                    {businesses.filter((b) => b.owner_id === user?.id).length > 0 && (
                        <section className="mb-6">
                            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                                Mis negocios
                            </h2>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {businesses
                                    .filter((b) => b.owner_id === user?.id)
                                    .map((b) => <BusinessCard key={b.id} business={b} isOwner />)}
                            </div>
                        </section>
                    )}

                    {/* Donde soy empleado */}
                    {businesses.filter((b) => b.owner_id !== user?.id).length > 0 && (
                        <section>
                            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                                Negocios donde trabajo
                            </h2>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {businesses
                                    .filter((b) => b.owner_id !== user?.id)
                                    .map((b) => <BusinessCard key={b.id} business={b} isOwner={false} />)}
                            </div>
                        </section>
                    )}
                </div>
            )}
        </div>
    )
}

function BusinessCard({ business, isOwner }: { business: Business; isOwner: boolean }) {
    const activeModules = [
        business.module_inventory, business.module_sales, business.module_clients,
        business.module_portfolio, business.module_finance, business.module_suppliers,
        business.module_reports, business.module_waste,
    ].filter(Boolean).length

    return (
        <Link
            to={`/businesses/${business.id}`}
            className="card-hover p-5 flex flex-col gap-4 animate-fade-in"
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-4.5 h-4.5 text-brand-600" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">{business.name}</h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {BUSINESS_TYPE_LABELS[business.business_type]}
                        </p>
                    </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" />
            </div>

            <div className="flex items-center justify-between">
                <span className={getPlanBadgeClass(business.plan_type)}>
                    {PLAN_LABELS[business.plan_type]}
                </span>
                <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-400">{activeModules}/8 módulos</span>
                    {isOwner && (
                        <span className="text-[10px] bg-brand-50 text-brand-600 border border-brand-100 rounded-full px-1.5 py-0.5 font-medium">
                            Dueño
                        </span>
                    )}
                </div>
            </div>
        </Link>
    )
}