import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export function exportReportToPdf(type: string, data: any) {
    const doc = new jsPDF()
    const date = new Date().toLocaleDateString('es-CO')

    const titles: Record<string, string> = {
        sales: 'Reporte de Ventas',
        profitability: 'Reporte de Rentabilidad',
        inventory: 'Reporte de Inventario',
        clients: 'Reporte de Clientes',
        portfolio: 'Reporte de Cartera',
        waste: 'Reporte de Mermas',
    }

    doc.setFontSize(16)
    doc.text(titles[type] ?? 'Reporte', 14, 20)
    doc.setFontSize(10)
    doc.setTextColor(150)
    doc.text(`Generado: ${date}`, 14, 28)
    doc.setTextColor(0)

    if (type === 'sales') {
        autoTable(doc, {
            startY: 35,
            head: [['Período', 'Ventas', 'Ingresos', 'Efectivo', 'Fiado']],
            body: data.by_period.map((p: any) => [
                p.period, p.total_sales,
                `$${Number(p.total_revenue).toLocaleString()}`,
                `$${Number(p.total_cash).toLocaleString()}`,
                `$${Number(p.total_credit).toLocaleString()}`,
            ]),
        })
    } else if (type === 'profitability') {
        autoTable(doc, {
            startY: 35,
            head: [['Producto', 'Unidades', 'Ingresos', 'Ganancia', 'Margen %']],
            body: data.items.map((i: any) => [
                `${i.product_name} — ${i.presentation_name}`,
                Number(i.units_sold).toLocaleString(),
                `$${Number(i.revenue).toLocaleString()}`,
                i.gross_profit ? `$${Number(i.gross_profit).toLocaleString()}` : '—',
                i.margin_pct ? `${Number(i.margin_pct).toFixed(1)}%` : '—',
            ]),
        })
    } else if (type === 'inventory') {
        autoTable(doc, {
            startY: 35,
            head: [['Producto', 'Stock', 'Mínimo', 'Stock bajo', 'Vencidos']],
            body: data.items.map((i: any) => [
                `${i.product_name} — ${i.presentation_name}`,
                Number(i.total_stock).toLocaleString(),
                i.min_stock,
                i.is_low_stock ? 'Sí' : 'No',
                i.expired_lots > 0 ? `${i.expired_lots} lotes` : '—',
            ]),
        })
    } else if (type === 'clients') {
        autoTable(doc, {
            startY: 35,
            head: [['Cliente', 'Compras', 'Total gastado', 'Deuda actual']],
            body: data.top_clients.map((c: any) => [
                c.client_name, c.total_purchases,
                `$${Number(c.total_spent).toLocaleString()}`,
                `$${Number(c.current_balance).toLocaleString()}`,
            ]),
        })
    } else if (type === 'portfolio') {
        autoTable(doc, {
            startY: 35,
            head: [['Cliente', 'Teléfono', 'Deuda', 'Estado']],
            body: data.debt_items.map((i: any) => [
                i.client_name, i.phone ?? '—',
                `$${Number(i.current_balance).toLocaleString()}`,
                i.status,
            ]),
        })
    } else if (type === 'waste') {
        autoTable(doc, {
            startY: 35,
            head: [['Producto', 'Cantidad', 'Costo perdido', 'Registros']],
            body: data.by_product.map((p: any) => [
                `${p.product_name} — ${p.presentation_name}`,
                Number(p.total_quantity).toLocaleString(),
                `$${Number(p.total_cost).toLocaleString()}`,
                p.records_count,
            ]),
        })
    }

    doc.save(`reporte_${type}_${new Date().toISOString().split('T')[0]}.pdf`)
}