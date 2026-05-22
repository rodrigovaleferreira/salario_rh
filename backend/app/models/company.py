# backend/app/models/company.py

import uuid
from sqlalchemy import Column, String, Boolean, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base import Base, TimestampMixin


class Company(Base, TimestampMixin):
    """
    Empresa cliente — raiz do isolamento multitenancy.
    Tudo no sistema pertence a uma Company.
    """
    __tablename__ = "companies"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )
    name = Column(String(200), nullable=False)
    cnpj = Column(String(18), unique=True, nullable=True)
    segment = Column(String(100), nullable=True)   # Ex: Tecnologia, Varejo
    size_range = Column(String(50), nullable=True)  # Ex: 50-200, 200-500
    is_active = Column(Boolean, default=True, nullable=False)
    notes = Column(Text, nullable=True)

    # Relacionamentos
    users = relationship("User", back_populates="company")
    positions = relationship("Position", back_populates="company")
    employees = relationship("Employee", back_populates="company")
    salary_bands = relationship("SalaryBand", back_populates="company")

    def __repr__(self):
        return f"<Company {self.name}>"