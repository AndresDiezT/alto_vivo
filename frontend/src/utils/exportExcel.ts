import * as XLSX from 'xlsx'

export function exportReportToExcel(type: string, data: any) {
    const wb = XLSX.utils.book_new()
    let ws: XLSX.WorkSheet

    if (type === 'sales') {
        ws = XLSX.utils.json_to_sheet(data.by_period.map((p: any) => ({
            Período: p.period,
            Ventas: p.total_sales,
            Ingresos: Number(p.total_revenue),
            Efectivo: Number(p.total_cash),
            Fiado: Number(p.total_credit),
        })))
        XLSX.utils.book_append_sheet(wb, ws, 'Ventas por período')
        const wsTop = XLSX.utils.json_to_sheet(data.top_products.map((p: any) => ({
            Producto: p.product_name,
            Presentación: p.presentation_name,
            'Unidades vendidas': Number(p.units_sold),
            'Nº ventas': p.times_sold,
            'Total ingresos': Number(p.total_revenue),
        })))
        XLSX.utils.book_append_sheet(wb, wsTop, 'Top productos')
    } else if (type === 'profitability') {
        ws = XLSX.utils.json_to_sheet(data.items.map((i: any) => ({
            Producto: i.product_name,
            Presentación: i.presentation_name,
            'Unidades vendidas': Number(i.units_sold),
            'Precio venta prom.': Number(i.avg_sale_price),
            'Costo prom.': i.avg_cost_price ? Number(i.avg_cost_price) : '',
            'Ingresos': Number(i.revenue),
            'Costo estimado': i.estimated_cost ? Number(i.estimated_cost) : '',
            'Ganancia bruta': i.gross_profit ? Number(i.gross_profit) : '',
            'Margen %': i.margin_pct ? Number(i.margin_pct).toFixed(1) : '',
        })))
        XLSX.utils.book_append_sheet(wb, ws, 'Rentabilidad')
    } else if (type === 'inventory') {
        ws = XLSX.utils.json_to_sheet(data.items.map((i: any) => ({
            Producto: i.product_name,
            Presentación: i.presentation_name,
            Categoría: i.category_name ?? '',
            'Stock actual': Number(i.total_stock),
            'Stock mínimo': i.min_stock,
            'Stock bajo': i.is_low_stock ? 'Sí' : 'No',
            'Lotes por vencer': i.expiring_soon,
            'Lotes vencidos': i.expired_lots,
        })))
        XLSX.utils.book_append_sheet(wb, ws, 'Inventario')
    } else if (type === 'clients') {
        ws = XLSX.utils.json_to_sheet(data.top_clients.map((c: any) => ({
            Cliente: c.client_name,
            'Total compras': c.total_purchases,
            'Total gastado': Number(c.total_spent),
            'Deuda actual': Number(c.current_balance),
        })))
        XLSX.utils.book_append_sheet(wb, ws, 'Top clientes')
    } else if (type === 'portfolio') {
        ws = XLSX.utils.json_to_sheet(data.debt_items.map((i: any) => ({
            Cliente: i.client_name,
            Teléfono: i.phone ?? '',
            Deuda: Number(i.current_balance),
            'Límite crédito': Number(i.credit_limit),
            'Días sin comprar': i.days_since_last_purchase ?? '',
            Estado: i.status,
        })))
        XLSX.utils.book_append_sheet(wb, ws, 'Cartera')
    } else if (type === 'waste') {
        ws = XLSX.utils.json_to_sheet(data.by_product.map((p: any) => ({
            Producto: p.product_name,
            Presentación: p.presentation_name,
            'Cantidad perdida': Number(p.total_quantity),
            'Costo perdido': Number(p.total_cost),
            Registros: p.records_count,
        })))
        XLSX.utils.book_append_sheet(wb, ws, 'Mermas por producto')
    }

    XLSX.writeFile(wb, `reporte_${type}_${new Date().toISOString().split('T')[0]}.xlsx`)
}