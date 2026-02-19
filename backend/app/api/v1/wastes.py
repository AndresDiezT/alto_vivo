from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
from typing import List, Optional
from datetime import datetime, date
from decimal import Decimal

from app.database import get_db
from app.models.waste import WasteRecord
from app.models.enums import WasteCause
from app.models.inventory import (
    ProductPresentation, ProductStock,
    ProductLot, InventoryMovement, MovementType,
)
from app.models.user import User
from app.schemas.waste import (
    WasteCreate, WasteResponse, WasteSummary,
    WasteByCause, AutoWasteResult,
)
from app.api.deps import get_current_active_user, verify_business_access
from app.utils.audit import log_action

router = APIRouter(prefix="/businesses/{business_id}/waste", tags=["Mermas"])


# ── Helpers ───────────────────────────────────────────────────────────────────

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


def build_waste_response(record: WasteRecord, db: Session) -> WasteResponse:
    pres = db.query(ProductPresentation).options(
        joinedload(ProductPresentation.product)
    ).filter(ProductPresentation.id == record.presentation_id).first()

    from app.models.inventory import Warehouse
    warehouse = db.query(Warehouse).filter(
        Warehouse.id == record.warehouse_id
    ).first()

    lot = db.query(ProductLot).filter(
        ProductLot.id == record.lot_id
    ).first() if record.lot_id else None

    creator = db.query(User).filter(User.id == record.created_by).first()

    return WasteResponse(
        id=record.id,
        business_id=record.business_id,
        presentation_id=record.presentation_id,
        warehouse_id=record.warehouse_id,
        lot_id=record.lot_id,
        created_by=record.created_by,
        cause=record.cause,
        quantity=record.quantity,
        cost_per_unit=record.cost_per_unit,
        total_cost=record.total_cost,
        notes=record.notes,
        is_auto=record.is_auto,
        created_at=record.created_at,
        product_name=pres.product.name if pres and pres.product else None,
        presentation_name=pres.name if pres else None,
        warehouse_name=warehouse.name if warehouse else None,
        lot_number=lot.lot_number if lot else None,
        creator_name=creator.full_name or creator.username if creator else None,
    )


def _create_waste_record(
    business_id: int,
    presentation_id: int,
    warehouse_id: int,
    quantity: Decimal,
    cause: WasteCause,
    created_by: int,
    db: Session,
    lot_id: Optional[int] = None,
    notes: Optional[str] = None,
    is_auto: bool = False,
) -> WasteRecord:
    """Core — crea el registro de merma y actualiza stock/lote/movimiento."""

    # Snapshot del costo desde el lote si existe, si no buscar último costo
    cost_per_unit = None
    if lot_id:
        lot = db.query(ProductLot).filter(ProductLot.id == lot_id).first()
        if lot:
            cost_per_unit = lot.cost_per_unit
    else:
        # Último lote con costo registrado para esta presentación y bodega
        last_lot = db.query(ProductLot).filter(
            ProductLot.presentation_id == presentation_id,
            ProductLot.warehouse_id == warehouse_id,
            ProductLot.cost_per_unit.isnot(None),
        ).order_by(desc(ProductLot.arrival_date)).first()
        if last_lot:
            cost_per_unit = last_lot.cost_per_unit

    total_cost = (quantity * cost_per_unit) if cost_per_unit else None

    record = WasteRecord(
        business_id=business_id,
        presentation_id=presentation_id,
        warehouse_id=warehouse_id,
        lot_id=lot_id,
        created_by=created_by,
        cause=cause,
        quantity=quantity,
        cost_per_unit=cost_per_unit,
        total_cost=total_cost,
        notes=notes,
        is_auto=is_auto,
    )
    db.add(record)
    db.flush()

    # Descontar stock
    stock = get_or_create_stock(presentation_id, warehouse_id, db)
    actual_deduct = min(quantity, stock.quantity)  # No bajar de 0
    stock.quantity -= actual_deduct

    # Descontar del lote si aplica
    if lot_id:
        lot = db.query(ProductLot).filter(ProductLot.id == lot_id).first()
        if lot:
            lot.remaining = max(Decimal("0"), lot.remaining - quantity)

    # Movimiento de inventario
    db.add(InventoryMovement(
        business_id=business_id,
        presentation_id=presentation_id,
        warehouse_id=warehouse_id,
        movement_type=MovementType.WASTE,
        quantity=-actual_deduct,
        cost_per_unit=cost_per_unit,
        reason=f"Merma: {cause.value}{' (auto)' if is_auto else ''}",
        reference_id=record.id,
        reference_type="waste",
        created_by=created_by,
    ))

    return record


# ── Registrar merma manual ─────────────────────────────────────────────────────

