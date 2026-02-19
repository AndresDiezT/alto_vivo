import { api } from './axios'
import type { WasteRecord, WasteForm, WasteSummary, AutoWasteResult } from '@/types/wastes.types'

export const wasteApi = {
    list: (businessId: number, params?: {
        presentation_id?: number
        warehouse_id?: number
        cause?: string
        date_from?: string
        date_to?: string
        is_auto?: boolean
        skip?: number
        limit?: number
    }) =>
        api.get<WasteRecord[]>(`/businesses/${businessId}/waste`, { params }).then(r => r.data),

    getSummary: (businessId: number, params?: { date_from?: string; date_to?: string }) =>
        api.get<WasteSummary>(`/businesses/${businessId}/waste/summary`, { params }).then(r => r.data),

    create: (businessId: number, data: WasteForm) =>
        api.post<WasteRecord>(`/businesses/${businessId}/waste`, data).then(r => r.data),

    processExpired: (businessId: number) =>
        api.post<AutoWasteResult>(`/businesses/${businessId}/waste/auto-expired`).then(r => r.data),
}