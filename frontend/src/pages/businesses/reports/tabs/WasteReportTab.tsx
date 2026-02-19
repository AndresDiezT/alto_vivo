import React from 'react'
import { useWasteReport } from '@/hooks/useReports'
import { PageLoader } from '@/components/ui'
import { exportReportToExcel } from '@/utils/exportExcel'
import { exportReportToPdf } from '@/utils/exportPdf'
import { Download, FileSpreadsheet } from 'lucide-react'

const CAUSE_LABELS: Record<string, string> = {
    damaged: 'Dañado',
    expired: 'Vencido',
    theft: 'Robo / Pérdida',
    inventory_error: 'Error de inventario',
    sample: 'Muestra / Regalo',
}

export function WasteReportTab({ businessId }: { businessId: number }) {
    const today = new Date().toISOString().split('T')[0]
    const monthStart = today.slice(0, 7) + '-01'
    const [dateFrom, setDateFrom] = React.useState(monthStart)
    const [dateTo, setDateTo] = React.useState(today)

    const { data: report, isLoading } = useWasteReport(businessId, {
        date_from: dateFrom,
        date_to: dateTo,
    })

    if (isLoading) return <PageLoader />
    if (!report) return null

    return (
        <div className="space-y-6">
            {/* Controles */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between">
                <div className="flex gap-2">
                    <input
                        type="date" className="input w-40"
                        value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                    />
                    <input
                        type="date" className="input w-40"
                        value={dateTo} onChange={e => setDateTo(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <button onClick={() => exportReportToExcel('waste', report)} className="btn-secondary btn-sm">
                        <FileSpreadsheet className="w-4 h-4" /> Excel
                    </button>
                    <button onClick={() => exportReportToPdf('waste', report)} className="btn-secondary btn-sm">
                        <Download className="w-4 h-4" /> PDF
                    </button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="card p-4">
                    <p className="text-xs text-gray-500 mb-1">Total registros</p>
                    <p className="text-lg font-bold text-gray-900">{report.total_records}</p>
                </div>
                <div className="card p-4">
                    <p className="text-xs text-gray-500 mb-1">Costo perdido</p>
                    <p className="text-lg font-bold text-red-600">${Number(report.total_cost).toLocaleString()}</p>
                </div>
                <div className="card p-4">
                    <p className="text-xs text-gray-500 mb-1">Automáticas</p>
                    <p className="text-lg font-bold text-gray-900">{report.auto_count}</p>
                </div>
                <div className="card p-4">
                    <p className="text-xs text-gray-500 mb-1">Manuales</p>
                    <p className="text-lg font-bold text-gray-900">{report.manual_count}</p>
                </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
                {/* Por causa */}
                <div className="card p-5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                        Por causa
                    </p>
                    {report.by_cause.length === 0 ? (
                        <p className="text-sm text-gray-400">Sin datos</p>
                    ) : (
                        <div className="space-y-3">
                            {report.by_cause.map(bc => {
                                const pct = report.total_records > 0
                                    ? (bc.count / report.total_records) * 100
                                    : 0
                                return (
                                    <div key={bc.cause}>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-gray-600">{CAUSE_LABELS[bc.cause] ?? bc.cause}</span>
                                            <span className="font-medium text-gray-800">
                                                {bc.count} · ${Number(bc.total_cost).toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                                            <div
                                                className="bg-red-400 h-1.5 rounded-full transition-all"
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Productos más afectados */}
                <div className="card p-5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                        Productos más afectados
                    </p>
                    {report.by_product.length === 0 ? (
                        <p className="text-sm text-gray-400">Sin datos</p>
                    ) : (
                        <div className="space-y-3">
                            {report.by_product.map((p, i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-xs font-bold text-gray-300 w-5 shrink-0">#{i + 1}</span>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-gray-800 truncate">{p.product_name}</p>
                                            <p className="text-xs text-gray-400">{p.presentation_name}</p>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0 ml-3">
                                        <p className="text-sm font-semibold text-red-600">
                                            ${Number(p.total_cost).toLocaleString()}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {Number(p.total_quantity).toLocaleString()} und.
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}