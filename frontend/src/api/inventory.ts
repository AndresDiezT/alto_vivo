import { api } from './axios'
import type {
    Product, ProductForm, ProductPresentation, PresentationForm,
    ProductCategory, CategoryForm, Warehouse, WarehouseForm,
    InventoryMovement, EntryForm, AdjustmentForm, TransferForm,
    ProductLot, LowStockAlert, ExpiryAlert,
} from '@/types'

export const inventoryApi = {
    // Categorías
    listCategories: (businessId: number) =>
        api.get<ProductCategory[]>(`/businesses/${businessId}/inventory/categories`).then(r => r.data),
    createCategory: (businessId: number, data: CategoryForm) =>
        api.post<ProductCategory>(`/businesses/${businessId}/inventory/categories`, data).then(r => r.data),
    updateCategory: (businessId: number, categoryId: number, data: Partial<CategoryForm>) =>
        api.patch<ProductCategory>(`/businesses/${businessId}/inventory/categories/${categoryId}`, data).then(r => r.data),
    deleteCategory: (businessId: number, categoryId: number) =>
        api.delete(`/businesses/${businessId}/inventory/categories/${categoryId}`).then(r => r.data),

    // Bodegas
    listWarehouses: (businessId: number) =>
        api.get<Warehouse[]>(`/businesses/${businessId}/inventory/warehouses`).then(r => r.data),
    createWarehouse: (businessId: number, data: WarehouseForm) =>
        api.post<Warehouse>(`/businesses/${businessId}/inventory/warehouses`, data).then(r => r.data),
    updateWarehouse: (businessId: number, warehouseId: number, data: Partial<WarehouseForm>) =>
        api.patch<Warehouse>(`/businesses/${businessId}/inventory/warehouses/${warehouseId}`, data).then(r => r.data),
    deleteWarehouse: (businessId: number, warehouseId: number) =>
        api.delete(`/businesses/${businessId}/inventory/warehouses/${warehouseId}`).then(r => r.data),

    // Productos
    listProducts: (businessId: number, params?: {
        search?: string; category_id?: number; is_perishable?: boolean; low_stock?: boolean
    }) =>
        api.get<Product[]>(`/businesses/${businessId}/inventory/products`, { params }).then(r => r.data),
    getProduct: (businessId: number, productId: number) =>
        api.get<Product>(`/businesses/${businessId}/inventory/products/${productId}`).then(r => r.data),
    createProduct: (businessId: number, data: ProductForm) =>
        api.post<Product>(`/businesses/${businessId}/inventory/products`, data).then(r => r.data),
    updateProduct: (businessId: number, productId: number, data: Partial<ProductForm>) =>
        api.patch<Product>(`/businesses/${businessId}/inventory/products/${productId}`, data).then(r => r.data),
    deleteProduct: (businessId: number, productId: number) =>
        api.delete(`/businesses/${businessId}/inventory/products/${productId}`).then(r => r.data),

    // Presentaciones
    addPresentation: (businessId: number, productId: number, data: PresentationForm) =>
        api.post<ProductPresentation>(`/businesses/${businessId}/inventory/products/${productId}/presentations`, data).then(r => r.data),
    updatePresentation: (businessId: number, productId: number, presentationId: number, data: Partial<PresentationForm>) =>
        api.patch<ProductPresentation>(`/businesses/${businessId}/inventory/products/${productId}/presentations/${presentationId}`, data).then(r => r.data),

    // Lotes
    listLots: (businessId: number, productId: number, presentationId: number) =>
        api.get<ProductLot[]>(`/businesses/${businessId}/inventory/products/${productId}/presentations/${presentationId}/lots`).then(r => r.data),

    // Movimientos
    registerEntry: (businessId: number, data: EntryForm) =>
        api.post<InventoryMovement>(`/businesses/${businessId}/inventory/entry`, data).then(r => r.data),
    registerAdjustment: (businessId: number, data: AdjustmentForm) =>
        api.post<InventoryMovement>(`/businesses/${businessId}/inventory/adjustment`, data).then(r => r.data),
    registerTransfer: (businessId: number, data: TransferForm) =>
        api.post<InventoryMovement>(`/businesses/${businessId}/inventory/transfer`, data).then(r => r.data),
    listMovements: (businessId: number, params?: {
        presentation_id?: number; warehouse_id?: number; movement_type?: string
    }) =>
        api.get<InventoryMovement[]>(`/businesses/${businessId}/inventory/movements`, { params }).then(r => r.data),

    // Alertas
    getLowStockAlerts: (businessId: number) =>
        api.get<LowStockAlert[]>(`/businesses/${businessId}/inventory/alerts/low-stock`).then(r => r.data),
    getExpiryAlerts: (businessId: number, days?: number) =>
        api.get<ExpiryAlert[]>(`/businesses/${businessId}/inventory/alerts/expiring`, { params: { days } }).then(r => r.data),
}