import React from 'react'
import { usePortfolioReport } from '@/hooks/useReports'
import { PageLoader, Badge } from '@/components/ui'
import { exportReportToExcel } from '@/utils/exportExcel'
import { exportReportToPdf } from '@/utils/exportPdf'
import { Download, FileSpreadsheet } from 'lucide-react'

export function PortfolioReportTab({ businessId }: { businessId: number }) {
    const { data: report, isLoading } = usePortfolioReport(businessId)
    if (isLoading) return <PageLoader />
    if (!report) return null

    return (
        <div className="space-y-6">
            <div className="flex justify-end gap-2">
                <button onClick={() => exportReportToExcel('portfolio', report)} className="btn-secondary btn-sm">
                    <FileSpreadsheet className="w-4 h-4" /> Excel
                </button>
                <button onClick={() => exportReportToPdf('portfolio', report)} className="btn-secondary btn-sm">
                    <Download className="w-4 h-4" /> PDF
                </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="card p-4">
                    <p className="text-xs text-gray-500 mb-1">Cartera total</p>
                    <p className="text-lg font-bold text-red-600">${Number(report.total_portfolio).toLocaleString()}</p>
                </div>
                <div className="card p-4">
                    <p className="text-xs text-gray-500 mb-1">Cartera vencida</p>
                    <p className="text-lg font-bold text-red-700">${Number(report.total_overdue).toLocaleString()}</p>
                </div>
                <div className="card p-4">
                    <p className="text-xs text-gray-500 mb-1">Cobrado (30d)</p>
                    <p className="text-lg font-bold text-green-600">${Number(report.collected_last_30).toLocaleString()}</p>
                </div>
                <div className="card p-4">
                    <p className="text-xs text-gray-500 mb-1">Morosos</p>
                    <p className="text-lg font-bold text-orange-600">{report.morosos_count}</p>
                </div>
            </div>

            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-xs text-gray-400 border-b border-gray-100">
                            <tr>
                                <th className="text-left px-5 py-2 font-medium">Cliente</th>
                                <th className="text-left px-4 py-2 font-medium">Teléfono</th>
                                <th className="text-right px-4 py-2 font-medium">Deuda</th>
                                <th className="text-right px-4 py-2 font-medium">Límite</th>
                                <th className="text-center px-4 py-2 font-medium">Días sin comprar</th>
                                <th className="text-center px-5 py-2 font-medium">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {report.debt_items.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="text-center py-10 text-sm text-gray-400">
                                        Sin deudas pendientes
                                    </td>
                                </tr>
                            )}
                            {report.debt_items.map(item => (
                                <tr key={item.client_id} className="hover:bg-surface-50">
                                    <td className="px-5 py-3 font-medium text-gray-800">{item.client_name}</td>
                                    <td className="px-4 py-3 text-gray-500">{item.phone ?? '—'}</td>
                                    <td className="px-4 py-3 text-right font-semibold text-red-600">
                                        ${Number(item.current_balance).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-right text-gray-400">
                                        {Number(item.credit_limit) > 0
                                            ? `$${Number(item.credit_limit).toLocaleString()}`
                                            : '—'
                                        }
                                    </td>
                                    <td className="px-4 py-3 text-center text-gray-500">
                                        {item.days_since_last_purchase ?? '—'}
                                    </td>
                                    <td className="px-5 py-3 text-center">
                                        <Badge variant={
                                            item.status === 'moroso' ? 'red' :
                                                item.status === 'active' ? 'green' : 'gray'
                                        }>
                                            {item.status === 'moroso' ? 'Moroso' :
                                                item.status === 'active' ? 'Activo' : item.status}
                                        </Badge>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}