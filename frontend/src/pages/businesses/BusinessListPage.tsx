import { Link } from 'react-router-dom'
import { Plus, Building2, ChevronRight } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useBusinessList } from '@/hooks/useBusiness'
import { PageLoader, EmptyState } from '@/components/ui'
import { PLAN_LABELS, BUSINESS_TYPE_LABELS, getPlanBadgeClass } from '@/utils'

export function BusinessListPage() {
    const { user } = useAuthStore()
    const { data: businesses, isLoading } = useBusinessList()

    if (isLoading) return <PageLoader />

    return (
        <div className="p-8 max-w-4xl mx-auto animate-fade-in">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Mis negocios</h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {businesses?.length ?? 0} negocios activos
                    </p>
                </div>
                <Link to="/businesses/new" className="btn-primary">
                    <Plus className="w-4 h-4" />
                    Nuevo negocio
                </Link>
            </div>

            {!businesses || businesses.length === 0 ? (
                <div className="card">
                    <EmptyState
                        icon={<Building2 className="w-10 h-10 text-gray-300" />}
                        title="Sin negocios"
                        description="Crea tu primer negocio para empezar."
                        action={
                            <Link to="/businesses/new" className="btn-primary">
                                <Plus className="w-4 h-4" />
                                Crear negocio
                            </Link>
                        }
                    />
                </div>
            ) : (
                <div className="space-y-2">
                    {businesses.map((b) => (
                        <Link
                            key={b.id}
                            to={`/businesses/${b.id}`}
                            className="card-hover flex items-center gap-4 p-4"
                        >
                            <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                                <Building2 className="w-5 h-5 text-brand-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">{b.name}</p>
                                <p className="text-xs text-gray-400">
                                    {BUSINESS_TYPE_LABELS[b.business_type]}
                                    {b.owner_id === user?.id ? ' · Dueño' : ' · Empleado'}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <span className={getPlanBadgeClass(b.plan_type)}>
                                    {PLAN_LABELS[b.plan_type]}
                                </span>
                                <ChevronRight className="w-4 h-4 text-gray-300" />
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}