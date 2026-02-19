import { useClientsReport } from '@/hooks/useReports'
import { PageLoader } from '@/components/ui'
import { exportReportToExcel } from '@/utils/exportExcel'
import { exportReportToPdf } from '@/utils/exportPdf'
import { Download, FileSpreadsheet } from 'lucide-react'

export function ClientsReportTab({ businessId }: { businessId: number }) {
    const { data: report, isLoading } = useClientsReport(businessId)
    if (isLoading) return <PageLoader />
    if (!report) return null

    return (
        <div className="space-y-6">
            <div className="flex justify-end gap-2">
                <button onClick={() => exportReportToExcel('clients', report)} className="btn-secondary btn-sm">
                    <FileSpreadsheet className="w-4 h-4" /> Excel
                </button>
                <button onClick={() => exportReportToPdf('clients', report)} className="btn-secondary btn-sm">
                    <Download className="w-4 h-4" /> PDF
                </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
                <div className="card p-4">
                    <p className="text-xs text-gray-500 mb-1">Clientes activos</p>
                    <p className="text-lg font-bold text-gray-900">{report.total_active_clients}</p>
                </div>
                <div className="card p-4">
                    <p className="text-xs text-gray-500 mb-1">Con deuda</p>
                    <p className="text-lg font-bold text-yellow-600">{report.total_with_debt}</p>
                </div>
                <div className="card p-4">
                    <p className="text-xs text-gray-500 mb-1">Cartera total</p>
                    <p className="text-lg font-bold text-red-600">${Number(report.total_portfolio).toLocaleString()}</p>
                </div>
            </div>

            <div className="card overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 bg-surface-50">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Top clientes por compras
                    </p>
                </div>
                <div className="divide-y divide-gray-100">
                    {report.top_clients.length === 0 && (
                        <p className="text-sm text-gray-400 text-center py-10">Sin datos de clientes</p>
                    )}
                    {report.top_clients.map((c, i) => (
                        <div key={c.client_id} className="flex items-center gap-4 px-5 py-3">
                            <span className="text-sm font-bold text-gray-300 w-6">#{i + 1}</span>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-800">{c.client_name}</p>
                                <p className="text-xs text-gray-400">{c.total_purchases} compras</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-semibold text-gray-800">
                                    ${Number(c.total_spent).toLocaleString()}
                                </p>
                                {Number(c.current_balance) > 0 && (
                                    <p className="text-xs text-red-500">
                                        Debe ${Number(c.current_balance).toLocaleString()}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}