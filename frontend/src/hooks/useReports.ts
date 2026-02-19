import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '@/api/reports'

const KEY = (bId: number, type: string, params?: object) =>
    ['businesses', bId, 'reports', type, params] as const

export function useSalesReport(businessId: number, params?: { date_from?: string; date_to?: string; group_by?: string }) {
    return useQuery({
        queryKey: KEY(businessId, 'sales', params),
        queryFn: () => reportsApi.getSales(businessId, params),
        enabled: !!businessId,
    })
}

export function useClientsReport(businessId: number) {
    return useQuery({
        queryKey: KEY(businessId, 'clients'),
        queryFn: () => reportsApi.getClients(businessId),
        enabled: !!businessId,
    })
}

export function useInventoryReport(businessId: number) {
    return useQuery({
        queryKey: KEY(businessId, 'inventory'),
        queryFn: () => reportsApi.getInventory(businessId),
        enabled: !!businessId,
    })
}

export function useWasteReport(businessId: number, params?: { date_from?: string; date_to?: string }) {
    return useQuery({
        queryKey: KEY(businessId, 'waste', params),
        queryFn: () => reportsApi.getWaste(businessId, params),
        enabled: !!businessId,
    })
}

export function usePortfolioReport(businessId: number) {
    return useQuery({
        queryKey: KEY(businessId, 'portfolio'),
        queryFn: () => reportsApi.getPortfolio(businessId),
        enabled: !!businessId,
    })
}

export function useProfitabilityReport(businessId: number, params?: { date_from?: string; date_to?: string }) {
    return useQuery({
        queryKey: KEY(businessId, 'profitability', params),
        queryFn: () => reportsApi.getProfitability(businessId, params),
        enabled: !!businessId,
    })
}