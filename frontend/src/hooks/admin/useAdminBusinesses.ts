import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
    adminBusinessesApi,
    type ModulesUpdate,
    type BusinessUpdateFull,
    type AdminBusinessesFilters,
} from '@/api/admin/businesses'

export function useAdminBusinesses(filters?: AdminBusinessesFilters) {
    return useQuery({
        queryKey: ['admin', 'businesses', filters],
        queryFn: () => adminBusinessesApi.list(filters),
    })
}

export function useAdminBusiness(businessId: number) {
    return useQuery({
        queryKey: ['admin', 'businesses', businessId],
        queryFn: () => adminBusinessesApi.getById(businessId),
        enabled: !!businessId,
    })
}

export function useUpdateBusinessModules(businessId: number) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (data: ModulesUpdate) =>
            adminBusinessesApi.updateModules(businessId, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['admin', 'businesses', businessId] })
            qc.invalidateQueries({ queryKey: ['admin', 'businesses'] })
        },
    })
}

export function useUpdateBusinessFull(businessId: number) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (data: BusinessUpdateFull) =>
            adminBusinessesApi.updateFull(businessId, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['admin', 'businesses', businessId] })
            qc.invalidateQueries({ queryKey: ['admin', 'businesses'] })
        },
    })
}

export function useDeleteBusiness() {
    const qc = useQueryClient()
    const navigate = useNavigate()
    return useMutation({
        mutationFn: (businessId: number) => adminBusinessesApi.delete(businessId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['admin', 'businesses'] })
            navigate('/admin/businesses')
        },
    })
}