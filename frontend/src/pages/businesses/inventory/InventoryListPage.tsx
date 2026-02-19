import { useParams, Link, useNavigate } from 'react-router-dom'
import { Plus, Search, AlertTriangle, Clock, Settings, ArrowRightLeft } from 'lucide-react'
import React from 'react'
import { useProducts, useCategories, useWarehouses, useLowStockAlerts, useExpiryAlerts } from '@/hooks/useInventory'
import { PageLoader, EmptyState, Badge } from '@/components/ui'
import type { Product } from '@/types'

export function InventoryListPage() {
    const { id } = useParams<{ id: string }>()
    const businessId = Number(id)
    const navigate = useNavigate()

    const [search, setSearch] = React.useState('')
    const [categoryFilter, setCategoryFilter] = React.useState<number | undefined>()
    const [perishableFilter, setPerishableFilter] = React.useState<boolean | undefined>()
    const [lowStockFilter, setLowStockFilter] = React.useState(false)
    const [tab, setTab] = React.useState<'products' | 'alerts'>('products')

    const { data: products, isLoading } = useProducts(businessId, {
        search: search || undefined,
        category_id: categoryFilter,
        is_perishable: perishableFilter,
        low_stock: lowStockFilter || undefined,
    })
    const { data: categories } = useCategories(businessId)
    const { data: lowStock } = useLowStockAlerts(businessId)
    const { data: expiring } = useExpiryAlerts(businessId, 7)

    const totalAlerts = (lowStock?.length ?? 0) + (expiring?.length ?? 0)

    if (isLoading) return <PageLoader />

    return (
        <div className="p-6 md:p-8 max-w-6xl mx-auto animate-fade-in space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Inventario</h1>
                    <p className="text-sm text-gray-500">{products?.length ?? 0} productos registrados</p>
                </div>
                <div className="flex gap-2">
                    <Link to={`/businesses/${id}/inventory/settings`} className="btn-secondary btn-sm">
                        <Settings className="w-4 h-4" /> Configuración
                    </Link>
                    <Link to={`/businesses/${id}/inventory/movements`} className="btn-secondary btn-sm">
                        <ArrowRightLeft className="w-4 h-4" /> Movimientos
                    </Link>
                    <Link to={`/businesses/${id}/inventory/products/new`} className="btn-primary btn-sm">
                        <Plus className="w-4 h-4" /> Nuevo producto
                    </Link>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-100">
                <div className="flex gap-1">
                    <button
                        onClick={() => setTab('products')}
                        className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === 'products' ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Productos
                    </button>
                    <button
                        onClick={() => setTab('alerts')}
                        className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === 'alerts' ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Alertas
                        {totalAlerts > 0 && (
                            <span className="bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                                {totalAlerts}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Tab: Productos */}
            {tab === 'products' && (
                <>
                    {/* Filtros */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                className="input pl-9 w-full"
                                placeholder="Buscar producto..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                        <select
                            className="input w-full sm:w-44"
                            value={categoryFilter ?? ''}
                            onChange={e => setCategoryFilter(e.target.value ? Number(e.target.value) : undefined)}
                        >
                            <option value="">Todas las categorías</option>
                            {categories?.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        <select
                            className="input w-full sm:w-40"
                            value={perishableFilter === undefined ? '' : String(perishableFilter)}
                            onChange={e => setPerishableFilter(e.target.value === '' ? undefined : e.target.value === 'true')}
                        >
                            <option value="">Todos los tipos</option>
                            <option value="true">Perecederos</option>
                            <option value="false">No perecederos</option>
                        </select>
                        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer whitespace-nowrap">
                            <input
                                type="checkbox"
                                checked={lowStockFilter}
                                onChange={e => setLowStockFilter(e.target.checked)}
                                className="rounded border-gray-300"
                            />
                            Stock bajo
                        </label>
                    </div>

                    {/* Lista */}
                    {!products?.length ? (
                        <EmptyState
                            icon="📦"
                            title="Sin productos"
                            description="Agrega tu primer producto para comenzar a gestionar el inventario."
                            action={
                                <Link to={`/businesses/${id}/inventory/products/new`} className="btn-primary btn-sm">
                                    <Plus className="w-4 h-4" /> Agregar producto
                                </Link>
                            }
                        />
                    ) : (
                        <div className="card divide-y divide-gray-100">
                            {products.map(product => (
                                <ProductRow
                                    key={product.id}
                                    product={product}
                                    onClick={() => navigate(`/businesses/${id}/inventory/products/${product.id}`)}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Tab: Alertas */}
            {tab === 'alerts' && (
                <div className="space-y-4">
                    {/* Stock bajo */}
                    {!!lowStock?.length && (
                        <div>
                            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                                Stock bajo ({lowStock.length})
                            </h3>
                            <div className="card divide-y divide-gray-100">
                                {lowStock.map((alert, i) => (
                                    <div key={i} className="flex items-center justify-between p-4">
                                        <div>
                                            <p className="text-sm font-medium text-gray-800">{alert.product_name}</p>
                                            <p className="text-xs text-gray-400">{alert.presentation_name} · {alert.warehouse_name}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-semibold text-yellow-600">{Number(alert.current_stock).toLocaleString()}</p>
                                            <p className="text-xs text-gray-400">mín. {alert.min_stock}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Por vencer */}
                    {!!expiring?.length && (
                        <div>
                            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                <Clock className="w-4 h-4 text-red-500" />
                                Por vencer en 7 días ({expiring.length})
                            </h3>
                            <div className="card divide-y divide-gray-100">
                                {expiring.map((alert, i) => (
                                    <div key={i} className="flex items-center justify-between p-4">
                                        <div>
                                            <p className="text-sm font-medium text-gray-800">{alert.product_name}</p>
                                            <p className="text-xs text-gray-400">
                                                {alert.presentation_name}
                                                {alert.lot_number && ` · Lote ${alert.lot_number}`}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-sm font-semibold ${alert.days_to_expiry <= 2 ? 'text-red-600' : 'text-orange-500'}`}>
                                                {alert.days_to_expiry === 0 ? 'Vence hoy' : `${alert.days_to_expiry}d`}
                                            </p>
                                            <p className="text-xs text-gray-400">{Number(alert.remaining).toLocaleString()} restantes</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {totalAlerts === 0 && (
                        <EmptyState icon="✅" title="Sin alertas" description="Todo el inventario está en orden." />
                    )}
                </div>
            )}
        </div>
    )
}

function ProductRow({ product, onClick }: { product: Product; onClick: () => void }) {
    const totalStock = product.presentations.reduce((acc, p) =>
        acc + p.stock.reduce((a, s) => a + Number(s.quantity), 0), 0
    )
    const hasLowStock = product.presentations.some(p =>
        p.stock.some(s => Number(s.quantity) <= p.min_stock && p.min_stock > 0)
    )

    return (
        <div
            onClick={onClick}
            className="flex items-center gap-4 p-4 hover:bg-surface-50 transition-colors cursor-pointer"
        >
            {/* Color categoría */}
            <div
                className="w-2 h-10 rounded-full flex-shrink-0"
                style={{ backgroundColor: product.category?.color ?? '#e5e7eb' }}
            />
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                    {product.is_perishable && <span className="text-xs text-orange-500">🕐 Perecedero</span>}
                    {hasLowStock && <Badge variant="yellow">Stock bajo</Badge>}
                </div>
                <p className="text-xs text-gray-400">
                    {product.category?.name ?? 'Sin categoría'}
                    {' · '}{product.presentations.length} presentación{product.presentations.length !== 1 ? 'es' : ''}
                </p>
            </div>
            <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-gray-800">{totalStock.toLocaleString()}</p>
                <p className="text-xs text-gray-400">en stock</p>
            </div>
        </div>
    )
}