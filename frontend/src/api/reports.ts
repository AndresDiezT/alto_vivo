import { api } from './axios'
import type {
    SalesReport, ClientsReport, InventoryReport,
    WasteReport, PortfolioReport, ProfitabilityReport,
} from '@/types/reports.types'

const base = (businessId: number) => `/businesses/${businessId}/reports`

export const reportsApi = {
    getSales: (businessId: number, params?: { date_from?: string; date_to?: string; group_by?: string }) =>
        api.get<SalesReport>(`${base(businessId)}/sales`, { params }).then(r => r.data),

    getClients: (businessId: number) =>
        api.get<ClientsReport>(`${base(businessId)}/clients`).then(r => r.data),

    getInventory: (businessId: number) =>
        api.get<InventoryReport>(`${base(businessId)}/inventory`).then(r => r.data),

    getWaste: (businessId: number, params?: { date_from?: string; date_to?: string }) =>
        api.get<WasteReport>(`${base(businessId)}/waste`, { params }).then(r => r.data),

    getPortfolio: (businessId: number) =>
        api.get<PortfolioReport>(`${base(businessId)}/portfolio`).then(r => r.data),

    getProfitability: (businessId: number, params?: { date_from?: string; date_to?: string }) =>
        api.get<ProfitabilityReport>(`${base(businessId)}/profitability`, { params }).then(r => r.data),
}