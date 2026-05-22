# backend/app/schemas/salary.py

from pydantic import BaseModel, field_validator, UUID4
from typing import Optional
from decimal import Decimal
from datetime import datetime


class SalaryBandCreate(BaseModel):
    position_id: UUID4
    salary_min: Decimal
    salary_midpoint: Decimal
    salary_max: Decimal
    market_p25: Optional[Decimal] = None
    market_p50: Optional[Decimal] = None
    market_p75: Optional[Decimal] = None
    currency: str = "BRL"

    @field_validator("salary_min", "salary_midpoint", "salary_max")
    @classmethod
    def positive_salary(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Salário deve ser positivo")
        if v > Decimal("9999999.99"):
            raise ValueError("Valor fora do limite permitido")
        return v

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, v: str) -> str:
        allowed = {"BRL", "USD", "EUR"}
        if v not in allowed:
            raise ValueError(f"Moeda inválida. Permitidas: {allowed}")
        return v

    def model_post_init(self, __context) -> None:
        """Valida consistência min < midpoint < max."""
        if self.salary_min >= self.salary_midpoint:
            raise ValueError("Mínimo deve ser menor que o midpoint")
        if self.salary_midpoint >= self.salary_max:
            raise ValueError("Midpoint deve ser menor que o máximo")


class SalaryBandResponse(BaseModel):
    id: UUID4
    position_id: UUID4
    salary_min: Decimal
    salary_midpoint: Decimal
    salary_max: Decimal
    range_spread: Optional[Decimal]
    market_p50: Optional[Decimal]
    currency: str
    version: int
    created_at: datetime

    model_config = {"from_attributes": True}


class SalaryAnalysisResult(BaseModel):
    """
    Resultado da análise salarial de um colaborador.
    Calculado no backend — nunca no frontend.
    """
    employee_id: UUID4
    employee_name: str
    current_salary: Decimal
    salary_min: Decimal
    salary_midpoint: Decimal
    salary_max: Decimal
    compa_ratio: Decimal        # Salário / Midpoint * 100
    position_in_range: str      # "below", "within", "above"
    deviation_percent: Decimal  # % de desvio da faixa
    is_critical: bool           # Distorção significativa (>20%)