from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional
from datetime import datetime, timedelta
from decimal import Decimal

from app.database import get_db
from app.models.client import Client, ClientPurchase, CreditMovement
from app.models.enums import ClientStatus
from app.models.user import User
from app.schemas.client import (
    ClientCreate, ClientUpdate, ClientResponse,
    CreditMovementCreate, CreditMovementResponse,
    ClientPurchaseResponse, ClientStats, PortfolioSummary, PortfolioMovement,
)
from app.api.deps import get_current_active_user, verify_business_access
from app.utils.audit import log_action

router = APIRouter(prefix="/businesses/{business_id}/clients", tags=["Clientes"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def get_client_or_404(client_id: int, business_id: int, db: Session) -> Client:
    client = db.query(Client).filter(
        Client.id == client_id,
        Client.business_id == business_id,
        Client.is_active == True
    ).first()
    if not client:
        raise HTTPException(404, "Cliente no encontrado")
    return client


def update_client_status(client: Client, db: Session):
    """Actualiza el estado del cliente según su deuda y actividad."""
    now = datetime.utcnow()

    if client.current_balance > 0 and client.last_purchase_at:
        days_overdue = (now - client.last_purchase_at).days
        if days_overdue > client.credit_days:
            client.status = ClientStatus.MOROSO
            return

    if client.last_purchase_at:
        days_inactive = (now - client.last_purchase_at).days
        if days_inactive > 30:
            client.status = ClientStatus.INACTIVE
            return

    if client.status not in [ClientStatus.BLOCKED]:
        client.status = ClientStatus.ACTIVE


# ── CRUD ──────────────────────────────────────────────────────────────────────

@router.post("", response_model=ClientResponse, status_code=201)
def create_client(
    business_id: int,
    data: ClientCreate,
    result=Depends(verify_business_access),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    client = Client(business_id=business_id, **data.model_dump())
    db.add(client)
    db.commit()
    db.refresh(client)
    log_action(db, current_user.id, "CREATE", "Client", client.id, business_id=business_id)
    return client


@router.get("", response_model=List[ClientResponse])
def list_clients(
    business_id: int,
    result=Depends(verify_business_access),
    db: Session = Depends(get_db),
    search: Optional[str] = Query(None),
    status: Optional[ClientStatus] = Query(None),
    has_debt: Optional[bool] = Query(None),
    skip: int = 0,
    limit: int = 50,
):
    query = db.query(Client).filter(
        Client.business_id == business_id,
        Client.is_active == True
    )

    if search:
        query = query.filter(
            Client.name.ilike(f"%{search}%") |
            Client.phone.ilike(f"%{search}%") |
            Client.document_id.ilike(f"%{search}%")
        )
    if status:
        query = query.filter(Client.status == status)
    if has_debt is True:
        query = query.filter(Client.current_balance > 0)
    if has_debt is False:
        query = query.filter(Client.current_balance <= 0)

    return query.order_by(desc(Client.last_purchase_at)).offset(skip).limit(limit).all()


@router.get("/{client_id}", response_model=ClientResponse)
def get_client(
    business_id: int,
    client_id: int,
    result=Depends(verify_business_access),
    db: Session = Depends(get_db)
):
    return get_client_or_404(client_id, business_id, db)


@router.patch("/{client_id}", response_model=ClientResponse)
def update_client(
    business_id: int,
    client_id: int,
    data: ClientUpdate,
    result=Depends(verify_business_access),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    client = get_client_or_404(client_id, business_id, db)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(client, field, value)
    db.commit()
    db.refresh(client)
    log_action(db, current_user.id, "UPDATE", "Client", client.id, business_id=business_id)
    return client


@router.delete("/{client_id}", status_code=204)
def delete_client(
    business_id: int,
    client_id: int,
    result=Depends(verify_business_access),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    client = get_client_or_404(client_id, business_id, db)
    if client.current_balance > 0:
        raise HTTPException(400, f"El cliente tiene una deuda de ${client.current_balance}. Salda la deuda antes de eliminar.")
    client.is_active = False
    db.commit()
    log_action(db, current_user.id, "DELETE", "Client", client.id, business_id=business_id)


# ── Estadísticas ──────────────────────────────────────────────────────────────

@router.get("/{client_id}/stats", response_model=ClientStats)
def get_client_stats(
    business_id: int,
    client_id: int,
    result=Depends(verify_business_access),
    db: Session = Depends(get_db)
):
    client = get_client_or_404(client_id, business_id, db)

    purchases = db.query(ClientPurchase).filter(
        ClientPurchase.client_id == client_id
    ).all()

    total_purchases = len(purchases)
    total_spent = sum(p.total for p in purchases) if purchases else Decimal("0")
    average_ticket = total_spent / total_purchases if total_purchases else Decimal("0")
    credit_purchases = sum(1 for p in purchases if p.is_credit)

    # Método de pago más usado
    most_bought_payment_method: Optional[str] = None
    if purchases:
        payment_counts: dict[str, int] = {}
        for p in purchases:
            if p.payment_method:
                payment_counts[p.payment_method] = payment_counts.get(p.payment_method, 0) + 1
        if payment_counts:
            most_bought_payment_method = max(payment_counts, key=payment_counts.get)

    # Días desde la última compra
    days_since_last = None
    if client.last_purchase_at:
        days_since_last = (datetime.utcnow() - client.last_purchase_at).days

    available_credit = max(Decimal("0"), client.credit_limit - client.current_balance)

    return ClientStats(
        total_purchases=total_purchases,
        total_spent=total_spent,
        average_ticket=average_ticket,
        credit_purchases=credit_purchases,
        current_balance=client.current_balance,
        credit_limit=client.credit_limit,
        available_credit=available_credit,
        days_since_last_purchase=days_since_last,
        most_bought_payment_method=most_bought_payment_method,
    )


# ── Historial de compras ──────────────────────────────────────────────────────

@router.get("/{client_id}/purchases", response_model=List[ClientPurchaseResponse])
def get_client_purchases(
    business_id: int,
    client_id: int,
    result=Depends(verify_business_access),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 50,
):
    get_client_or_404(client_id, business_id, db)
    return db.query(ClientPurchase).filter(
        ClientPurchase.client_id == client_id
    ).order_by(desc(ClientPurchase.created_at)).offset(skip).limit(limit).all()


# ── Cartera / Crédito ─────────────────────────────────────────────────────────

@router.post("/{client_id}/credit", response_model=CreditMovementResponse, status_code=201)
def add_credit_movement(
    business_id: int,
    client_id: int,
    data: CreditMovementCreate,
    result=Depends(verify_business_access),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    client = get_client_or_404(client_id, business_id, db)

    if data.movement_type == "charge":
        # Verificar límite de crédito
        if client.credit_limit > 0:
            if client.current_balance + data.amount > client.credit_limit:
                raise HTTPException(
                    400,
                    f"Supera el límite de crédito. Disponible: ${client.credit_limit - client.current_balance}"
                )
        client.current_balance += data.amount

    elif data.movement_type == "payment":
        if data.amount > client.current_balance:
            raise HTTPException(400, f"El abono supera la deuda actual de ${client.current_balance}")
        client.current_balance -= data.amount
    else:
        raise HTTPException(400, "movement_type debe ser 'charge' o 'payment'")

    movement = CreditMovement(
        client_id=client_id,
        business_id=business_id,
        amount=data.amount,
        movement_type=data.movement_type,
        description=data.description,
        created_by=current_user.id,
    )
    db.add(movement)

    update_client_status(client, db)
    db.commit()
    db.refresh(movement)

    log_action(db, current_user.id, data.movement_type.upper(), "CreditMovement",
               movement.id, business_id=business_id,
               details={"client_id": client_id, "amount": str(data.amount)})
    return movement


@router.get("/{client_id}/credit", response_model=List[CreditMovementResponse])
def get_credit_movements(
    business_id: int,
    client_id: int,
    result=Depends(verify_business_access),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 50,
):
    get_client_or_404(client_id, business_id, db)
    return db.query(CreditMovement).filter(
        CreditMovement.client_id == client_id
    ).order_by(desc(CreditMovement.created_at)).offset(skip).limit(limit).all()


# ── Utilidad: recalcular estados de todos los clientes del negocio ────────────

@router.post("/refresh-statuses", status_code=200)
def refresh_all_statuses(
    business_id: int,
    result=Depends(verify_business_access),
    db: Session = Depends(get_db)
):
    """Útil para correr periódicamente (cron) y actualizar estados masivamente."""
    clients = db.query(Client).filter(
        Client.business_id == business_id,
        Client.is_active == True
    ).all()
    for client in clients:
        update_client_status(client, db)
    db.commit()
    return {"updated": len(clients)}


# ── Reportes de cartera ─────────────────────────────────────────────────────────

@router.get("/portfolio/summary", response_model=PortfolioSummary)
def get_portfolio_summary(
    business_id: int,
    result=Depends(verify_business_access),
    db: Session = Depends(get_db),
):
    """Resumen global de cartera del negocio."""
    clients_with_debt = db.query(Client).filter(
        Client.business_id == business_id,
        Client.is_active == True,
        Client.current_balance > 0,
    ).all()

    total_portfolio = sum(c.current_balance for c in clients_with_debt) or Decimal("0")
    morosos = [c for c in clients_with_debt if c.status == ClientStatus.MOROSO]
    total_overdue = sum(c.current_balance for c in morosos) or Decimal("0")

    # Proyección: movimientos de crédito de los últimos 30 días
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    recent_payments = db.query(CreditMovement).filter(
        CreditMovement.business_id == business_id,
        CreditMovement.movement_type == "payment",
        CreditMovement.created_at >= thirty_days_ago,
    ).all()
    collected_last_30 = sum(m.amount for m in recent_payments) or Decimal("0")

    return PortfolioSummary(
        total_clients_with_debt=len(clients_with_debt),
        total_portfolio=total_portfolio,
        total_overdue=total_overdue,
        morosos_count=len(morosos),
        collected_last_30_days=collected_last_30,
    )


@router.get("/portfolio/movements", response_model=List[PortfolioMovement])
def get_portfolio_movements(
    business_id: int,
    result=Depends(verify_business_access),
    db: Session = Depends(get_db),
    movement_type: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 100,
):
    """Historial global de movimientos de cartera."""
    query = db.query(CreditMovement).filter(
        CreditMovement.business_id == business_id,
    )
    if movement_type:
        query = query.filter(CreditMovement.movement_type == movement_type)

    movements = query.order_by(desc(CreditMovement.created_at)).offset(skip).limit(limit).all()

    result_list = []
    for m in movements:
        client = db.query(Client).filter(Client.id == m.client_id).first()
        result_list.append(PortfolioMovement(
            id=m.id,
            client_id=m.client_id,
            client_name=client.name if client else None,
            amount=m.amount,
            movement_type=m.movement_type,
            description=m.description,
            created_at=m.created_at,
        ))
    return result_list