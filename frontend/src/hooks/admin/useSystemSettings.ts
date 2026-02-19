import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsApi } from '@/api/admin/settings'

export function useSystemSettings() {
    return useQuery({
        queryKey: ['admin', 'settings'],
        queryFn: settingsApi.list,
        staleTime: 1000 * 60 * 5,
    })
}

export function useBulkUpdateSettings() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: settingsApi.bulkUpdate,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['admin', 'settings'] })
        },
    })
}