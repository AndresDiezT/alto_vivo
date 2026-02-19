from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
from typing import List, Optional
from datetime import datetime, date
from decimal import Decimal

from app.database import get_db
from app.models.sale import Sale, SaleItem, SalePayment, PaymentMethod
from app.models.enums import SaleStatus
from app.models.inventory import ProductPresentation, ProductStock, InventoryMovement, MovementType
from app.models.client import Client, ClientPurchase, CreditMovement, ClientStatus
from app.models.user import User
from app.schemas.sale import (
    SaleCreate, SaleResponse, SaleSummary, SaleCancelRequest,
    SaleItemResponse, SalePaymentResponse, DailySummary, DailySummaryByMethod,
    PaymentMethodCreate, PaymentMethodUpdate, PaymentMethodResponse,
)
from app.api.deps import get_current_active_user, verify_business_access
from app.utils.audit import log_action

router = APIRouter(prefix="/businesses/{business_id}", tags=["Ventas"])


# ── Payment Methods CRUD ──────────────────────────────────────────────────────

@router.get("/payment-methods", response_model=List[PaymentMethodResponse])
def list_payment_methods(
    business_id: int,
    result=Depends(verify_business_access),
    db: Session = Depends(get_db),
):
    return db.query(PaymentMethod).filter(
        PaymentMethod.business_id == business_id,
        PaymentMethod.is_active == True,
    ).all()


