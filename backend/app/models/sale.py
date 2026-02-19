from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime,
    ForeignKey, Text, Numeric, Enum as SQLEnum
)
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base
from app.models.enums import SaleStatus

class PaymentMethod(Base):
    __tablename__ = "payment_methods"

    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    name = Column(String, nullable=False)        # "Efectivo", "Nequi", "Bancolombia"
    description = Column(String, nullable=True)
    is_default = Column(Boolean, default=False)  # Efectivo viene por defecto
    is_credit = Column(Boolean, default=False)   # True solo para "Fiado"
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    business = relationship("Business")

class Sale(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Totales
    subtotal = Column(Numeric(12, 2), nullable=False)
    discount = Column(Numeric(12, 2), default=0)
    total = Column(Numeric(12, 2), nullable=False)

    # Resumen de pago (calculado a partir de SalePayment)
    amount_paid = Column(Numeric(12, 2), nullable=False, default=0)  # suma no-crédito
    amount_credit = Column(Numeric(12, 2), default=0)                # suma crédito

    status = Column(SQLEnum(SaleStatus), default=SaleStatus.COMPLETED)
    notes = Column(Text, nullable=True)
    cancelled_at = Column(DateTime, nullable=True)
    cancelled_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    cancel_reason = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relaciones
    business = relationship("Business")
    client = relationship("Client")
    warehouse = relationship("Warehouse")
    seller = relationship("User", foreign_keys=[created_by])
    items = relationship("SaleItem", back_populates="sale", cascade="all, delete-orphan")
    payments = relationship("SalePayment", back_populates="sale", cascade="all, delete-orphan")


class SaleItem(Base):
    __tablename__ = "sale_items"

    id = Column(Integer, primary_key=True, index=True)
    sale_id = Column(Integer, ForeignKey("sales.id"), nullable=False)
    presentation_id = Column(Integer, ForeignKey("product_presentations.id"), nullable=False)

    quantity = Column(Numeric(12, 3), nullable=False)
    unit_price = Column(Numeric(12, 2), nullable=False)
    discount = Column(Numeric(12, 2), default=0)
    subtotal = Column(Numeric(12, 2), nullable=False)

    sale = relationship("Sale", back_populates="items")
    presentation = relationship("ProductPresentation")


class SalePayment(Base):
    """Un registro por cada método de pago usado en la venta (pagos mixtos)."""
    __tablename__ = "sale_payments"

    id = Column(Integer, primary_key=True, index=True)
    sale_id = Column(Integer, ForeignKey("sales.id"), nullable=False)
    payment_method_id = Column(Integer, ForeignKey("payment_methods.id"), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    is_credit = Column(Boolean, default=False)  # snapshot del método al momento de la venta

    sale = relationship("Sale", back_populates="payments")
    payment_method = relationship("PaymentMethod")
