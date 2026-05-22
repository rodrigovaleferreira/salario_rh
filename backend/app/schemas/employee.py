# backend/app/schemas/employee.py

from pydantic import BaseModel, field_validator, UUID4
from typing import Optional
from decimal import Decimal
from datetime import date, datetime
import re


class EmployeeCreate(BaseModel):
    name: str
    registration: Optional[str] = None
    department: Optional[str] = None
    cost_center: Optional[str] = None
    manager_name: Optional[str] = None
    current_salary: Decimal
    hire_date: Optional[date] = None
    last_salary_review: Optional[date] = None
    position_id: UUID4

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Nome muito curto")
        if re.search(r"[<>\"';]", v):
            raise ValueError("Nome contém caracteres inválidos")
        return v

    @field_validator("current_salary")
    @classmethod
    def validate_salary(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Salário deve ser positivo")
        if v > Decimal("9999999.99"):
            raise ValueError("Valor fora do limite")
        return v


class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    registration: Optional[str] = None
    department: Optional[str] = None
    cost_center: Optional[str] = None
    manager_name: Optional[str] = None
    current_salary: Optional[Decimal] = None
    hire_date: Optional[date] = None
    last_salary_review: Optional[date] = None
    position_id: Optional[UUID4] = None
    is_active: Optional[bool] = None


class EmployeeResponse(BaseModel):
    id: UUID4
    name: str
    registration: Optional[str]
    department: Optional[str]
    cost_center: Optional[str]
    manager_name: Optional[str]
    current_salary: Decimal
    hire_date: Optional[date]
    last_salary_review: Optional[date]
    is_active: bool
    position_id: UUID4
    company_id: UUID4
    created_at: datetime

    # Dados do cargo (join)
    position_title: Optional[str] = None
    position_seniority: Optional[str] = None

    model_config = {"from_attributes": True}


class EmployeeWithAnalysis(EmployeeResponse):
    """Colaborador com dados de análise salarial."""
    compa_ratio: Optional[Decimal] = None
    position_in_range: Optional[str] = None
    deviation_percent: Optional[Decimal] = None
    is_critical: bool = False
    salary_min: Optional[Decimal] = None
    salary_midpoint: Optional[Decimal] = None
    salary_max: Optional[Decimal] = None