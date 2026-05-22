# backend/app/models/user.py

import uuid
from sqlalchemy import Column, String, Boolean, ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum
from app.db.base import Base, TimestampMixin


class UserRole(str, enum.Enum):
    ADMIN = "admin"           # Acesso total
    CONSULTANT = "consultant" # Acesso a múltiplas empresas vinculadas
    CLIENT = "client"         # Acesso somente à própria empresa


class User(Base, TimestampMixin):
    """
    Usuário do sistema.
    NUNCA retornar password_hash em nenhuma resposta de API.
    """
    __tablename__ = "users"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )
    email = Column(String(254), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(200), nullable=False)
    role = Column(
        SAEnum(UserRole),
        nullable=False,
        default=UserRole.CLIENT
    )
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)

    # Isolamento — usuário pertence a uma empresa
    company_id = Column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="RESTRICT"),
        nullable=False,
        index=True
    )

    # Relacionamentos
    company = relationship("Company", back_populates="users")
    audit_logs = relationship("AuditLog", back_populates="user")

    def __repr__(self):
        return f"<User {self.email} [{self.role}]>"