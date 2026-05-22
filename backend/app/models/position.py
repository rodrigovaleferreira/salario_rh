# backend/app/models/position.py

import uuid
from sqlalchemy import (
    Column, String, Integer, ForeignKey,
    Enum as SAEnum, Text, Boolean
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum
from app.db.base import Base, TimestampMixin


class SeniorityLevel(str, enum.Enum):
    INTERN = "intern"           # Estagiário
    ASSISTANT = "assistant"     # Assistente
    JUNIOR = "junior"           # Analista Jr
    MID = "mid"                 # Analista Pleno
    SENIOR = "senior"           # Analista Sênior
    SPECIALIST = "specialist"   # Especialista
    COORDINATOR = "coordinator" # Coordenador
    MANAGER = "manager"         # Gerente
    DIRECTOR = "director"       # Diretor
    VP = "vp"                   # Vice-Presidente
    C_LEVEL = "c_level"         # CEO, CFO, CTO...


class Position(Base, TimestampMixin):
    """
    Cargo — entidade central da plataforma.
    Suporta hierarquia via parent_id (autorelacionamento).
    """
    __tablename__ = "positions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Dados do cargo
    title = Column(String(200), nullable=False)
    title_normalized = Column(String(200), nullable=False, index=True)
    code = Column(String(50), nullable=True)  # CBO ou código interno
    description = Column(Text, nullable=True)

    # Classificação
    seniority = Column(SAEnum(SeniorityLevel), nullable=False)
    department = Column(String(100), nullable=False, index=True)
    area = Column(String(100), nullable=True)
    cost_center = Column(String(100), nullable=True)

    # Nível hierárquico numérico (1=base, 10=topo)
    # Facilita cálculos e ordenação
    hierarchy_level = Column(Integer, nullable=False, default=1)

    # Hierarquia pai-filho para organograma
    parent_id = Column(
        UUID(as_uuid=True),
        ForeignKey("positions.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    is_active = Column(Boolean, default=True, nullable=False)

    # Isolamento multitenancy
    company_id = Column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Relacionamentos
    company = relationship("Company", back_populates="positions")
    parent = relationship("Position", remote_side="Position.id", backref="children")
    salary_band = relationship("SalaryBand", back_populates="position", uselist=False)
    employees = relationship("Employee", back_populates="position")

    def __repr__(self):
        return f"<Position {self.title} [{self.seniority}]>"