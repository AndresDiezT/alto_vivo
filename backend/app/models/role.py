from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Table
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

# Tabla intermedia para la relación muchos-a-muchos entre roles y permisos
role_permissions = Table(
    'role_permissions',
    Base.metadata,
    Column('role_id', Integer, ForeignKey('business_roles.id'), primary_key=True),
    Column('permission_id', Integer, ForeignKey('permissions.id'), primary_key=True)
)

class Permission(Base):
    __tablename__ = "permissions"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, nullable=False)  # ej: "inventory.create", "sales.view"
    name = Column(String, nullable=False)
    description = Column(Text)
    module = Column(String, nullable=False)  # inventory, sales, finance, etc.
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relaciones
    roles = relationship("BusinessRole", secondary=role_permissions, back_populates="permissions")

class BusinessRole(Base):
    __tablename__ = "business_roles"
    
    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text)
    is_default = Column(Boolean, default=False)  # Empleado es el rol por defecto
    can_manage_users = Column(Boolean, default=False)
    can_manage_roles = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relaciones
    business = relationship("Business", back_populates="business_roles")
    permissions = relationship("Permission", secondary=role_permissions, back_populates="roles")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=True)
    action = Column(String, nullable=False)  # CREATE, UPDATE, DELETE, LOGIN, etc.
    entity_type = Column(String, nullable=False)  # User, Business, Role, etc.
    entity_id = Column(Integer)
    details = Column(Text)  # JSON con detalles adicionales
    ip_address = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relaciones
    user = relationship("User", back_populates="audit_logs")