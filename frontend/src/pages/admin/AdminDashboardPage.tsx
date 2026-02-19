import { Users, Building2, Activity, TrendingUp } from 'lucide-react'
import { useAdminStats } from '@/hooks/admin/useAdminStats'
import { PageLoader } from '@/components/ui'

export function AdminDashboardPage() {
    const { data: stats, isLoading } = useAdminStats()

    if (isLoading) return <PageLoader />

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Panel de administración</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Vista general del sistema
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard
                    icon={<Users className="w-5 h-5 text-blue-600" />}
                    label="Total usuarios"
                    value={stats?.total_users ?? 0}
                    bgColor="bg-blue-50"
                />
                <StatCard
                    icon={<Activity className="w-5 h-5 text-green-600" />}
                    label="Usuarios activos"
                    value={stats?.active_users ?? 0}
                    bgColor="bg-green-50"
                />
                <StatCard
                    icon={<Building2 className="w-5 h-5 text-purple-600" />}
                    label="Total negocios"
                    value={stats?.total_businesses ?? 0}
                    bgColor="bg-purple-50"
                />
                <StatCard
                    icon={<TrendingUp className="w-5 h-5 text-orange-600" />}
                    label="Negocios activos"
                    value={stats?.active_businesses ?? 0}
                    bgColor="bg-orange-50"
                />
            </div>

            {/* Recent activity */}
            <div className="card p-6">
                <h2 className="text-sm font-semibold text-gray-800 mb-4">
                    Actividad reciente
                </h2>
                <p className="text-sm text-gray-400 text-center py-8">
                    Sin actividad reciente para mostrar
                </p>
            </div>
        </div>
    )
}

function StatCard({
    icon,
    label,
    value,
    bgColor,
}: {
    icon: React.ReactNode
    label: string
    value: number
    bgColor: string
}) {
    return (
        <div className="card p-5">
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${bgColor} flex items-center justify-center flex-shrink-0`}>
                    {icon}
                </div>
                <div>
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
                </div>
            </div>
        </div>
    )
}