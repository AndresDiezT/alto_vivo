import { useParams } from 'react-router-dom'
import React from 'react'
import { SalesReportTab } from './tabs/SalesReportTab'
import { ClientsReportTab } from './tabs/ClientsReportTab'
import { InventoryReportTab } from './tabs/InventoryReportTab'
import { WasteReportTab } from './tabs/WasteReportTab'
import { PortfolioReportTab } from './tabs/PortfolioReportTab'
import { ProfitabilityReportTab } from './tabs/ProfibalityReportTab'

const TABS = [
    { key: 'sales', label: '📈 Ventas' },
    { key: 'profitability', label: '💰 Rentabilidad' },
    { key: 'inventory', label: '📦 Inventario' },
    { key: 'clients', label: '👥 Clientes' },
    { key: 'portfolio', label: '📋 Cartera' },
    { key: 'waste', label: '🗑️ Mermas' },
] as const

type TabKey = typeof TABS[number]['key']

export function ReportsPage() {
    const { id } = useParams<{ id: string }>()
    const businessId = Number(id)
    const [tab, setTab] = React.useState<TabKey>('sales')

    return (
        <div className="p-6 md:p-8 max-w-6xl mx-auto animate-fade-in space-y-6">
            <div>
                <h1 className="text-xl font-bold text-gray-900">Reportes</h1>
                <p className="text-sm text-gray-500">Análisis y exportación de datos del negocio</p>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-100 overflow-x-auto">
                <div className="flex gap-1 min-w-max">
                    {TABS.map(t => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${tab === t.key
                                    ? 'border-brand-600 text-brand-700'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Contenido */}
            {tab === 'sales' && <SalesReportTab businessId={businessId} />}
            {tab === 'profitability' && <ProfitabilityReportTab businessId={businessId} />}
            {tab === 'inventory' && <InventoryReportTab businessId={businessId} />}
            {tab === 'clients' && <ClientsReportTab businessId={businessId} />}
            {tab === 'portfolio' && <PortfolioReportTab businessId={businessId} />}
            {tab === 'waste' && <WasteReportTab businessId={businessId} />}
        </div>
    )
}