import React from 'react'
import { useSalesReport } from '@/hooks/useReports'
import { PageLoader } from '@/components/ui'
import { exportReportToExcel } from '@/utils/exportExcel'
import { exportReportToPdf } from '@/utils/exportPdf'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, LineChart, Line,
} from 'recharts'
import { Download, FileSpreadsheet } from 'lucide-react'

export function SalesReportTab({ businessId }: { businessId: number }) {
    const today = new Date().toISOString().split('T')[0]
    const monthStart = today.slice(0, 7) + '-01'

    const [dateFrom, setDateFrom] = React.useState(monthStart)
    const [dateTo, setDateTo] = React.useState(today)
    const [groupBy, setGroupBy] = React.useState<'day' | 'week' | 'month'>('day')

    const { data: report, isLoading } = useSalesReport(businessId, {
        date_from: dateFrom, date_to: dateTo, group_by: groupBy,
    })

    if (isLoading) return <PageLoader />
    if (!report) return null

    const chartData = report.by_period.map(p => ({
        period: p.period,
        Ingresos: Number(p.total_revenue),
        Efectivo: Number(p.total_cash),
        Fiado: Number(p.total_credit),
    }))

    return (
        <div className="space-y-6">
            {/* Controles */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="flex gap-2 flex-wrap">
                    <input type="date" className="input w-40" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                    <input type="date" className="input w-40" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                    <select className="input w-32" value={groupBy} onChange={e => setGroupBy(e.target.value as any)}>
                        <option value="day">Por día</option>
                        <option value="week">Por semana</option>
                        <option value="month">Por mes</option>
                    </select>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => exportReportToExcel('sales', report)}
                        className="btn-secondary btn-sm"
                    >
                        <FileSpreadsheet className="w-4 h-4" /> Excel
                    </button>
                    <button
                        onClick={() => exportReportToPdf('sales', report)}
                        className="btn-secondary btn-sm"
                    >
                        <Download className="w-4 h-4" /> PDF
                    </button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <KpiCard label="Total ventas" value={report.total_sales} />
                <KpiCard label="Ingresos" value={`$${Number(report.total_revenue).toLocaleString()}`} color="green" />
                <KpiCard label="Ticket promedio" value={`$${Number(report.average_ticket).toLocaleString()}`} />
                <KpiCard label="Fiado" value={`$${Number(report.total_credit).toLocaleString()}`} color="yellow" />
            </div>

            {/* Gráfica ingresos por período */}
            <div className="card p-5">
                <p className="text-sm font-semibold text-gray-700 mb-4">Ingresos por período</p>
                <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={chartData} barSize={groupBy === 'day' ? 12 : 24}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(v: number | undefined) => `$${(v ?? 0).toLocaleString()}`} />
                        <Bar dataKey="Efectivo" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="Fiado" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Top productos */}
            <div className="card overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 bg-surface-50">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Productos más vendidos
                    </p>
                </div>
                <div className="divide-y divide-gray-100">
                    {report.top_products.map((p, i) => (
                        <div key={p.presentation_id} className="flex items-center gap-4 px-5 py-3">
                            <span className="text-sm font-bold text-gray-300 w-6">#{i + 1}</span>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-800">{p.product_name}</p>
                                <p className="text-xs text-gray-400">{p.presentation_name} · {Number(p.units_sold).toLocaleString()} und. · {p.times_sold} ventas</p>
                            </div>
                            <p className="text-sm font-semibold text-gray-800">
                                ${Number(p.total_revenue).toLocaleString()}
                            </p>
                        </div>
                    ))}
                    {!report.top_products.length && (
                        <p className="text-sm text-gray-400 text-center py-8">Sin ventas en el período</p>
                    )}
                </div>
            </div>
        </div>
    )
}

function KpiCard({ label, value, color }: { label: string; value: string | number; color?: 'green' | 'yellow' }) {
    const text = color === 'green' ? 'text-green-700' : color === 'yellow' ? 'text-yellow-700' : 'text-gray-900'
    return (
        <div className="card p-4">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={`text-lg font-bold ${text}`}>{value}</p>
        </div>
    )
}