import { useQuery } from '@tanstack/react-query'
import { auditLogsApi, type AuditLogFilters } from '@/api/admin/auditLogs'

export function useAuditLogs(filters?: AuditLogFilters) {
    return useQuery({
        queryKey: ['admin', 'audit-logs', filters],
        queryFn: () => auditLogsApi.list(filters),
        placeholderData: (prev) => prev, // mantiene data anterior mientras carga nueva página
    })
}

export function useAuditLogActions() {
    return useQuery({
        queryKey: ['admin', 'audit-logs', 'actions'],
        queryFn: auditLogsApi.getActions,
        staleTime: 1000 * 60 * 10,
    })
}

export function useAuditLogEntityTypes() {
    return useQuery({
        queryKey: ['admin', 'audit-logs', 'entity-types'],
        queryFn: auditLogsApi.getEntityTypes,
        staleTime: 1000 * 60 * 10,
    })
}