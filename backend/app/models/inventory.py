from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime,
    ForeignKey, Text, Numeric, Enum as SQLEnum
)
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base
from app.models.enums import MovementType, ProductStatus

# ── Categoría ─────────────────────────────────────────────────────────────────

class ProductCategory(Base):
    __tablename__ = "product_categories"

    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text)
    color = Column(String, default="#6366f1")  # Para UI
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    business = relationship("Business")
    products = relationship("Product", back_populates="category")


# ── Bodega ────────────────────────────────────────────────────────────────────

class Warehouse(Base):
    __tablename__ = "warehouses"

    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    name = Column(String, nullable=False)       # "Bodega principal", "Mostrador"
    description = Column(Text)
    is_default = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    business = relationship("Business")
    stock = relationship("ProductStock", back_populates="warehouse")


# ── Producto ──────────────────────────────────────────────────────────────────

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("product_categories.id"), nullable=True)

    name = Column(String, nullable=False)
    description = Column(Text)
    is_perishable = Column(Boolean, default=False)
    status = Column(SQLEnum(ProductStatus), default=ProductStatus.ACTIVE)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    business = relationship("Business")
    category = relationship("ProductCategory", back_populates="products")
    presentations = relationship("ProductPresentation", back_populates="product", cascade="all, delete-orphan")


# ── Presentación (ej: 250ml, 500ml, 1L) ──────────────────────────────────────

class ProductPresentation(Base):
    __tablename__ = "product_presentations"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)

    name = Column(String, nullable=False)          # "250ml", "Caja x12", "Unidad"
    barcode = Column(String, nullable=True)
    sale_price = Column(Numeric(12, 2), nullable=False)
    min_stock = Column(Integer, default=0)         # Alerta de stock bajo
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    product = relationship("Product", back_populates="presentations")
    stock = relationship("ProductStock", back_populates="presentation", cascade="all, delete-orphan")
    lots = relationship("ProductLot", back_populates="presentation", cascade="all, delete-orphan")


# ── Stock por bodega ──────────────────────────────────────────────────────────

class ProductStock(Base):
    """Stock actual de una presentación en una bodega específica."""
    __tablename__ = "product_stock"

    id = Column(Integer, primary_key=True, index=True)
    presentation_id = Column(Integer, ForeignKey("product_presentations.id"), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    quantity = Column(Numeric(12, 3), default=0)  # Decimal para productos a granel

    presentation = relationship("ProductPresentation", back_populates="stock")
    warehouse = relationship("Warehouse", back_populates="stock")
    
    @property
    def warehouse_name(self):
        return self.warehouse.name if self.warehouse else None


# ── Lote ──────────────────────────────────────────────────────────────────────

class ProductLot(Base):
    __tablename__ = "product_lots"

    id = Column(Integer, primary_key=True, index=True)
    presentation_id = Column(Integer, ForeignKey("product_presentations.id"), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)

    lot_number = Column(String, nullable=True)         # Número de lote del proveedor
    quantity = Column(Numeric(12, 3), nullable=False)  # Cantidad en este lote
    remaining = Column(Numeric(12, 3), nullable=False) # Lo que queda
    cost_per_unit = Column(Numeric(12, 2), nullable=True)  # Para rentabilidad

    arrival_date = Column(DateTime, default=datetime.utcnow)
    expiry_date = Column(DateTime, nullable=True)      # Solo perecederos
    is_active = Column(Boolean, default=True)

    presentation = relationship("ProductPresentation", back_populates="lots")

    @property
    def is_expired(self):
        if not self.expiry_date:
            return False
        return datetime.utcnow() > self.expiry_date

    @property
    def days_to_expiry(self):
        if not self.expiry_date:
            return None
        delta = self.expiry_date - datetime.utcnow()
        return delta.days


# ── Movimiento de inventario ──────────────────────────────────────────────────

class InventoryMovement(Base):
    __tablename__ = "inventory_movements"

    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    presentation_id = Column(Integer, ForeignKey("product_presentations.id"), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    lot_id = Column(Integer, ForeignKey("product_lots.id"), nullable=True)

    movement_type = Column(SQLEnum(MovementType), nullable=False)
    quantity = Column(Numeric(12, 3), nullable=False)  # + entrada, - salida
    cost_per_unit = Column(Numeric(12, 2), nullable=True)
    reason = Column(String, nullable=True)             # Justificación en ajustes

    # Para transferencias
    destination_warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=True)

    # Trazabilidad
    reference_id = Column(Integer, nullable=True)      # ID de venta, compra, etc.
    reference_type = Column(String, nullable=True)     # "sale", "purchase", etc.

    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)