@router.post("/payment-methods", response_model=PaymentMethodResponse, status_code=201)
def create_payment_method(
    business_id: int,
    data: PaymentMethodCreate,
    result=Depends(verify_business_access),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if data.is_credit:
        existing = db.query(PaymentMethod).filter(
            PaymentMethod.business_id == business_id,
            PaymentMethod.is_credit == True,
            PaymentMethod.is_active == True,
        ).first()
        if existing:
            raise HTTPException(400, "Ya existe un método de crédito (fiado). Solo se permite uno.")

    method = PaymentMethod(business_id=business_id, **data.model_dump())
    db.add(method)
    db.commit()
    db.refresh(method)
    return method


@router.patch("/payment-methods/{method_id}", response_model=PaymentMethodResponse)
def update_payment_method(
    business_id: int,
    method_id: int,
    data: PaymentMethodUpdate,
    result=Depends(verify_business_access),
    db: Session = Depends(get_db),
):
    method = db.query(PaymentMethod).filter(
        PaymentMethod.id == method_id,
        PaymentMethod.business_id == business_id,
    ).first()
    if not method:
        raise HTTPException(404, "Método no encontrado")
    if method.is_default:
        raise HTTPException(400, "No puedes modificar los métodos por defecto")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(method, field, value)
    db.commit()
    db.refresh(method)
    return method


@router.delete("/payment-methods/{method_id}", status_code=204)
def delete_payment_method(
    business_id: int,
    method_id: int,
    result=Depends(verify_business_access),
    db: Session = Depends(get_db),
):
    method = db.query(PaymentMethod).filter(
        PaymentMethod.id == method_id,
        PaymentMethod.business_id == business_id,
    ).first()
    if not method:
        raise HTTPException(404, "Método no encontrado")
    if method.is_default:
        raise HTTPException(400, "No puedes eliminar los métodos por defecto")
    method.is_active = False
    db.commit()


# ── Helpers ───────────────────────────────────────────────────────────────────

def get_or_create_stock(presentation_id: int, warehouse_id: int, db: Session) -> ProductStock:
    stock = db.query(ProductStock).filter(
        ProductStock.presentation_id == presentation_id,
        ProductStock.warehouse_id == warehouse_id,
    ).first()
    if not stock:
        stock = ProductStock(presentation_id=presentation_id, warehouse_id=warehouse_id, quantity=0)
        db.add(stock)
        db.flush()
    return stock


def build_sale_response(sale: Sale) -> SaleResponse:
    items = [
        SaleItemResponse(
            id=item.id,
            presentation_id=item.presentation_id,
            quantity=item.quantity,
            unit_price=item.unit_price,
            discount=item.discount,
            subtotal=item.subtotal,
            product_name=(
                item.presentation.product.name
                if item.presentation and item.presentation.product else None
            ),
            presentation_name=item.presentation.name if item.presentation else None,
        )
        for item in sale.items
    ]

    payments = [
        SalePaymentResponse(
            id=p.id,
            payment_method_id=p.payment_method_id,
            payment_method_name=p.payment_method.name if p.payment_method else None,
            amount=p.amount,
            is_credit=p.is_credit,
        )
        for p in sale.payments
    ]

    return SaleResponse(
        id=sale.id,
        business_id=sale.business_id,
        client_id=sale.client_id,
        warehouse_id=sale.warehouse_id,
        created_by=sale.created_by,
        subtotal=sale.subtotal,
        discount=sale.discount,
        total=sale.total,
        amount_paid=sale.amount_paid,
        amount_credit=sale.amount_credit,
        status=sale.status,
        notes=sale.notes,
        cancelled_at=sale.cancelled_at,
        cancel_reason=sale.cancel_reason,
        created_at=sale.created_at,
        items=items,
        payments=payments,
        client_name=sale.client.name if sale.client else None,
        seller_name=(
            sale.seller.full_name or sale.seller.username if sale.seller else None
        ),
    )


def update_client_status(client: Client):
    now = datetime.utcnow()
    if client.current_balance > 0 and client.last_purchase_at:
        if (now - client.last_purchase_at).days > client.credit_days:
            client.status = ClientStatus.MOROSO
            return
    if client.last_purchase_at and (now - client.last_purchase_at).days > 30:
        client.status = ClientStatus.INACTIVE
        return
    if client.status != ClientStatus.BLOCKED:
        client.status = ClientStatus.ACTIVE


def _load_sale_full(sale_id: int, db: Session) -> Sale:
    return db.query(Sale).options(
        joinedload(Sale.items)
            .joinedload(SaleItem.presentation)
            .joinedload(ProductPresentation.product),
        joinedload(Sale.payments).joinedload(SalePayment.payment_method),
        joinedload(Sale.client),
        joinedload(Sale.seller),
    ).filter(Sale.id == sale_id).first()


# ── Crear venta ───────────────────────────────────────────────────────────────

@router.post("/sales", response_model=SaleResponse, status_code=201)
def create_sale(
    business_id: int,
    data: SaleCreate,
    result=Depends(verify_business_access),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    # 1. Validar items y stock
    if not data.items:
        raise HTTPException(400, "La venta debe tener al menos un producto")

    presentations: dict[int, tuple[ProductPresentation, ProductStock]] = {}
    for item in data.items:
        pres = db.query(ProductPresentation).options(
            joinedload(ProductPresentation.product)
        ).filter(
            ProductPresentation.id == item.presentation_id,
            ProductPresentation.is_active == True,
        ).first()
        if not pres:
            raise HTTPException(404, f"Presentación {item.presentation_id} no encontrada")

        stock = get_or_create_stock(item.presentation_id, data.warehouse_id, db)
        if stock.quantity < item.quantity:
            raise HTTPException(
                400,
                f"Stock insuficiente para '{pres.product.name} - {pres.name}'. "
                f"Disponible: {stock.quantity}, solicitado: {item.quantity}",
            )
        presentations[item.presentation_id] = (pres, stock)

    # 2. Validar y cargar métodos de pago
    payment_methods: dict[int, PaymentMethod] = {}
    for p in data.payments:
        method = db.query(PaymentMethod).filter(
            PaymentMethod.id == p.payment_method_id,
            PaymentMethod.business_id == business_id,
            PaymentMethod.is_active == True,
        ).first()
        if not method:
            raise HTTPException(404, f"Método de pago {p.payment_method_id} no encontrado")
        payment_methods[p.payment_method_id] = method

    # 3. Calcular totales
    subtotal = sum((i.quantity * i.unit_price) - i.discount for i in data.items)
    total = subtotal - data.discount

    amount_credit = Decimal("0")
    amount_paid = Decimal("0")
    has_credit_payment = False

    for p in data.payments:
        method = payment_methods[p.payment_method_id]
        if method.is_credit:
            amount_credit += p.amount
            has_credit_payment = True
        else:
            amount_paid += p.amount

    # Validar que los montos cuadren con el total
    total_payments = amount_paid + amount_credit
    if total_payments != total:
        raise HTTPException(
            400,
            f"La suma de los pagos (${total_payments}) no coincide con el total (${total})",
        )

    # 4. Validar cliente — OPCIONAL, solo obligatorio si hay pago a crédito
    client = None
    if data.client_id:
        client = db.query(Client).filter(
            Client.id == data.client_id,
            Client.business_id == business_id,
            Client.is_active == True,
        ).first()
        if not client:
            raise HTTPException(404, "Cliente no encontrado")
        if client.status == ClientStatus.BLOCKED:
            raise HTTPException(400, "El cliente está bloqueado")

    if has_credit_payment:
        # Crédito siempre requiere cliente identificado
        if not client:
            raise HTTPException(
                400,
                "Las ventas con pago a crédito (fiado) requieren un cliente registrado",
            )
        if client.credit_limit > 0:
            new_balance = client.current_balance + amount_credit
            if new_balance > client.credit_limit:
                raise HTTPException(
                    400,
                    f"Supera el límite de crédito del cliente. "
                    f"Disponible: ${client.credit_limit - client.current_balance}",
                )

    # 5. Crear venta
    sale = Sale(
        business_id=business_id,
        client_id=data.client_id,   # puede ser None (venta sin cliente)
        warehouse_id=data.warehouse_id,
        created_by=current_user.id,
        subtotal=subtotal,
        discount=data.discount,
        total=total,
        amount_paid=amount_paid,
        amount_credit=amount_credit,
        status=SaleStatus.COMPLETED,
        notes=data.notes,
    )
    db.add(sale)
    db.flush()

    # 6. Registrar pagos individuales
    for p in data.payments:
        method = payment_methods[p.payment_method_id]
        db.add(SalePayment(
            sale_id=sale.id,
            payment_method_id=p.payment_method_id,
            amount=p.amount,
            is_credit=method.is_credit,
        ))

    # 7. Items + stock + movimientos de inventario
    for item in data.items:
        pres, stock = presentations[item.presentation_id]
        item_subtotal = (item.quantity * item.unit_price) - item.discount

        db.add(SaleItem(
            sale_id=sale.id,
            presentation_id=item.presentation_id,
            quantity=item.quantity,
            unit_price=item.unit_price,
            discount=item.discount,
            subtotal=item_subtotal,
        ))
        stock.quantity -= item.quantity
        db.add(InventoryMovement(
            business_id=business_id,
            presentation_id=item.presentation_id,
            warehouse_id=data.warehouse_id,
            movement_type=MovementType.SALE,
            quantity=-item.quantity,
            reference_id=sale.id,
            reference_type="sale",
            created_by=current_user.id,
        ))

    # 8. Actualizar cliente (solo si hay uno asociado)
    if client:
        client.last_purchase_at = datetime.utcnow()

        # Resumen legible de métodos usados para el historial
        payment_summary = " + ".join(
            payment_methods[p.payment_method_id].name for p in data.payments
        )
        db.add(ClientPurchase(
            client_id=client.id,
            business_id=business_id,
            total=total,
            payment_method=payment_summary,   # String descriptivo
            is_credit=has_credit_payment,
            notes=data.notes,
        ))

        if amount_credit > 0:
            client.current_balance += amount_credit
            db.add(CreditMovement(
                client_id=client.id,
                business_id=business_id,
                amount=amount_credit,
                movement_type="charge",
                description=f"Venta #{sale.id}",
                created_by=current_user.id,
            ))

        update_client_status(client)

    db.commit()
    log_action(
        db, current_user.id, "CREATE", "Sale", sale.id,
        business_id=business_id,
        details={
            "total": str(total),
            "payments": [
                {"method_id": p.payment_method_id, "amount": str(p.amount)}
                for p in data.payments
            ],
        },
    )

    return build_sale_response(_load_sale_full(sale.id, db))


# ── Listar ventas ─────────────────────────────────────────────────────────────

@router.get("/sales", response_model=List[SaleSummary])
def list_sales(
    business_id: int,
    result=Depends(verify_business_access),
    db: Session = Depends(get_db),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    client_id: Optional[int] = Query(None),
    status: Optional[SaleStatus] = Query(None),
    skip: int = 0,
    limit: int = 50,
):
    query = db.query(Sale).options(
        joinedload(Sale.client),
        joinedload(Sale.seller),
        joinedload(Sale.payments).joinedload(SalePayment.payment_method),
    ).filter(Sale.business_id == business_id)

    if date_from:
        query = query.filter(Sale.created_at >= datetime.combine(date_from, datetime.min.time()))
    if date_to:
        query = query.filter(Sale.created_at <= datetime.combine(date_to, datetime.max.time()))
    if client_id:
        query = query.filter(Sale.client_id == client_id)
    if status:
        query = query.filter(Sale.status == status)

    sales = query.order_by(desc(Sale.created_at)).offset(skip).limit(limit).all()

    return [
        SaleSummary(
            id=s.id,
            client_id=s.client_id,
            client_name=s.client.name if s.client else None,
            total=s.total,
            amount_credit=s.amount_credit,
            status=s.status,
            created_at=s.created_at,
            seller_name=s.seller.full_name or s.seller.username if s.seller else None,
            payment_summary=" + ".join(
                p.payment_method.name for p in s.payments if p.payment_method
            ) or None,
        )
        for s in sales
    ]


# ── Detalle venta ─────────────────────────────────────────────────────────────

@router.get("/sales/{sale_id}", response_model=SaleResponse)
def get_sale(
    business_id: int,
    sale_id: int,
    result=Depends(verify_business_access),
    db: Session = Depends(get_db),
):
    sale = _load_sale_full(sale_id, db)
    if not sale or sale.business_id != business_id:
        raise HTTPException(404, "Venta no encontrada")
    return build_sale_response(sale)


# ── Cancelar venta ────────────────────────────────────────────────────────────

@router.post("/sales/{sale_id}/cancel", response_model=SaleResponse)
def cancel_sale(
    business_id: int,
    sale_id: int,
    data: SaleCancelRequest,
    result=Depends(verify_business_access),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    sale = db.query(Sale).options(
        joinedload(Sale.items),
        joinedload(Sale.client),
        joinedload(Sale.payments),
    ).filter(Sale.id == sale_id, Sale.business_id == business_id).first()

    if not sale:
        raise HTTPException(404, "Venta no encontrada")
    if sale.status == SaleStatus.CANCELLED:
        raise HTTPException(400, "La venta ya está cancelada")

    # Revertir stock
    for item in sale.items:
        stock = get_or_create_stock(item.presentation_id, sale.warehouse_id, db)
        stock.quantity += item.quantity
        db.add(InventoryMovement(
            business_id=business_id,
            presentation_id=item.presentation_id,
            warehouse_id=sale.warehouse_id,
            movement_type=MovementType.ADJUSTMENT,
            quantity=item.quantity,
            reason=f"Cancelación venta #{sale_id}",
            reference_id=sale_id,
            reference_type="sale_cancel",
            created_by=current_user.id,
        ))

    # Revertir deuda del cliente (solo si la venta tenía crédito y cliente)
    if sale.client and sale.amount_credit > 0:
        sale.client.current_balance -= sale.amount_credit
        if sale.client.current_balance < 0:
            sale.client.current_balance = Decimal("0")
        db.add(CreditMovement(
            client_id=sale.client_id,
            business_id=business_id,
            amount=sale.amount_credit,
            movement_type="payment",
            description=f"Cancelación venta #{sale_id}",
            created_by=current_user.id,
        ))
        update_client_status(sale.client)

    sale.status = SaleStatus.CANCELLED
    sale.cancelled_at = datetime.utcnow()
    sale.cancelled_by = current_user.id
    sale.cancel_reason = data.reason

    db.commit()
    log_action(db, current_user.id, "CANCEL", "Sale", sale.id,
               business_id=business_id, details={"reason": data.reason})

    return build_sale_response(_load_sale_full(sale_id, db))


# ── Resumen diario ────────────────────────────────────────────────────────────

@router.get("/sales/summary/daily", response_model=DailySummary)
def get_daily_summary(
    business_id: int,
    result=Depends(verify_business_access),
    db: Session = Depends(get_db),
    target_date: Optional[date] = Query(None),
):
    d = target_date or date.today()
    start = datetime.combine(d, datetime.min.time())
    end = datetime.combine(d, datetime.max.time())

    sales = db.query(Sale).options(
        joinedload(Sale.payments).joinedload(SalePayment.payment_method),
    ).filter(
        Sale.business_id == business_id,
        Sale.created_at >= start,
        Sale.created_at <= end,
        Sale.status == SaleStatus.COMPLETED,
    ).all()

    cancelled_count = db.query(Sale).filter(
        Sale.business_id == business_id,
        Sale.created_at >= start,
        Sale.created_at <= end,
        Sale.status == SaleStatus.CANCELLED,
    ).count()

    total_revenue = sum(s.total for s in sales) or Decimal("0")
    total_credit = sum(s.amount_credit for s in sales) or Decimal("0")

    # Acumular en dict mutable, construir objetos Pydantic al final
    # (los BaseModel de Pydantic v2 son inmutables, no se puede hacer +=)
    by_method_totals: dict[int, dict] = {}
    for sale in sales:
        for p in sale.payments:
            mid = p.payment_method_id
            if mid not in by_method_totals:
                by_method_totals[mid] = {
                    "payment_method_id": mid,
                    "payment_method_name": (
                        p.payment_method.name if p.payment_method else str(mid)
                    ),
                    "total": Decimal("0"),
                    "is_credit": p.is_credit,
                }
            by_method_totals[mid]["total"] += p.amount

    return DailySummary(
        total_sales=len(sales),
        total_revenue=total_revenue,
        total_credit=total_credit,
        cancelled_count=cancelled_count,
        by_method=[DailySummaryByMethod(**v) for v in by_method_totals.values()],
    )