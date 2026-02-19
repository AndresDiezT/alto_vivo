import React from 'react'
import { useInventoryReport } from '@/hooks/useReports'
import { PageLoader, Badge } from '@/components/ui'
import { exportReportToExcel } from '@/utils/exportExcel'
import { exportReportToPdf } from '@/utils/exportPdf'
import { Download, FileSpreadsheet } from 'lucide-react'

export function InventoryReportTab({ businessId }: { businessId: number }) {
    const [filter, setFilter] = React.useState<'all' | 'low' | 'expiring' | 'expired'>('all')
    const { data: report, isLoading } = useInventoryReport(businessId)

    if (isLoading) return <PageLoader />
    if (!report) return null

    const filtered = report.items.filter(item => {
        if (filter === 'low') return item.is_low_stock
        if (filter === 'expiring') return item.expiring_soon > 0
        if (filter === 'expired') return item.expired_lots > 0
        return true
    })

    return (
        <div className="space-y-6">
            {/* Controles */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between">
                <div className="flex gap-2 flex-wrap">
                    {([
                        { key: 'all', label: `Todo (${report.total_products})` },
                        { key: 'low', label: `Stock bajo (${report.low_stock_count})` },
                        { key: 'expiring', label: `Por vencer (${report.expiring_count})` },
                        { key: 'expired', label: `Vencidos (${report.expired_count})` },
                    ] as const).map(f => (
                        <button
                            key={f.key}
                            onClick={() => setFilter(f.key)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f.key
                                    ? 'bg-brand-600 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
                <div className="flex gap-2">
                    <button onClick={() => exportReportToExcel('inventory', report)} className="btn-secondary btn-sm">
                        <FileSpreadsheet className="w-4 h-4" /> Excel
                    </button>
                    <button onClick={() => exportReportToPdf('inventory', report)} className="btn-secondary btn-sm">
                        <Download className="w-4 h-4" /> PDF
                    </button>
                </div>
            </div>

            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-xs text-gray-400 border-b border-gray-100">
                            <tr>
                                <th className="text-left px-5 py-2 font-medium">Producto</th>
                                <th className="text-left px-4 py-2 font-medium">Categoría</th>
                                <th className="text-right px-4 py-2 font-medium">Stock</th>
                                <th className="text-right px-4 py-2 font-medium">Mínimo</th>
                                <th className="text-center px-4 py-2 font-medium">Estado</th>
                                <th className="text-center px-5 py-2 font-medium">Lotes</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filtered.map(item => (
                                <tr key={item.presentation_id} className={`hover:bg-surface-50 ${item.expired_lots > 0 ? 'bg-red-50/30' : ''}`}>
                                    <td className="px-5 py-3">
                                        <p className="font-medium text-gray-800">{item.product_name}</p>
                                        <p className="text-xs text-gray-400">{item.presentation_name}</p>
                                    </td>
                                    <td className="px-4 py-3 text-gray-500 text-xs">{item.category_name ?? '—'}</td>
                                    <td className="px-4 py-3 text-right font-semibold text-gray-800">
                                        {Number(item.total_stock).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-right text-gray-400">{item.min_stock}</td>
                                    <td className="px-4 py-3 text-center">
                                        {item.is_low_stock
                                            ? <Badge variant="yellow">Stock bajo</Badge>
                                            : <Badge variant="green">OK</Badge>
                                        }
                                    </td>
                                    <td className="px-5 py-3 text-center space-x-1">
                                        {item.expired_lots > 0 && (
                                            <Badge variant="red">{item.expired_lots} venc.</Badge>
                                        )}
                                        {item.expiring_soon > 0 && (
                                            <Badge variant="yellow">{item.expiring_soon} pronto</Badge>
                                        )}
                                        {item.expired_lots === 0 && item.expiring_soon === 0 && (
                                            <span className="text-xs text-gray-300">—</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {!filtered.length && (
                        <p className="text-sm text-gray-400 text-center py-10">Sin productos en esta categoría</p>
                    )}
                </div>
            </div>
        </div>
    )
}