from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, func
from typing import Optional, List
from datetime import datetime, date, timedelta
from decimal import Decimal
from collections import defaultdict

from app.database import get_db
from app.models.sale import Sale, SaleItem, SalePayment
from app.models.inventory import (
    ProductPresentation, ProductStock, ProductLot, Product,
)
from app.models.client import Client, ClientPurchase, CreditMovement
from app.models.waste import WasteRecord, WasteCause
from app.models.enums import SaleStatus, ClientStatus
from app.schemas.reports import (
    SalesReport, SalesByPeriod, TopProduct,
    ClientsReport, TopClient,
    InventoryReport, InventoryStatusItem,
    WasteReport, WasteByProduct,
    PortfolioReport, PortfolioDebtItem,
    ProfitabilityReport, ProfitabilityItem,
)
from app.api.deps import verify_business_access

router = APIRouter(prefix="/businesses/{business_id}/reports", tags=["Reportes"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def date_range(date_from: Optional[date], date_to: Optional[date]):
    d_from = datetime.combine(date_from or date.today().replace(day=1), datetime.min.time())
    d_to = datetime.combine(date_to or date.today(), datetime.max.time())
    return d_from, d_to


# ── Reporte de ventas ─────────────────────────────────────────────────────────

@router.get("/sales", response_model=SalesReport)
def sales_report(
    business_id: int,
    result=Depends(verify_business_access),
    db: Session = Depends(get_db),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    group_by: str = Query("day", pattern="^(day|week|month)$"),
):
    d_from, d_to = date_range(date_from, date_to)

    sales = db.query(Sale).options(
        joinedload(Sale.items).joinedload(SaleItem.presentation)
            .joinedload(ProductPresentation.product),
        joinedload(Sale.payments).joinedload(SalePayment.payment_method),
    ).filter(
        Sale.business_id == business_id,
        Sale.created_at >= d_from,
        Sale.created_at <= d_to,
        Sale.status == SaleStatus.COMPLETED,
    ).all()

    total_revenue = sum(s.total for s in sales) or Decimal("0")
    total_credit = sum(s.amount_credit for s in sales) or Decimal("0")
    avg_ticket = total_revenue / len(sales) if sales else Decimal("0")

    # Agrupar por período
    period_map: dict[str, dict] = defaultdict(lambda: {
        "total_sales": 0, "total_revenue": Decimal("0"),
        "total_credit": Decimal("0"), "total_cash": Decimal("0"),
    })

    for s in sales:
        if group_by == "day":
            key = s.created_at.strftime("%Y-%m-%d")
        elif group_by == "week":
            key = s.created_at.strftime("%Y-W%W")
        else:
            key = s.created_at.strftime("%Y-%m")

        period_map[key]["total_sales"] += 1
        period_map[key]["total_revenue"] += s.total
        period_map[key]["total_credit"] += s.amount_credit
        period_map[key]["total_cash"] += s.total - s.amount_credit

    by_period = [
        SalesByPeriod(period=k, **v)
        for k, v in sorted(period_map.items())
    ]

    # Top productos
    product_map: dict[int, dict] = defaultdict(lambda: {
        "units_sold": Decimal("0"),
        "total_revenue": Decimal("0"),
        "times_sold": 0,
        "product_name": "",
        "presentation_name": "",
    })

    for s in sales:
        for item in s.items:
            pid = item.presentation_id
            product_map[pid]["units_sold"] += item.quantity
            product_map[pid]["total_revenue"] += item.subtotal
            product_map[pid]["times_sold"] += 1
            if item.presentation:
                product_map[pid]["presentation_name"] = item.presentation.name
                if item.presentation.product:
                    product_map[pid]["product_name"] = item.presentation.product.name

    top_products = sorted(
        [
            TopProduct(presentation_id=pid, **data)
            for pid, data in product_map.items()
        ],
        key=lambda x: x.total_revenue,
        reverse=True,
    )[:10]

    return SalesReport(
        date_from=date_from or date.today().replace(day=1),
        date_to=date_to or date.today(),
        total_revenue=total_revenue,
        total_sales=len(sales),
        total_credit=total_credit,
        average_ticket=avg_ticket,
        by_period=by_period,
        top_products=top_products,
    )


# ── Reporte de clientes ───────────────────────────────────────────────────────

@router.get("/clients", response_model=ClientsReport)
def clients_report(
    business_id: int,
    result=Depends(verify_business_access),
    db: Session = Depends(get_db),
):
    clients = db.query(Client).filter(
        Client.business_id == business_id,
        Client.is_active == True,
    ).all()

    with_debt = [c for c in clients if c.current_balance > 0]
    total_portfolio = sum(c.current_balance for c in with_debt) or Decimal("0")

    # Top clientes por gasto
    purchases = db.query(ClientPurchase).filter(
        ClientPurchase.business_id == business_id,
    ).all()

    client_spend: dict[int, Decimal] = defaultdict(Decimal)
    client_count: dict[int, int] = defaultdict(int)
    for p in purchases:
        client_spend[p.client_id] += p.total
        client_count[p.client_id] += 1

    client_map = {c.id: c for c in clients}
    top_clients = sorted(
        [
            TopClient(
                client_id=cid,
                client_name=client_map[cid].name if cid in client_map else "—",
                total_purchases=client_count[cid],
                total_spent=spent,
                current_balance=client_map[cid].current_balance if cid in client_map else Decimal("0"),
            )
            for cid, spent in client_spend.items()
            if cid in client_map
        ],
        key=lambda x: x.total_spent,
        reverse=True,
    )[:10]

    return ClientsReport(
        total_active_clients=len(clients),
        total_with_debt=len(with_debt),
        total_portfolio=total_portfolio,
        top_clients=top_clients,
    )


# ── Reporte de inventario ─────────────────────────────────────────────────────

@router.get("/inventory", response_model=InventoryReport)
def inventory_report(
    business_id: int,
    result=Depends(verify_business_access),
    db: Session = Depends(get_db),
):
    now = datetime.utcnow()
    soon = now + timedelta(days=7)

    presentations = db.query(ProductPresentation).options(
        joinedload(ProductPresentation.product).joinedload(Product.category),
        joinedload(ProductPresentation.stock),
    ).filter(
        ProductPresentation.is_active == True,
        ProductPresentation.product.has(
            business_id=business_id,
            is_active=True,
        ),
    ).all()

    items = []
    low_stock_count = 0
    expiring_count = 0
    expired_count = 0

    for pres in presentations:
        total_stock = sum(s.quantity for s in pres.stock) or Decimal("0")
        is_low = pres.min_stock > 0 and total_stock <= pres.min_stock

        lots = db.query(ProductLot).filter(
            ProductLot.presentation_id == pres.id,
            ProductLot.remaining > 0,
            ProductLot.is_active == True,
        ).all()

        expiring = sum(
            1 for lot in lots
            if lot.expiry_date and now < lot.expiry_date <= soon
        )
        expired = sum(
            1 for lot in lots
            if lot.expiry_date and lot.expiry_date <= now
        )

        if is_low: low_stock_count += 1
        if expiring: expiring_count += 1
        if expired: expired_count += 1

        items.append(InventoryStatusItem(
            presentation_id=pres.id,
            product_name=pres.product.name if pres.product else "—",
            presentation_name=pres.name,
            category_name=pres.product.category.name if pres.product and pres.product.category else None,
            total_stock=total_stock,
            min_stock=pres.min_stock,
            is_low_stock=is_low,
            expiring_soon=expiring,
            expired_lots=expired,
        ))

    items.sort(key=lambda x: (not x.is_low_stock, -x.expired_lots, -x.expiring_soon))

    return InventoryReport(
        total_products=len(items),
        low_stock_count=low_stock_count,
        expiring_count=expiring_count,
        expired_count=expired_count,
        items=items,
    )


# ── Reporte de mermas ─────────────────────────────────────────────────────────

@router.get("/waste", response_model=WasteReport)
def waste_report(
    business_id: int,
    result=Depends(verify_business_access),
    db: Session = Depends(get_db),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
):
    d_from, d_to = date_range(date_from, date_to)

    records = db.query(WasteRecord).options(
        joinedload(WasteRecord.presentation)
            .joinedload(ProductPresentation.product)
    ).filter(
        WasteRecord.business_id == business_id,
        WasteRecord.created_at >= d_from,
        WasteRecord.created_at <= d_to,
    ).all()

    total_cost = sum(r.total_cost for r in records if r.total_cost) or Decimal("0")

    cause_map: dict[str, dict] = defaultdict(
        lambda: {"cause": None, "count": 0, "total_cost": Decimal("0")}
    )
    for r in records:
        cause_map[r.cause.value]["cause"] = r.cause.value
        cause_map[r.cause.value]["count"] += 1
        if r.total_cost:
            cause_map[r.cause.value]["total_cost"] += r.total_cost

    product_map: dict[int, dict] = defaultdict(lambda: {
        "product_name": "", "presentation_name": "",
        "total_quantity": Decimal("0"), "total_cost": Decimal("0"),
        "records_count": 0,
    })
    for r in records:
        pid = r.presentation_id
        product_map[pid]["records_count"] += 1
        product_map[pid]["total_quantity"] += r.quantity
        if r.total_cost:
            product_map[pid]["total_cost"] += r.total_cost
        if r.presentation:
            product_map[pid]["presentation_name"] = r.presentation.name
            if r.presentation.product:
                product_map[pid]["product_name"] = r.presentation.product.name

    by_product = sorted(
        [WasteByProduct(**v) for v in product_map.values()],
        key=lambda x: x.total_cost,
        reverse=True,
    )[:10]

    return WasteReport(
        date_from=date_from or date.today().replace(day=1),
        date_to=date_to or date.today(),
        total_records=len(records),
        total_cost=total_cost,
        auto_count=sum(1 for r in records if r.is_auto),
        manual_count=sum(1 for r in records if not r.is_auto),
        by_cause=list(cause_map.values()),
        by_product=by_product,
    )


# ── Reporte de cartera ────────────────────────────────────────────────────────

@router.get("/portfolio", response_model=PortfolioReport)
def portfolio_report(
    business_id: int,
    result=Depends(verify_business_access),
    db: Session = Depends(get_db),
):
    now = datetime.utcnow()
    thirty_ago = now - timedelta(days=30)

    clients = db.query(Client).filter(
        Client.business_id == business_id,
        Client.is_active == True,
        Client.current_balance > 0,
    ).all()

    total_portfolio = sum(c.current_balance for c in clients) or Decimal("0")
    morosos = [c for c in clients if c.status == ClientStatus.MOROSO]
    total_overdue = sum(c.current_balance for c in morosos) or Decimal("0")

    recent_payments = db.query(CreditMovement).filter(
        CreditMovement.business_id == business_id,
        CreditMovement.movement_type == "payment",
        CreditMovement.created_at >= thirty_ago,
    ).all()
    collected_last_30 = sum(p.amount for p in recent_payments) or Decimal("0")

    debt_items = []
    for c in sorted(clients, key=lambda x: x.current_balance, reverse=True):
        days = (now - c.last_purchase_at).days if c.last_purchase_at else None
        debt_items.append(PortfolioDebtItem(
            client_id=c.id,
            client_name=c.name,
            phone=c.phone,
            current_balance=c.current_balance,
            credit_limit=c.credit_limit,
            days_since_last_purchase=days,
            status=c.status.value,
        ))

    return PortfolioReport(
        total_portfolio=total_portfolio,
        total_overdue=total_overdue,
        total_clients_with_debt=len(clients),
        morosos_count=len(morosos),
        collected_last_30=collected_last_30,
        debt_items=debt_items,
    )


# ── Reporte de rentabilidad ───────────────────────────────────────────────────

@router.get("/profitability", response_model=ProfitabilityReport)
def profitability_report(
    business_id: int,
    result=Depends(verify_business_access),
    db: Session = Depends(get_db),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
):
    d_from, d_to = date_range(date_from, date_to)

    sales = db.query(Sale).options(
        joinedload(Sale.items).joinedload(SaleItem.presentation)
            .joinedload(ProductPresentation.product),
    ).filter(
        Sale.business_id == business_id,
        Sale.created_at >= d_from,
        Sale.created_at <= d_to,
        Sale.status == SaleStatus.COMPLETED,
    ).all()

    product_map: dict[int, dict] = defaultdict(lambda: {
        "product_name": "", "presentation_name": "",
        "units_sold": Decimal("0"), "revenue": Decimal("0"),
        "sale_prices": [], "cost_prices": [],
    })

    for s in sales:
        for item in s.items:
            pid = item.presentation_id
            product_map[pid]["units_sold"] += item.quantity
            product_map[pid]["revenue"] += item.subtotal
            product_map[pid]["sale_prices"].append(float(item.unit_price))
            if item.presentation and item.presentation.product:
                product_map[pid]["product_name"] = item.presentation.product.name
                product_map[pid]["presentation_name"] = item.presentation.name

    # Obtener costo promedio de lotes para cada presentación
    for pid, data in product_map.items():
        lots = db.query(ProductLot).filter(
            ProductLot.presentation_id == pid,
            ProductLot.cost_per_unit.isnot(None),
        ).order_by(desc(ProductLot.arrival_date)).limit(5).all()
        if lots:
            avg_cost = sum(float(l.cost_per_unit) for l in lots) / len(lots)
            data["cost_prices"] = [avg_cost]

    items = []
    total_revenue = Decimal("0")
    total_cost = Decimal("0")

    for pid, data in product_map.items():
        revenue = data["revenue"]
        avg_sale = Decimal(str(
            sum(data["sale_prices"]) / len(data["sale_prices"])
        )) if data["sale_prices"] else None

        avg_cost = Decimal(str(data["cost_prices"][0])) if data["cost_prices"] else None
        estimated_cost = (avg_cost * data["units_sold"]) if avg_cost else None
        gross_profit = (revenue - estimated_cost) if estimated_cost else None
        margin = (gross_profit / revenue * 100) if gross_profit and revenue > 0 else None

        total_revenue += revenue
        if estimated_cost:
            total_cost += estimated_cost

        items.append(ProfitabilityItem(
            presentation_id=pid,
            product_name=data["product_name"],
            presentation_name=data["presentation_name"],
            units_sold=data["units_sold"],
            avg_sale_price=avg_sale or Decimal("0"),
            avg_cost_price=avg_cost,
            revenue=revenue,
            estimated_cost=estimated_cost,
            gross_profit=gross_profit,
            margin_pct=margin,
        ))

    items.sort(key=lambda x: x.revenue, reverse=True)

    total_profit = total_revenue - total_cost if total_cost else None
    overall_margin = (total_profit / total_revenue * 100) if total_profit and total_revenue > 0 else None

    return ProfitabilityReport(
        date_from=date_from or date.today().replace(day=1),
        date_to=date_to or date.today(),
        total_revenue=total_revenue,
        total_cost=total_cost or None,
        total_profit=total_profit,
        overall_margin=overall_margin,
        items=items,
    )