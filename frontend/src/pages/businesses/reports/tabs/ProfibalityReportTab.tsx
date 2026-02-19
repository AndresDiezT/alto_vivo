import React from 'react'
import { useProfitabilityReport } from '@/hooks/useReports'
import { PageLoader, Badge } from '@/components/ui'
import { exportReportToExcel } from '@/utils/exportExcel'
import { exportReportToPdf } from '@/utils/exportPdf'
import { Download, FileSpreadsheet } from 'lucide-react'
import type { ProfitabilityItem } from '@/types/reports.types'

export function ProfitabilityReportTab({ businessId }: { businessId: number }) {
    const today = new Date().toISOString().split('T')[0]
    const monthStart = today.slice(0, 7) + '-01'
    const [dateFrom, setDateFrom] = React.useState(monthStart)
    const [dateTo, setDateTo] = React.useState(today)

    const { data: report, isLoading } = useProfitabilityReport(businessId, { date_from: dateFrom, date_to: dateTo })

    if (isLoading) return <PageLoader />
    if (!report) return null

    const marginColor = (m: string | null) => {
        if (!m) return 'text-gray-400'
        const n = Number(m)
        if (n >= 40) return 'text-green-600'
        if (n >= 20) return 'text-yellow-600'
        return 'text-red-600'
    }

    return (
        <div className="space-y-6">
            {/* Controles */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between">
                <div className="flex gap-2">
                    <input type="date" className="input w-40" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                    <input type="date" className="input w-40" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                </div>
                <div className="flex gap-2">
                    <button onClick={() => exportReportToExcel('profitability', report)} className="btn-secondary btn-sm">
                        <FileSpreadsheet className="w-4 h-4" /> Excel
                    </button>
                    <button onClick={() => exportReportToPdf('profitability', report)} className="btn-secondary btn-sm">
                        <Download className="w-4 h-4" /> PDF
                    </button>
                </div>
            </div>

            {/* KPIs globales */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <KpiCard label="Ingresos totales" value={`$${Number(report.total_revenue).toLocaleString()}`} color="green" />
                <KpiCard label="Costo estimado" value={report.total_cost ? `$${Number(report.total_cost).toLocaleString()}` : 'Sin datos'} color="red" />
                <KpiCard label="Ganancia bruta" value={report.total_profit ? `$${Number(report.total_profit).toLocaleString()}` : 'Sin datos'} color="brand" />
                <KpiCard
                    label="Margen global"
                    value={report.overall_margin ? `${Number(report.overall_margin).toFixed(1)}%` : 'Sin datos'}
                    color={report.overall_margin ? (Number(report.overall_margin) >= 30 ? 'green' : 'yellow') : 'gray'}
                />
            </div>

            {/* Sin costo warning */}
            {!report.total_cost && (
                <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-xl text-sm text-yellow-700">
                    ⚠️ Algunos productos no tienen costo registrado en sus lotes. Registra entradas con costo para calcular la rentabilidad.
                </div>
            )}

            {/* Tabla de productos */}
            <div className="card overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 bg-surface-50">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Rentabilidad por producto
                    </p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-xs text-gray-400 border-b border-gray-100">
                            <tr>
                                <th className="text-left px-5 py-2 font-medium">Producto</th>
                                <th className="text-right px-4 py-2 font-medium">Und. vendidas</th>
                                <th className="text-right px-4 py-2 font-medium">Precio venta</th>
                                <th className="text-right px-4 py-2 font-medium">Costo</th>
                                <th className="text-right px-4 py-2 font-medium">Ingresos</th>
                                <th className="text-right px-4 py-2 font-medium">Ganancia</th>
                                <th className="text-right px-5 py-2 font-medium">Margen</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {report.items.map((item: ProfitabilityItem) => (
                                <tr key={item.presentation_id} className="hover:bg-surface-50">
                                    <td className="px-5 py-3">
                                        <p className="font-medium text-gray-800">{item.product_name}</p>
                                        <p className="text-xs text-gray-400">{item.presentation_name}</p>
                                    </td>
                                    <td className="px-4 py-3 text-right text-gray-600">
                                        {Number(item.units_sold).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-right text-gray-600">
                                        ${Number(item.avg_sale_price).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-right text-gray-400">
                                        {item.avg_cost_price ? `$${Number(item.avg_cost_price).toLocaleString()}` : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium text-gray-800">
                                        ${Number(item.revenue).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {item.gross_profit
                                            ? <span className={Number(item.gross_profit) >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                                                ${Number(item.gross_profit).toLocaleString()}
                                            </span>
                                            : <span className="text-gray-300">—</span>
                                        }
                                    </td>
                                    <td className="px-5 py-3 text-right">
                                        {item.margin_pct
                                            ? <span className={`font-semibold ${marginColor(item.margin_pct)}`}>
                                                {Number(item.margin_pct).toFixed(1)}%
                                            </span>
                                            : <span className="text-gray-300">—</span>
                                        }
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {!report.items.length && (
                        <p className="text-sm text-gray-400 text-center py-10">Sin ventas en el período</p>
                    )}
                </div>
            </div>
        </div>
    )
}

function KpiCard({ label, value, color }: { label: string; value: string; color?: string }) {
    const colors: Record<string, string> = {
        green: 'text-green-700', red: 'text-red-600',
        yellow: 'text-yellow-700', brand: 'text-brand-700', gray: 'text-gray-400',
    }
    return (
        <div className="card p-4">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={`text-lg font-bold ${colors[color ?? 'gray'] ?? 'text-gray-900'}`}>{value}</p>
        </div>
    )
}