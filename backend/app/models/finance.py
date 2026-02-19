from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime,
    ForeignKey, Text, Numeric, Enum as SQLEnum
)
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base
from app.models.enums import CashRegisterStatus, CashMovementType

class CashRegister(Base):
    """Una caja por bodega. Puede haber varias por negocio."""
    __tablename__ = "cash_registers"

    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    name = Column(String, nullable=False)   # "Caja principal", "Caja mostrador"
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    business = relationship("Business")
    warehouse = relationship("Warehouse")
    sessions = relationship("CashSession", back_populates="register", cascade="all, delete-orphan")


class CashSession(Base):
    """Una sesión de caja — desde la apertura hasta el cierre."""
    __tablename__ = "cash_sessions"

    id = Column(Integer, primary_key=True, index=True)
    register_id = Column(Integer, ForeignKey("cash_registers.id"), nullable=False)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)

    opened_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    closed_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    status = Column(SQLEnum(CashRegisterStatus), default=CashRegisterStatus.OPEN)

    # Apertura
    opening_amount = Column(Numeric(12, 2), nullable=False, default=0)
    opened_at = Column(DateTime, default=datetime.utcnow)
    opening_notes = Column(String, nullable=True)

    # Cierre
    closing_amount = Column(Numeric(12, 2), nullable=True)  # Lo que había físicamente
    expected_amount = Column(Numeric(12, 2), nullable=True)  # Lo que debería haber
    difference = Column(Numeric(12, 2), nullable=True)       # closing - expected
    closed_at = Column(DateTime, nullable=True)
    closing_notes = Column(String, nullable=True)

    # Totales consolidados al cierre (calculados desde ventas)
    total_sales = Column(Numeric(12, 2), nullable=True)
    total_income = Column(Numeric(12, 2), nullable=True)   # Movimientos manuales entrada
    total_expense = Column(Numeric(12, 2), nullable=True)  # Movimientos manuales salida
    total_credit = Column(Numeric(12, 2), nullable=True)   # Ventas fiadas (no son caja)

    register = relationship("CashRegister", back_populates="sessions")
    movements = relationship("CashMovement", back_populates="session", cascade="all, delete-orphan")
    payment_breakdown = relationship("SessionPaymentBreakdown", back_populates="session", cascade="all, delete-orphan")


class CashMovement(Base):
    """Entrada o salida manual de dinero en una sesión."""
    __tablename__ = "cash_movements"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("cash_sessions.id"), nullable=False)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)

    movement_type = Column(SQLEnum(CashMovementType), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    description = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("CashSession", back_populates="movements")


class SessionPaymentBreakdown(Base):
    """Desglose de ventas por método de pago al cierre."""
    __tablename__ = "session_payment_breakdowns"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("cash_sessions.id"), nullable=False)
    payment_method_id = Column(Integer, ForeignKey("payment_methods.id"), nullable=False)
    payment_method_name = Column(String, nullable=False)  # Snapshot del nombre
    total = Column(Numeric(12, 2), nullable=False, default=0)
    is_credit = Column(Boolean, default=False)

    session = relationship("CashSession", back_populates="payment_breakdown")
    payment_method = relationship("PaymentMethod")