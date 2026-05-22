# backend/app/models/employee.py

import uuid
from sqlalchemy import Column, String, Numeric, ForeignKey, Boolean, Date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base import Base, TimestampMixin


class Employee(Base, TimestampMixin):
    """
    Colaborador — dado importado via planilha ou cadastrado manualmente.
    Salário em Numeric — nunca Float para valores financeiros.
    """
    __tablename__ = "employees"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Dados pessoais mínimos (princípio da minimização — LGPD)
    name = Column(String(200), nullable=False)
    registration = Column(String(50), nullable=True)  # Matrícula interna
    hire_date = Column(Date, nullable=True)

    # Remuneração
    current_salary = Column(Numeric(12, 2), nullable=False)
    last_salary_review = Column(Date, nullable=True)

    # Localização organizacional
    department = Column(String(100), nullable=True)
    cost_center = Column(String(100), nullable=True)
    manager_name = Column(String(200), nullable=True)

    is_active = Column(Boolean, default=True, nullable=False)

    # FK — cargo e empresa
    position_id = Column(
        UUID(as_uuid=True),
        ForeignKey("positions.id", ondelete="RESTRICT"),
        nullable=False,
        index=True
    )
    company_id = Column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Relacionamentos
    position = relationship("Position", back_populates="employees")
    company = relationship("Company", back_populates="employees")

    def __repr__(self):
        return f"<Employee {self.name}>"