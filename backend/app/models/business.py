from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum as SQLEnum, Text
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base
from app.models.enums import SubscriptionPlan, BusinessType

class Business(Base):
    __tablename__ = "businesses"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    business_type = Column(SQLEnum(BusinessType), default=BusinessType.RETAIL)
    plan_type = Column(SQLEnum(SubscriptionPlan), default=SubscriptionPlan.FREE)
    max_users = Column(Integer, default=1)
    max_products = Column(Integer, default=100)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Módulos habilitados según plan
    module_inventory = Column(Boolean, default=True)
    module_sales = Column(Boolean, default=True)
    module_clients = Column(Boolean, default=True)
    module_portfolio = Column(Boolean, default=True)
    module_finance = Column(Boolean, default=False)
    module_suppliers = Column(Boolean, default=False)
    module_reports = Column(Boolean, default=False)
    module_waste = Column(Boolean, default=False)
    
    # Relaciones
    owner = relationship("User", back_populates="owned_businesses")
    business_users = relationship("BusinessUser", back_populates="business", cascade="all, delete-orphan")
    business_roles = relationship("BusinessRole", back_populates="business", cascade="all, delete-orphan")

class BusinessUser(Base):
    __tablename__ = "business_users"
    
    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    business_role_id = Column(Integer, ForeignKey("business_roles.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    invited_by = Column(Integer, ForeignKey("users.id"))
    joined_at = Column(DateTime, default=datetime.utcnow)
    
    # Relaciones
    business = relationship("Business", back_populates="business_users")
    user = relationship("User", foreign_keys=[user_id], back_populates="business_memberships")
    inviter = relationship("User", foreign_keys=[invited_by])
    business_role = relationship("BusinessRole")