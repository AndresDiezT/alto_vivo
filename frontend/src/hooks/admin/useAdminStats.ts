import { useQuery } from '@tanstack/react-query'
import { adminStatsApi } from '@/api/admin/stats'

export function useAdminStats() {
    return useQuery({
        queryKey: ['admin', 'stats'],
        queryFn: adminStatsApi.getStats,
        staleTime: 1000 * 60 * 2, // 2 min
    })
}