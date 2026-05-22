# backend/app/models/salary_band.py

import uuid
from sqlalchemy import Column, Numeric, Integer, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base import Base, TimestampMixin


class SalaryBand(Base, TimestampMixin):
    """
    Faixa salarial de um cargo.
    Relação 1:1 com Position.
    min → midpoint → max define o range aceitável.
    """
    __tablename__ = "salary_bands"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Faixa salarial — Numeric para precisão financeira (nunca Float)
    salary_min = Column(Numeric(12, 2), nullable=False)
    salary_midpoint = Column(Numeric(12, 2), nullable=False)
    salary_max = Column(Numeric(12, 2), nullable=False)

    # Amplitude da faixa em % (ex: 40 = 40% entre min e max)
    # Calculado: ((max - min) / min) * 100
    range_spread = Column(Numeric(6, 2), nullable=True)

    # Referência de mercado (pesquisa salarial externa)
    market_p25 = Column(Numeric(12, 2), nullable=True)  # Percentil 25
    market_p50 = Column(Numeric(12, 2), nullable=True)  # Percentil 50 (mediana)
    market_p75 = Column(Numeric(12, 2), nullable=True)  # Percentil 75

    currency = Column(String(3), default="BRL", nullable=False)
    version = Column(Integer, default=1, nullable=False)  # Histórico de revisões

    # FK para o cargo
    position_id = Column(
        UUID(as_uuid=True),
        ForeignKey("positions.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,  # 1 faixa por cargo
        index=True
    )
    company_id = Column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Relacionamentos
    position = relationship("Position", back_populates="salary_band")
    company = relationship("Company", back_populates="salary_bands")

    def __repr__(self):
        return f"<SalaryBand {self.salary_min}~{self.salary_max}>"