from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime,
    ForeignKey, Text, Numeric, Enum as SQLEnum
)
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base
from app.models.enums import WasteCause


class WasteRecord(Base):
    __tablename__ = "waste_records"

    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    presentation_id = Column(Integer, ForeignKey("product_presentations.id"), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    lot_id = Column(Integer, ForeignKey("product_lots.id"), nullable=True)  # Lote afectado si aplica
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)

    cause = Column(SQLEnum(WasteCause), nullable=False)
    quantity = Column(Numeric(12, 3), nullable=False)
    cost_per_unit = Column(Numeric(12, 2), nullable=True)   # Snapshot del costo al momento
    total_cost = Column(Numeric(12, 2), nullable=True)      # quantity * cost_per_unit
    notes = Column(Text, nullable=True)
    is_auto = Column(Boolean, default=False)  # True si fue generada automáticamente por lote vencido

    created_at = Column(DateTime, default=datetime.utcnow)

    business = relationship("Business")
    presentation = relationship("ProductPresentation")
    warehouse = relationship("Warehouse")
    lot = relationship("ProductLot")
    creator = relationship("User")