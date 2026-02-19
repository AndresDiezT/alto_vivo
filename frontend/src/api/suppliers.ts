import { api } from './axios'
import type {
    Supplier, SupplierForm, SupplierStats,
    SupplierProduct, SupplierPurchase, PurchaseForm,
    SupplierPayment, SupplierPaymentForm,
    SupplierPortfolioSummary,
} from '@/types/suppliers.types'

export const suppliersApi = {
    // Proveedores
    list: (businessId: number, params?: { search?: string; has_debt?: boolean }) =>
        api.get<Supplier[]>(`/businesses/${businessId}/suppliers`, { params }).then(r => r.data),

    get: (businessId: number, supplierId: number) =>
        api.get<Supplier>(`/businesses/${businessId}/suppliers/${supplierId}`).then(r => r.data),

    create: (businessId: number, data: SupplierForm) =>
        api.post<Supplier>(`/businesses/${businessId}/suppliers`, data).then(r => r.data),

    update: (businessId: number, supplierId: number, data: Partial<SupplierForm>) =>
        api.patch<Supplier>(`/businesses/${businessId}/suppliers/${supplierId}`, data).then(r => r.data),

    delete: (businessId: number, supplierId: number) =>
        api.delete(`/businesses/${businessId}/suppliers/${supplierId}`).then(r => r.data),

    getStats: (businessId: number, supplierId: number) =>
        api.get<SupplierStats>(`/businesses/${businessId}/suppliers/${supplierId}/stats`).then(r => r.data),

    getPortfolio: (businessId: number) =>
        api.get<SupplierPortfolioSummary>(`/businesses/${businessId}/suppliers/portfolio`).then(r => r.data),

    // Productos del proveedor
    listProducts: (businessId: number, supplierId: number) =>
        api.get<SupplierProduct[]>(`/businesses/${businessId}/suppliers/${supplierId}/products`).then(r => r.data),

    addProduct: (businessId: number, supplierId: number, data: { presentation_id: number; cost_price?: number }) =>
        api.post<SupplierProduct>(`/businesses/${businessId}/suppliers/${supplierId}/products`, data).then(r => r.data),

    removeProduct: (businessId: number, supplierId: number, productId: number) =>
        api.delete(`/businesses/${businessId}/suppliers/${supplierId}/products/${productId}`).then(r => r.data),

    // Compras
    listPurchases: (businessId: number, supplierId: number) =>
        api.get<SupplierPurchase[]>(`/businesses/${businessId}/suppliers/${supplierId}/purchases`).then(r => r.data),

    createPurchase: (businessId: number, supplierId: number, data: PurchaseForm) =>
        api.post<SupplierPurchase>(`/businesses/${businessId}/suppliers/${supplierId}/purchases`, data).then(r => r.data),

    // Pagos
    listPayments: (businessId: number, supplierId: number) =>
        api.get<SupplierPayment[]>(`/businesses/${businessId}/suppliers/${supplierId}/payments`).then(r => r.data),

    addPayment: (businessId: number, supplierId: number, data: SupplierPaymentForm) =>
        api.post<SupplierPayment>(`/businesses/${businessId}/suppliers/${supplierId}/payments`, data).then(r => r.data),
}