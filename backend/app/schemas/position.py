# backend/app/schemas/position.py

from pydantic import BaseModel, field_validator, UUID4
from typing import Optional, List
from datetime import datetime
from app.models.position import SeniorityLevel
import re


class PositionCreate(BaseModel):
    title: str
    seniority: SeniorityLevel
    department: str
    area: Optional[str] = None
    cost_center: Optional[str] = None
    hierarchy_level: int = 1
    parent_id: Optional[UUID4] = None
    description: Optional[str] = None
    code: Optional[str] = None

    @field_validator("title", "department")
    @classmethod
    def sanitize_text(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Campo muito curto")
        if re.search(r"[<>\"';]", v):
            raise ValueError("Caracteres inválidos")
        return v

    @field_validator("hierarchy_level")
    @classmethod
    def validate_level(cls, v: int) -> int:
        if not 1 <= v <= 10:
            raise ValueError("Nível hierárquico deve ser entre 1 e 10")
        return v


class PositionResponse(BaseModel):
    id: UUID4
    title: str
    title_normalized: str
    seniority: SeniorityLevel
    department: str
    area: Optional[str]
    cost_center: Optional[str]
    hierarchy_level: int
    parent_id: Optional[UUID4]
    is_active: bool
    company_id: UUID4
    created_at: datetime

    model_config = {"from_attributes": True}


class PositionTreeNode(BaseModel):
    """Nó do organograma — estrutura recursiva para o frontend."""
    id: UUID4
    title: str
    seniority: SeniorityLevel
    department: str
    hierarchy_level: int
    children: List["PositionTreeNode"] = []

    model_config = {"from_attributes": True}


PositionTreeNode.model_rebuild()


class PositionUpdate(BaseModel):
    title: Optional[str] = None
    seniority: Optional[SeniorityLevel] = None
    department: Optional[str] = None
    area: Optional[str] = None
    hierarchy_level: Optional[int] = None
    parent_id: Optional[UUID4] = None
    is_active: Optional[bool] = None