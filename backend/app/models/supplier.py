from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime,
    ForeignKey, Text, Numeric, Enum as SQLEnum
)
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base
from app.models.enums import SupplierStatus, PurchaseStatus, SupplierPaymentStatus

class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)

    name = Column(String, nullable=False)
    contact_name = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    address = Column(String, nullable=True)
    document_id = Column(String, nullable=True)   # NIT / Cédula
    notes = Column(Text, nullable=True)

    # Crédito con proveedor
    credit_limit = Column(Numeric(12, 2), default=0)
    current_balance = Column(Numeric(12, 2), default=0)  # Deuda actual con proveedor
    credit_days = Column(Integer, default=30)

    status = Column(SQLEnum(SupplierStatus), default=SupplierStatus.ACTIVE)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_purchase_at = Column(DateTime, nullable=True)

    business = relationship("Business")
    purchases = relationship("SupplierPurchase", back_populates="supplier", cascade="all, delete-orphan")
    payments = relationship("SupplierPayment", back_populates="supplier", cascade="all, delete-orphan")
    products = relationship("SupplierProduct", back_populates="supplier", cascade="all, delete-orphan")


class SupplierProduct(Base):
    """Productos que suministra este proveedor."""
    __tablename__ = "supplier_products"

    id = Column(Integer, primary_key=True, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    presentation_id = Column(Integer, ForeignKey("product_presentations.id"), nullable=False)
    cost_price = Column(Numeric(12, 2), nullable=True)  # Precio habitual del proveedor
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    supplier = relationship("Supplier", back_populates="products")
    presentation = relationship("ProductPresentation")


class SupplierPurchase(Base):
    """Compra realizada a un proveedor — genera entrada en inventario."""
    __tablename__ = "supplier_purchases"

    id = Column(Integer, primary_key=True, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)

    subtotal = Column(Numeric(12, 2), nullable=False)
    discount = Column(Numeric(12, 2), default=0)
    total = Column(Numeric(12, 2), nullable=False)
    amount_paid = Column(Numeric(12, 2), default=0)
    amount_credit = Column(Numeric(12, 2), default=0)  # Quedó debiendo

    payment_status = Column(SQLEnum(SupplierPaymentStatus), default=SupplierPaymentStatus.PENDING)
    status = Column(SQLEnum(PurchaseStatus), default=PurchaseStatus.COMPLETED)
    notes = Column(Text, nullable=True)
    expected_payment_date = Column(DateTime, nullable=True)  # Fecha acordada de pago

    created_at = Column(DateTime, default=datetime.utcnow)

    supplier = relationship("Supplier", back_populates="purchases")
    items = relationship("SupplierPurchaseItem", back_populates="purchase", cascade="all, delete-orphan")
    payments = relationship("SupplierPayment", back_populates="purchase")


class SupplierPurchaseItem(Base):
    __tablename__ = "supplier_purchase_items"

    id = Column(Integer, primary_key=True, index=True)
    purchase_id = Column(Integer, ForeignKey("supplier_purchases.id"), nullable=False)
    presentation_id = Column(Integer, ForeignKey("product_presentations.id"), nullable=False)

    quantity = Column(Numeric(12, 3), nullable=False)
    cost_per_unit = Column(Numeric(12, 2), nullable=False)
    subtotal = Column(Numeric(12, 2), nullable=False)

    # Datos del lote que se crea en inventario
    lot_number = Column(String, nullable=True)
    expiry_date = Column(DateTime, nullable=True)

    purchase = relationship("SupplierPurchase", back_populates="items")
    presentation = relationship("ProductPresentation")


class SupplierPayment(Base):
    """Abono/pago realizado a un proveedor."""
    __tablename__ = "supplier_payments"

    id = Column(Integer, primary_key=True, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    purchase_id = Column(Integer, ForeignKey("supplier_purchases.id"), nullable=True)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)

    amount = Column(Numeric(12, 2), nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    supplier = relationship("Supplier", back_populates="payments")
    purchase = relationship("SupplierPurchase", back_populates="payments")