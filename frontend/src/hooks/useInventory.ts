import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inventoryApi } from '@/api/inventory'
import type {
    CategoryForm, WarehouseForm, ProductForm, PresentationForm,
    EntryForm, AdjustmentForm, TransferForm,
} from '@/types'

const KEYS = {
    categories: (bId: number) => ['businesses', bId, 'inventory', 'categories'] as const,
    warehouses: (bId: number) => ['businesses', bId, 'inventory', 'warehouses'] as const,
    products: (bId: number) => ['businesses', bId, 'inventory', 'products'] as const,
    product: (bId: number, pId: number) => ['businesses', bId, 'inventory', 'products', pId] as const,
    lots: (bId: number, pId: number, presId: number) => ['businesses', bId, 'inventory', 'products', pId, 'presentations', presId, 'lots'] as const,
    movements: (bId: number) => ['businesses', bId, 'inventory', 'movements'] as const,
    lowStock: (bId: number) => ['businesses', bId, 'inventory', 'alerts', 'low-stock'] as const,
    expiring: (bId: number) => ['businesses', bId, 'inventory', 'alerts', 'expiring'] as const,
}

// Categorías
export function useCategories(businessId: number) {
    return useQuery({
        queryKey: KEYS.categories(businessId),
        queryFn: () => inventoryApi.listCategories(businessId),
        enabled: !!businessId,
        staleTime: 1000 * 60 * 5,
    })
}
export function useCreateCategory(businessId: number) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (data: CategoryForm) => inventoryApi.createCategory(businessId, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.categories(businessId) }),
    })
}
export function useUpdateCategory(businessId: number) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<CategoryForm> }) =>
            inventoryApi.updateCategory(businessId, id, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.categories(businessId) }),
    })
}
export function useDeleteCategory(businessId: number) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (id: number) => inventoryApi.deleteCategory(businessId, id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: KEYS.categories(businessId) })
            qc.invalidateQueries({ queryKey: KEYS.products(businessId) })
        },
    })
}

// Bodegas
export function useWarehouses(businessId: number) {
    return useQuery({
        queryKey: KEYS.warehouses(businessId),
        queryFn: () => inventoryApi.listWarehouses(businessId),
        enabled: !!businessId,
        staleTime: 1000 * 60 * 5,
    })
}
export function useCreateWarehouse(businessId: number) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (data: WarehouseForm) => inventoryApi.createWarehouse(businessId, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.warehouses(businessId) }),
    })
}
export function useUpdateWarehouse(businessId: number) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<WarehouseForm> }) =>
            inventoryApi.updateWarehouse(businessId, id, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.warehouses(businessId) }),
    })
}
export function useDeleteWarehouse(businessId: number) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (id: number) => inventoryApi.deleteWarehouse(businessId, id),
        onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.warehouses(businessId) }),
    })
}

// Productos
export function useProducts(businessId: number, params?: {
    search?: string; category_id?: number; is_perishable?: boolean; low_stock?: boolean
}) {
    return useQuery({
        queryKey: [...KEYS.products(businessId), params],
        queryFn: () => inventoryApi.listProducts(businessId, params),
        enabled: !!businessId,
    })
}
export function useProduct(businessId: number, productId: number) {
    return useQuery({
        queryKey: KEYS.product(businessId, productId),
        queryFn: () => inventoryApi.getProduct(businessId, productId),
        enabled: !!businessId && !!productId,
    })
}
export function useCreateProduct(businessId: number) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (data: ProductForm) => inventoryApi.createProduct(businessId, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.products(businessId) }),
    })
}
export function useUpdateProduct(businessId: number, productId: number) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (data: Partial<ProductForm>) => inventoryApi.updateProduct(businessId, productId, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: KEYS.products(businessId) })
            qc.invalidateQueries({ queryKey: KEYS.product(businessId, productId) })
        },
    })
}
export function useDeleteProduct(businessId: number) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (productId: number) => inventoryApi.deleteProduct(businessId, productId),
        onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.products(businessId) }),
    })
}

// Presentaciones
export function useAddPresentation(businessId: number, productId: number) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (data: PresentationForm) => inventoryApi.addPresentation(businessId, productId, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.product(businessId, productId) }),
    })
}
export function useUpdatePresentation(businessId: number, productId: number) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<PresentationForm> }) =>
            inventoryApi.updatePresentation(businessId, productId, id, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.product(businessId, productId) }),
    })
}

// Lotes
export function useLots(businessId: number, productId: number, presentationId: number) {
    return useQuery({
        queryKey: KEYS.lots(businessId, productId, presentationId),
        queryFn: () => inventoryApi.listLots(businessId, productId, presentationId),
        enabled: !!businessId && !!productId && !!presentationId,
    })
}

// Movimientos
export function useMovements(businessId: number, params?: {
    presentation_id?: number; warehouse_id?: number; movement_type?: string
}) {
    return useQuery({
        queryKey: [...KEYS.movements(businessId), params],
        queryFn: () => inventoryApi.listMovements(businessId, params),
        enabled: !!businessId,
    })
}
export function useRegisterEntry(businessId: number) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (data: EntryForm) => inventoryApi.registerEntry(businessId, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: KEYS.products(businessId) })
            qc.invalidateQueries({ queryKey: KEYS.movements(businessId) })
            qc.invalidateQueries({ queryKey: KEYS.lowStock(businessId) })
        },
    })
}
export function useRegisterAdjustment(businessId: number) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (data: AdjustmentForm) => inventoryApi.registerAdjustment(businessId, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: KEYS.products(businessId) })
            qc.invalidateQueries({ queryKey: KEYS.movements(businessId) })
        },
    })
}
export function useRegisterTransfer(businessId: number) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (data: TransferForm) => inventoryApi.registerTransfer(businessId, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: KEYS.products(businessId) })
            qc.invalidateQueries({ queryKey: KEYS.movements(businessId) })
        },
    })
}

// Alertas
export function useLowStockAlerts(businessId: number) {
    return useQuery({
        queryKey: KEYS.lowStock(businessId),
        queryFn: () => inventoryApi.getLowStockAlerts(businessId),
        enabled: !!businessId,
    })
}
export function useExpiryAlerts(businessId: number, days = 7) {
    return useQuery({
        queryKey: [...KEYS.expiring(businessId), days],
        queryFn: () => inventoryApi.getExpiryAlerts(businessId, days),
        enabled: !!businessId,
    })
}