@router.post("", response_model=WasteResponse, status_code=201)
def create_waste(
    business_id: int,
    data: WasteCreate,
    result=Depends(verify_business_access),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    # Validar presentación
    pres = db.query(ProductPresentation).filter(
        ProductPresentation.id == data.presentation_id,
        ProductPresentation.is_active == True,
    ).first()
    if not pres:
        raise HTTPException(404, "Presentación no encontrada")

    # Validar stock disponible
    stock = get_or_create_stock(data.presentation_id, data.warehouse_id, db)
    if stock.quantity <= 0:
        raise HTTPException(400, "No hay stock disponible en esta bodega para registrar la merma")
    if data.quantity > stock.quantity:
        raise HTTPException(
            400,
            f"Cantidad de merma ({data.quantity}) supera el stock disponible ({stock.quantity})"
        )

    # Validar lote si se especifica
    if data.lot_id:
        lot = db.query(ProductLot).filter(
            ProductLot.id == data.lot_id,
            ProductLot.presentation_id == data.presentation_id,
        ).first()
        if not lot:
            raise HTTPException(404, "Lote no encontrado")

    record = _create_waste_record(
        business_id=business_id,
        presentation_id=data.presentation_id,
        warehouse_id=data.warehouse_id,
        quantity=data.quantity,
        cause=data.cause,
        created_by=current_user.id,
        db=db,
        lot_id=data.lot_id,
        notes=data.notes,
        is_auto=False,
    )

    db.commit()
    log_action(
        db, current_user.id, "CREATE", "WasteRecord", record.id,
        business_id=business_id,
        details={"cause": data.cause.value, "quantity": str(data.quantity)},
    )
    return build_waste_response(record, db)


# ── Merma automática por lotes vencidos ───────────────────────────────────────

@router.post("/auto-expired", response_model=AutoWasteResult)
def process_expired_lots(
    business_id: int,
    result=Depends(verify_business_access),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Detecta todos los lotes vencidos con remaining > 0 y genera
    mermas automáticas por cada uno. Útil para correr diariamente.
    """
    now = datetime.utcnow()

    expired_lots = db.query(ProductLot).filter(
        ProductLot.business_id == business_id,
        ProductLot.expiry_date <= now,
        ProductLot.remaining > 0,
        ProductLot.is_active == True,
    ).all()

    if not expired_lots:
        return AutoWasteResult(processed=0, total_cost=Decimal("0"), records=[])

    records = []
    total_cost = Decimal("0")

    for lot in expired_lots:
        record = _create_waste_record(
            business_id=business_id,
            presentation_id=lot.presentation_id,
            warehouse_id=lot.warehouse_id,
            quantity=lot.remaining,
            cause=WasteCause.EXPIRED,
            created_by=current_user.id,
            db=db,
            lot_id=lot.id,
            notes="Merma automática por vencimiento de lote",
            is_auto=True,
        )
        # Marcar lote como agotado
        lot.remaining = Decimal("0")
        lot.is_active = False

        if record.total_cost:
            total_cost += record.total_cost

        records.append(record)

    db.commit()
    log_action(
        db, current_user.id, "AUTO_WASTE", "WasteRecord", 0,
        business_id=business_id,
        details={"processed": len(records), "total_cost": str(total_cost)},
    )

    return AutoWasteResult(
        processed=len(records),
        total_cost=total_cost,
        records=[build_waste_response(r, db) for r in records],
    )


# ── Historial ─────────────────────────────────────────────────────────────────

@router.get("", response_model=List[WasteResponse])
def list_waste(
    business_id: int,
    result=Depends(verify_business_access),
    db: Session = Depends(get_db),
    presentation_id: Optional[int] = Query(None),
    warehouse_id: Optional[int] = Query(None),
    cause: Optional[WasteCause] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    is_auto: Optional[bool] = Query(None),
    skip: int = 0,
    limit: int = 50,
):
    query = db.query(WasteRecord).filter(
        WasteRecord.business_id == business_id
    )

    if presentation_id:
        query = query.filter(WasteRecord.presentation_id == presentation_id)
    if warehouse_id:
        query = query.filter(WasteRecord.warehouse_id == warehouse_id)
    if cause:
        query = query.filter(WasteRecord.cause == cause)
    if date_from:
        query = query.filter(WasteRecord.created_at >= datetime.combine(date_from, datetime.min.time()))
    if date_to:
        query = query.filter(WasteRecord.created_at <= datetime.combine(date_to, datetime.max.time()))
    if is_auto is not None:
        query = query.filter(WasteRecord.is_auto == is_auto)

    records = query.order_by(desc(WasteRecord.created_at)).offset(skip).limit(limit).all()
    return [build_waste_response(r, db) for r in records]


# ── Resumen ────────────────────────────────────────────────────────────────────

@router.get("/summary", response_model=WasteSummary)
def get_waste_summary(
    business_id: int,
    result=Depends(verify_business_access),
    db: Session = Depends(get_db),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
):
    query = db.query(WasteRecord).filter(WasteRecord.business_id == business_id)

    if date_from:
        query = query.filter(WasteRecord.created_at >= datetime.combine(date_from, datetime.min.time()))
    if date_to:
        query = query.filter(WasteRecord.created_at <= datetime.combine(date_to, datetime.max.time()))

    records = query.all()
    total_cost = sum(r.total_cost for r in records if r.total_cost) or Decimal("0")

    by_cause: dict[str, dict] = {}
    for r in records:
        key = r.cause.value
        if key not in by_cause:
            by_cause[key] = {"cause": r.cause, "count": 0, "total_cost": Decimal("0")}
        by_cause[key]["count"] += 1
        if r.total_cost:
            by_cause[key]["total_cost"] += r.total_cost

    return WasteSummary(
        total_records=len(records),
        total_cost=total_cost,
        by_cause=[WasteByCause(**v) for v in by_cause.values()],
    )