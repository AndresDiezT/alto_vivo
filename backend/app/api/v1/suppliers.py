from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
from typing import List, Optional
from datetime import datetime, timedelta
from decimal import Decimal

from app.database import get_db
from app.models.supplier import (
    Supplier, SupplierProduct, SupplierPurchase,
    SupplierPurchaseItem, SupplierPayment,
)
from app.models.enums import SupplierStatus, PurchaseStatus, SupplierPaymentStatus
from app.models.inventory import (
    ProductPresentation, ProductStock,
    ProductLot, InventoryMovement, MovementType,
)
from app.models.user import User
from app.schemas.supplier import (
    SupplierCreate, SupplierUpdate, SupplierResponse, SupplierStats,
    SupplierProductCreate, SupplierProductResponse,
    PurchaseCreate, PurchaseResponse,
    SupplierPaymentCreate, SupplierPaymentResponse,
    SupplierPortfolioSummary,
)
from app.api.deps import get_current_active_user, verify_business_access
from app.utils.audit import log_action

router = APIRouter(prefix="/businesses/{business_id}/suppliers", tags=["Proveedores"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def get_supplier_or_404(supplier_id: int, business_id: int, db: Session) -> Supplier:
    supplier = db.query(Supplier).filter(
        Supplier.id == supplier_id,
        Supplier.business_id == business_id,
        Supplier.is_active == True,
    ).first()
    if not supplier:
        raise HTTPException(404, "Proveedor no encontrado")
    return supplier


def get_or_create_stock(presentation_id: int, warehouse_id: int, db: Session) -> ProductStock:
    stock = db.query(ProductStock).filter(
        ProductStock.presentation_id == presentation_id,
        ProductStock.warehouse_id == warehouse_id,
    ).first()
    if not stock:
        stock = ProductStock(
            presentation_id=presentation_id,
            warehouse_id=warehouse_id,
            quantity=0,
        )
        db.add(stock)
        db.flush()
    return stock


def build_purchase_response(purchase: SupplierPurchase) -> PurchaseResponse:
    items = [
        PurchaseItemResponse(
            id=item.id,
            presentation_id=item.presentation_id,
            quantity=item.quantity,
            cost_per_unit=item.cost_per_unit,
            subtotal=item.subtotal,
            lot_number=item.lot_number,
            expiry_date=item.expiry_date,
            product_name=(
                item.presentation.product.name
                if item.presentation and item.presentation.product else None
            ),
            presentation_name=item.presentation.name if item.presentation else None,
        )
        for item in purchase.items
    ]
    return PurchaseResponse(
        id=purchase.id,
        supplier_id=purchase.supplier_id,
        business_id=purchase.business_id,
        warehouse_id=purchase.warehouse_id,
        created_by=purchase.created_by,
        subtotal=purchase.subtotal,
        discount=purchase.discount,
        total=purchase.total,
        amount_paid=purchase.amount_paid,
        amount_credit=purchase.amount_credit,
        payment_status=purchase.payment_status,
        status=purchase.status,
        notes=purchase.notes,
        expected_payment_date=purchase.expected_payment_date,
        created_at=purchase.created_at,
        items=items,
    )


# ── CRUD Proveedores ──────────────────────────────────────────────────────────

@router.post("", response_model=SupplierResponse, status_code=201)
def create_supplier(
    business_id: int,
    data: SupplierCreate,
    result=Depends(verify_business_access),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    supplier = Supplier(business_id=business_id, **data.model_dump())
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    log_action(db, current_user.id, "CREATE", "Supplier", supplier.id, business_id=business_id)
    return supplier


@router.get("", response_model=List[SupplierResponse])
def list_suppliers(
    business_id: int,
    result=Depends(verify_business_access),
    db: Session = Depends(get_db),
    search: Optional[str] = Query(None),
    has_debt: Optional[bool] = Query(None),
    skip: int = 0,
    limit: int = 50,
):
    query = db.query(Supplier).filter(
        Supplier.business_id == business_id,
        Supplier.is_active == True,
    )
    if search:
        query = query.filter(
            Supplier.name.ilike(f"%{search}%") |
            Supplier.phone.ilike(f"%{search}%")
        )
    if has_debt is True:
        query = query.filter(Supplier.current_balance > 0)
    if has_debt is False:
        query = query.filter(Supplier.current_balance <= 0)

    return query.order_by(desc(Supplier.last_purchase_at)).offset(skip).limit(limit).all()


@router.get("/portfolio", response_model=SupplierPortfolioSummary)
def get_supplier_portfolio(
    business_id: int,
    result=Depends(verify_business_access),
    db: Session = Depends(get_db),
):
    suppliers_with_debt = db.query(Supplier).filter(
        Supplier.business_id == business_id,
        Supplier.is_active == True,
        Supplier.current_balance > 0,
    ).all()

    total_payable = sum(s.current_balance for s in suppliers_with_debt) or Decimal("0")

    # Vencidos: deuda + días sin compra > credit_days
    now = datetime.utcnow()
    overdue = [
        s for s in suppliers_with_debt
        if s.last_purchase_at and (now - s.last_purchase_at).days > s.credit_days
    ]
    total_overdue = sum(s.current_balance for s in overdue) or Decimal("0")

    thirty_ago = now - timedelta(days=30)
    recent_payments = db.query(SupplierPayment).filter(
        SupplierPayment.business_id == business_id,
        SupplierPayment.created_at >= thirty_ago,
    ).all()
    paid_last_30 = sum(p.amount for p in recent_payments) or Decimal("0")

    return SupplierPortfolioSummary(
        total_suppliers_with_debt=len(suppliers_with_debt),
        total_payable=total_payable,
        total_overdue=total_overdue,
        paid_last_30_days=paid_last_30,
    )


@router.get("/{supplier_id}", response_model=SupplierResponse)
def get_supplier(
    business_id: int,
    supplier_id: int,
    result=Depends(verify_business_access),
    db: Session = Depends(get_db),
):
    return get_supplier_or_404(supplier_id, business_id, db)


@router.patch("/{supplier_id}", response_model=SupplierResponse)
def update_supplier(
    business_id: int,
    supplier_id: int,
    data: SupplierUpdate,
    result=Depends(verify_business_access),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    supplier = get_supplier_or_404(supplier_id, business_id, db)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(supplier, field, value)
    db.commit()
    db.refresh(supplier)
    log_action(db, current_user.id, "UPDATE", "Supplier", supplier.id, business_id=business_id)
    return supplier


@router.delete("/{supplier_id}", status_code=204)
def delete_supplier(
    business_id: int,
    supplier_id: int,
    result=Depends(verify_business_access),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    supplier = get_supplier_or_404(supplier_id, business_id, db)
    if supplier.current_balance > 0:
        raise HTTPException(
            400,
            f"El proveedor tiene una deuda pendiente de ${supplier.current_balance}. Sáldala antes de eliminar."
        )
    supplier.is_active = False
    db.commit()
    log_action(db, current_user.id, "DELETE", "Supplier", supplier.id, business_id=business_id)


# ── Estadísticas ──────────────────────────────────────────────────────────────

@router.get("/{supplier_id}/stats", response_model=SupplierStats)
def get_supplier_stats(
    business_id: int,
    supplier_id: int,
    result=Depends(verify_business_access),
    db: Session = Depends(get_db),
):
    supplier = get_supplier_or_404(supplier_id, business_id, db)
    purchases = db.query(SupplierPurchase).filter(
        SupplierPurchase.supplier_id == supplier_id,
        SupplierPurchase.status != PurchaseStatus.CANCELLED,
    ).all()

    total_purchases = len(purchases)
    total_spent = sum(p.total for p in purchases) or Decimal("0")
    average_purchase = total_spent / total_purchases if total_purchases else Decimal("0")

    payments = db.query(SupplierPayment).filter(
        SupplierPayment.supplier_id == supplier_id,
    ).all()
    total_paid = sum(p.amount for p in payments) or Decimal("0")

    days_since_last = None
    if supplier.last_purchase_at:
        days_since_last = (datetime.utcnow() - supplier.last_purchase_at).days

    return SupplierStats(
        total_purchases=total_purchases,
        total_spent=total_spent,
        average_purchase=average_purchase,
        current_balance=supplier.current_balance,
        total_paid=total_paid,
        days_since_last_purchase=days_since_last,
    )


# ── Productos del proveedor ───────────────────────────────────────────────────

@router.post("/{supplier_id}/products", response_model=SupplierProductResponse, status_code=201)
def add_supplier_product(
    business_id: int,
    supplier_id: int,
    data: SupplierProductCreate,
    result=Depends(verify_business_access),
    db: Session = Depends(get_db),
):
    get_supplier_or_404(supplier_id, business_id, db)

    existing = db.query(SupplierProduct).filter(
        SupplierProduct.supplier_id == supplier_id,
        SupplierProduct.presentation_id == data.presentation_id,
        SupplierProduct.is_active == True,
    ).first()
    if existing:
        raise HTTPException(400, "Este producto ya está asociado al proveedor")

    sp = SupplierProduct(supplier_id=supplier_id, **data.model_dump())
    db.add(sp)
    db.commit()
    db.refresh(sp)
    return _build_supplier_product_response(sp)


@router.get("/{supplier_id}/products", response_model=List[SupplierProductResponse])
def list_supplier_products(
    business_id: int,
    supplier_id: int,
    result=Depends(verify_business_access),
    db: Session = Depends(get_db),
):
    get_supplier_or_404(supplier_id, business_id, db)
    products = db.query(SupplierProduct).options(
        joinedload(SupplierProduct.presentation).joinedload(ProductPresentation.product)
    ).filter(
        SupplierProduct.supplier_id == supplier_id,
        SupplierProduct.is_active == True,
    ).all()
    return [_build_supplier_product_response(p) for p in products]


@router.delete("/{supplier_id}/products/{product_id}", status_code=204)
def remove_supplier_product(
    business_id: int,
    supplier_id: int,
    product_id: int,
    result=Depends(verify_business_access),
    db: Session = Depends(get_db),
):
    sp = db.query(SupplierProduct).filter(
        SupplierProduct.id == product_id,
        SupplierProduct.supplier_id == supplier_id,
    ).first()
    if not sp:
        raise HTTPException(404, "Producto no encontrado")
    sp.is_active = False
    db.commit()


def _build_supplier_product_response(sp: SupplierProduct) -> SupplierProductResponse:
    pres = sp.presentation
    return SupplierProductResponse(
        id=sp.id,
        supplier_id=sp.supplier_id,
        presentation_id=sp.presentation_id,
        product_name=pres.product.name if pres and pres.product else None,
        presentation_name=pres.name if pres else None,
        cost_price=sp.cost_price,
        is_active=sp.is_active,
    )


# ── Compras ───────────────────────────────────────────────────────────────────

@router.post("/{supplier_id}/purchases", response_model=PurchaseResponse, status_code=201)
def create_purchase(
    business_id: int,
    supplier_id: int,
    data: PurchaseCreate,
    result=Depends(verify_business_access),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    supplier = get_supplier_or_404(supplier_id, business_id, db)

    if not data.items:
        raise HTTPException(400, "La compra debe tener al menos un producto")

    # Calcular totales
    subtotal = sum(i.quantity * i.cost_per_unit for i in data.items)
    total = subtotal - data.discount
    amount_credit = total - data.amount_paid
    if amount_credit < 0:
        amount_credit = Decimal("0")

    # Verificar límite de crédito con proveedor
    if amount_credit > 0 and supplier.credit_limit > 0:
        new_balance = supplier.current_balance + amount_credit
        if new_balance > supplier.credit_limit:
            raise HTTPException(
                400,
                f"Supera el límite de crédito con el proveedor. "
                f"Disponible: ${supplier.credit_limit - supplier.current_balance}"
            )

    # Determinar estado de pago
    if amount_credit <= 0:
        payment_status = SupplierPaymentStatus.PAID
    else:
        payment_status = SupplierPaymentStatus.PENDING

    # Crear compra
    purchase = SupplierPurchase(
        supplier_id=supplier_id,
        business_id=business_id,
        warehouse_id=data.warehouse_id,
        created_by=current_user.id,
        subtotal=subtotal,
        discount=data.discount,
        total=total,
        amount_paid=data.amount_paid,
        amount_credit=amount_credit,
        payment_status=payment_status,
        status=PurchaseStatus.COMPLETED,
        notes=data.notes,
        expected_payment_date=data.expected_payment_date,
    )
    db.add(purchase)
    db.flush()

    # Crear items + actualizar inventario
    for item in data.items:
        item_subtotal = item.quantity * item.cost_per_unit

        db.add(SupplierPurchaseItem(
            purchase_id=purchase.id,
            presentation_id=item.presentation_id,
            quantity=item.quantity,
            cost_per_unit=item.cost_per_unit,
            subtotal=item_subtotal,
            lot_number=item.lot_number,
            expiry_date=item.expiry_date,
        ))

        # Crear lote en inventario
        lot = ProductLot(
            presentation_id=item.presentation_id,
            warehouse_id=data.warehouse_id,
            business_id=business_id,
            lot_number=item.lot_number,
            quantity=item.quantity,
            remaining=item.quantity,
            cost_per_unit=item.cost_per_unit,
            arrival_date=datetime.utcnow(),
            expiry_date=item.expiry_date,
        )
        db.add(lot)
        db.flush()

        # Actualizar stock
        stock = get_or_create_stock(item.presentation_id, data.warehouse_id, db)
        stock.quantity += item.quantity

        # Movimiento de inventario
        db.add(InventoryMovement(
            business_id=business_id,
            presentation_id=item.presentation_id,
            warehouse_id=data.warehouse_id,
            lot_id=lot.id,
            movement_type=MovementType.ENTRY,
            quantity=item.quantity,
            cost_per_unit=item.cost_per_unit,
            reference_id=purchase.id,
            reference_type="supplier_purchase",
            created_by=current_user.id,
        ))

    # Actualizar deuda con proveedor
    if amount_credit > 0:
        supplier.current_balance += amount_credit

    supplier.last_purchase_at = datetime.utcnow()

    db.commit()
    log_action(
        db, current_user.id, "PURCHASE", "Supplier", supplier_id,
        business_id=business_id,
        details={"total": str(total), "purchase_id": purchase.id},
    )

    purchase = db.query(SupplierPurchase).options(
        joinedload(SupplierPurchase.items)
            .joinedload(SupplierPurchaseItem.presentation)
            .joinedload(ProductPresentation.product)
    ).filter(SupplierPurchase.id == purchase.id).first()

    return build_purchase_response(purchase)


@router.get("/{supplier_id}/purchases", response_model=List[PurchaseResponse])
def list_purchases(
    business_id: int,
    supplier_id: int,
    result=Depends(verify_business_access),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 50,
):
    get_supplier_or_404(supplier_id, business_id, db)
    purchases = db.query(SupplierPurchase).options(
        joinedload(SupplierPurchase.items)
            .joinedload(SupplierPurchaseItem.presentation)
            .joinedload(ProductPresentation.product)
    ).filter(
        SupplierPurchase.supplier_id == supplier_id,
    ).order_by(desc(SupplierPurchase.created_at)).offset(skip).limit(limit).all()

    return [build_purchase_response(p) for p in purchases]


# ── Pagos a proveedor ─────────────────────────────────────────────────────────

@router.post("/{supplier_id}/payments", response_model=SupplierPaymentResponse, status_code=201)
def add_supplier_payment(
    business_id: int,
    supplier_id: int,
    data: SupplierPaymentCreate,
    result=Depends(verify_business_access),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    supplier = get_supplier_or_404(supplier_id, business_id, db)

    if data.amount > supplier.current_balance:
        raise HTTPException(
            400,
            f"El pago supera la deuda actual de ${supplier.current_balance}"
        )

    supplier.current_balance -= data.amount

    payment = SupplierPayment(
        supplier_id=supplier_id,
        purchase_id=data.purchase_id,
        business_id=business_id,
        created_by=current_user.id,
        amount=data.amount,
        description=data.description,
    )
    db.add(payment)

    # Actualizar estado de la compra si aplica
    if data.purchase_id:
        purchase = db.query(SupplierPurchase).filter(
            SupplierPurchase.id == data.purchase_id
        ).first()
        if purchase and purchase.amount_credit > 0:
            purchase.amount_paid += data.amount
            purchase.amount_credit -= data.amount
            if purchase.amount_credit <= 0:
                purchase.amount_credit = Decimal("0")
                purchase.payment_status = SupplierPaymentStatus.PAID

    db.commit()
    db.refresh(payment)
    log_action(
        db, current_user.id, "PAYMENT", "Supplier", supplier_id,
        business_id=business_id,
        details={"amount": str(data.amount)},
    )
    return payment


@router.get("/{supplier_id}/payments", response_model=List[SupplierPaymentResponse])
def list_supplier_payments(
    business_id: int,
    supplier_id: int,
    result=Depends(verify_business_access),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 50,
):
    get_supplier_or_404(supplier_id, business_id, db)
    return db.query(SupplierPayment).filter(
        SupplierPayment.supplier_id == supplier_id,
    ).order_by(desc(SupplierPayment.created_at)).offset(skip).limit(limit).all()