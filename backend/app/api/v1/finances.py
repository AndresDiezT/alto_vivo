from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, and_
from typing import List, Optional
from datetime import datetime, date, timedelta
from decimal import Decimal

from app.database import get_db
from app.models.finance import (
    CashRegister, CashSession, CashMovement,
    SessionPaymentBreakdown,
)
from app.models.sale import Sale, SalePayment, PaymentMethod
from app.models.enums import SaleStatus, CashRegisterStatus, CashMovementType
from app.models.user import User
from app.schemas.finance import (
    CashRegisterCreate, CashRegisterUpdate, CashRegisterResponse,
    OpenSessionRequest, CloseSessionRequest,
    CashMovementCreate, CashMovementResponse,
    CashSessionResponse, PaymentBreakdownResponse,
    FinanceSummary,
)
from app.api.deps import get_current_active_user, verify_business_access
from app.utils.audit import log_action

router = APIRouter(prefix="/businesses/{business_id}/finance", tags=["Finanzas"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def get_register_or_404(register_id: int, business_id: int, db: Session) -> CashRegister:
    register = db.query(CashRegister).filter(
        CashRegister.id == register_id,
        CashRegister.business_id == business_id,
        CashRegister.is_active == True,
    ).first()
    if not register:
        raise HTTPException(404, "Caja no encontrada")
    return register


def get_open_session(register_id: int, db: Session) -> Optional[CashSession]:
    return db.query(CashSession).filter(
        CashSession.register_id == register_id,
        CashSession.status == CashRegisterStatus.OPEN,
    ).first()


def build_session_response(session: CashSession, db: Session) -> CashSessionResponse:
    opener = db.query(User).filter(User.id == session.opened_by).first()
    closer = db.query(User).filter(User.id == session.closed_by).first() if session.closed_by else None

    movements = [
        CashMovementResponse(
            id=m.id, session_id=m.session_id,
            movement_type=m.movement_type, amount=m.amount,
            description=m.description, created_at=m.created_at,
        )
        for m in session.movements
    ]

    breakdown = [
        PaymentBreakdownResponse(
            payment_method_id=b.payment_method_id,
            payment_method_name=b.payment_method_name,
            total=b.total,
            is_credit=b.is_credit,
        )
        for b in session.payment_breakdown
    ]

    return CashSessionResponse(
        id=session.id,
        register_id=session.register_id,
        business_id=session.business_id,
        status=session.status,
        opening_amount=session.opening_amount,
        opened_at=session.opened_at,
        opening_notes=session.opening_notes,
        opened_by_name=opener.full_name or opener.username if opener else None,
        closing_amount=session.closing_amount,
        expected_amount=session.expected_amount,
        difference=session.difference,
        closed_at=session.closed_at,
        closing_notes=session.closing_notes,
        closed_by_name=closer.full_name or closer.username if closer else None,
        total_sales=session.total_sales,
        total_income=session.total_income,
        total_expense=session.total_expense,
        total_credit=session.total_credit,
        payment_breakdown=breakdown,
        movements=movements,
    )


def build_register_response(register: CashRegister, db: Session) -> CashRegisterResponse:
    open_session = get_open_session(register.id, db)
    opener = None
    if open_session:
        opener = db.query(User).filter(User.id == open_session.opened_by).first()

    return CashRegisterResponse(
        id=register.id,
        business_id=register.business_id,
        warehouse_id=register.warehouse_id,
        name=register.name,
        is_active=register.is_active,
        created_at=register.created_at,
        open_session_id=open_session.id if open_session else None,
        opened_at=open_session.opened_at if open_session else None,
        opened_by_name=opener.full_name or opener.username if opener else None,
        opening_amount=open_session.opening_amount if open_session else None,
    )


# ── Cajas ─────────────────────────────────────────────────────────────────────

@router.get("/registers", response_model=List[CashRegisterResponse])
def list_registers(
    business_id: int,
    result=Depends(verify_business_access),
    db: Session = Depends(get_db),
):
    registers = db.query(CashRegister).filter(
        CashRegister.business_id == business_id,
        CashRegister.is_active == True,
    ).all()
    return [build_register_response(r, db) for r in registers]


@router.post("/registers", response_model=CashRegisterResponse, status_code=201)
def create_register(
    business_id: int,
    data: CashRegisterCreate,
    result=Depends(verify_business_access),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    register = CashRegister(business_id=business_id, **data.model_dump())
    db.add(register)
    db.commit()
    db.refresh(register)
    return build_register_response(register, db)


@router.patch("/registers/{register_id}", response_model=CashRegisterResponse)
def update_register(
    business_id: int,
    register_id: int,
    data: CashRegisterUpdate,
    result=Depends(verify_business_access),
    db: Session = Depends(get_db),
):
    register = get_register_or_404(register_id, business_id, db)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(register, field, value)
    db.commit()
    db.refresh(register)
    return build_register_response(register, db)


@router.delete("/registers/{register_id}", status_code=204)
def delete_register(
    business_id: int,
    register_id: int,
    result=Depends(verify_business_access),
    db: Session = Depends(get_db),
):
    register = get_register_or_404(register_id, business_id, db)
    open_session = get_open_session(register_id, db)
    if open_session:
        raise HTTPException(400, "No puedes eliminar una caja con sesión abierta")
    register.is_active = False
    db.commit()


# ── Sesiones ──────────────────────────────────────────────────────────────────

@router.post("/registers/{register_id}/open", response_model=CashSessionResponse, status_code=201)
def open_session(
    business_id: int,
    register_id: int,
    data: OpenSessionRequest,
    result=Depends(verify_business_access),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    register = get_register_or_404(register_id, business_id, db)

    # Solo una sesión abierta por caja
    existing = get_open_session(register_id, db)
    if existing:
        raise HTTPException(400, "Esta caja ya tiene una sesión abierta")

    session = CashSession(
        register_id=register_id,
        business_id=business_id,
        opened_by=current_user.id,
        opening_amount=data.opening_amount,
        opening_notes=data.opening_notes,
        status=CashRegisterStatus.OPEN,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    log_action(db, current_user.id, "OPEN", "CashSession", session.id,
               business_id=business_id,
               details={"opening_amount": str(data.opening_amount)})

    return build_session_response(session, db)


@router.post("/registers/{register_id}/close", response_model=CashSessionResponse)
def close_session(
    business_id: int,
    register_id: int,
    data: CloseSessionRequest,
    result=Depends(verify_business_access),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    register = get_register_or_404(register_id, business_id, db)
    session = get_open_session(register_id, db)
    if not session:
        raise HTTPException(400, "Esta caja no tiene una sesión abierta")

    # 1. Consolidar ventas del período de la sesión desde sales
    sales = db.query(Sale).options(
        joinedload(Sale.payments).joinedload(SalePayment.payment_method)
    ).filter(
        Sale.business_id == business_id,
        Sale.created_at >= session.opened_at,
        Sale.created_at <= datetime.utcnow(),
        Sale.status == SaleStatus.COMPLETED,
    ).all()

    total_sales = sum(s.total for s in sales) or Decimal("0")
    total_credit = sum(s.amount_credit for s in sales) or Decimal("0")

    # 2. Desglose por método de pago
    by_method: dict[int, dict] = {}
    for sale in sales:
        for p in sale.payments:
            mid = p.payment_method_id
            if mid not in by_method:
                by_method[mid] = {
                    "payment_method_id": mid,
                    "payment_method_name": p.payment_method.name if p.payment_method else str(mid),
                    "total": Decimal("0"),
                    "is_credit": p.is_credit,
                }
            by_method[mid]["total"] += p.amount

    for row in by_method.values():
        db.add(SessionPaymentBreakdown(
            session_id=session.id,
            payment_method_id=row["payment_method_id"],
            payment_method_name=row["payment_method_name"],
            total=row["total"],
            is_credit=row["is_credit"],
        ))

    # 3. Movimientos manuales
    total_income = sum(
        m.amount for m in session.movements
        if m.movement_type == CashMovementType.INCOME
    ) or Decimal("0")
    total_expense = sum(
        m.amount for m in session.movements
        if m.movement_type == CashMovementType.EXPENSE
    ) or Decimal("0")

    # 4. Calcular monto esperado
    # Efectivo esperado = apertura + ventas efectivo + ingresos manuales - gastos
    cash_from_sales = by_method.get(
        _get_default_cash_method_id(business_id, db), {}
    ).get("total", Decimal("0"))

    expected_amount = (
        session.opening_amount
        + cash_from_sales
        + total_income
        - total_expense
    )

    difference = data.closing_amount - expected_amount

    # 5. Cerrar sesión
    session.status = CashRegisterStatus.CLOSED
    session.closed_by = current_user.id
    session.closed_at = datetime.utcnow()
    session.closing_amount = data.closing_amount
    session.closing_notes = data.closing_notes
    session.expected_amount = expected_amount
    session.difference = difference
    session.total_sales = total_sales
    session.total_income = total_income
    session.total_expense = total_expense
    session.total_credit = total_credit

    db.commit()
    db.refresh(session)

    log_action(db, current_user.id, "CLOSE", "CashSession", session.id,
               business_id=business_id,
               details={
                   "closing_amount": str(data.closing_amount),
                   "expected_amount": str(expected_amount),
                   "difference": str(difference),
               })

    return build_session_response(session, db)


def _get_default_cash_method_id(business_id: int, db: Session) -> int:
    """Obtiene el ID del método de pago en efectivo (is_default=True, is_credit=False)."""
    method = db.query(PaymentMethod).filter(
        PaymentMethod.business_id == business_id,
        PaymentMethod.is_default == True,
        PaymentMethod.is_credit == False,
    ).first()
    return method.id if method else -1


@router.get("/registers/{register_id}/session", response_model=CashSessionResponse)
def get_current_session(
    business_id: int,
    register_id: int,
    result=Depends(verify_business_access),
    db: Session = Depends(get_db),
):
    get_register_or_404(register_id, business_id, db)
    session = get_open_session(register_id, db)
    if not session:
        raise HTTPException(404, "No hay sesión abierta en esta caja")

    session = db.query(CashSession).options(
        joinedload(CashSession.movements),
        joinedload(CashSession.payment_breakdown),
    ).filter(CashSession.id == session.id).first()

    return build_session_response(session, db)


# ── Historial de sesiones ─────────────────────────────────────────────────────

@router.get("/registers/{register_id}/sessions", response_model=List[CashSessionResponse])
def list_sessions(
    business_id: int,
    register_id: int,
    result=Depends(verify_business_access),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 30,
):
    get_register_or_404(register_id, business_id, db)
    sessions = db.query(CashSession).options(
        joinedload(CashSession.movements),
        joinedload(CashSession.payment_breakdown),
    ).filter(
        CashSession.register_id == register_id,
    ).order_by(desc(CashSession.opened_at)).offset(skip).limit(limit).all()

    return [build_session_response(s, db) for s in sessions]


# ── Movimientos manuales ──────────────────────────────────────────────────────

@router.post("/registers/{register_id}/movements", response_model=CashMovementResponse, status_code=201)
def add_movement(
    business_id: int,
    register_id: int,
    data: CashMovementCreate,
    result=Depends(verify_business_access),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    get_register_or_404(register_id, business_id, db)
    session = get_open_session(register_id, db)
    if not session:
        raise HTTPException(400, "No hay sesión abierta en esta caja. Abre la caja primero.")

    movement = CashMovement(
        session_id=session.id,
        business_id=business_id,
        created_by=current_user.id,
        movement_type=data.movement_type,
        amount=data.amount,
        description=data.description,
    )
    db.add(movement)
    db.commit()
    db.refresh(movement)
    return movement


# ── Resumen general ───────────────────────────────────────────────────────────

@router.get("/summary", response_model=FinanceSummary)
def get_finance_summary(
    business_id: int,
    result=Depends(verify_business_access),
    db: Session = Depends(get_db),
):
    today_start = datetime.combine(date.today(), datetime.min.time())
    today_end = datetime.combine(date.today(), datetime.max.time())

    # Sesiones abiertas
    open_sessions = db.query(CashSession).filter(
        CashSession.business_id == business_id,
        CashSession.status == CashRegisterStatus.OPEN,
    ).count()

    open_registers = db.query(CashRegister).filter(
        CashRegister.business_id == business_id,
        CashRegister.is_active == True,
    ).count()

    # Ventas de hoy
    today_sales = db.query(Sale).filter(
        Sale.business_id == business_id,
        Sale.created_at >= today_start,
        Sale.created_at <= today_end,
        Sale.status == SaleStatus.COMPLETED,
    ).all()

    today_revenue = sum(s.total for s in today_sales) or Decimal("0")
    today_credit = sum(s.amount_credit for s in today_sales) or Decimal("0")

    # Gastos manuales de hoy
    today_movements = db.query(CashMovement).filter(
        CashMovement.business_id == business_id,
        CashMovement.created_at >= today_start,
        CashMovement.created_at <= today_end,
        CashMovement.movement_type == CashMovementType.EXPENSE,
    ).all()
    today_expenses = sum(m.amount for m in today_movements) or Decimal("0")
    today_net = today_revenue - today_credit - today_expenses

    return FinanceSummary(
        open_sessions=open_sessions,
        total_open_registers=open_registers,
        today_revenue=today_revenue,
        today_expenses=today_expenses,
        today_credit=today_credit,
        today_net=today_net,
    )