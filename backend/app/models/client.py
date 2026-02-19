from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, 
    ForeignKey, Text, Numeric, Enum as SQLEnum
)
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base
from app.models.enums import ClientStatus, ClientType

class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)

    # Datos básicos
    name = Column(String, nullable=False)
    client_type = Column(SQLEnum(ClientType), default=ClientType.NATURAL)
    phone = Column(String)
    email = Column(String)
    address = Column(String)
    document_id = Column(String)  # cédula / NIT
    notes = Column(Text)          # "paga los viernes", "no fiar más de X"

    # Crédito
    credit_limit = Column(Numeric(12, 2), default=0)
    current_balance = Column(Numeric(12, 2), default=0)  # deuda actual
    credit_days = Column(Integer, default=30)             # días antes de morosidad

    # Estado
    status = Column(SQLEnum(ClientStatus), default=ClientStatus.ACTIVE)
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_purchase_at = Column(DateTime, nullable=True)

    # Relaciones
    business = relationship("Business")
    purchase_history = relationship("ClientPurchase", back_populates="client", cascade="all, delete-orphan")
    credit_movements = relationship("CreditMovement", back_populates="client", cascade="all, delete-orphan")


class ClientPurchase(Base):
    """Historial de compras — se creará desde el módulo de ventas,
       pero lo definimos aquí para tenerlo listo."""
    __tablename__ = "client_purchases"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)

    total = Column(Numeric(12, 2), nullable=False)
    payment_method = Column(String)           # efectivo, fiado, nequi, etc.
    is_credit = Column(Boolean, default=False)
    notes = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    client = relationship("Client", back_populates="purchase_history")


class CreditMovement(Base):
    """Abonos y cargos a la deuda del cliente."""
    __tablename__ = "credit_movements"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)

    amount = Column(Numeric(12, 2), nullable=False)  # + cargo, - abono
    movement_type = Column(String, nullable=False)    # "charge" | "payment"
    description = Column(String)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    client = relationship("Client", back_populates="credit_movements")