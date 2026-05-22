# backend/app/schemas/user.py

from pydantic import BaseModel, EmailStr, field_validator, UUID4
from typing import Optional
from datetime import datetime
from app.models.user import UserRole
import re


class UserCreate(BaseModel):
    """Criação de usuário — validação forte server-side."""
    email: EmailStr
    password: str
    full_name: str
    role: UserRole = UserRole.CLIENT
    company_id: UUID4

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Mínimo 8 caracteres")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Ao menos uma maiúscula")
        if not re.search(r"[0-9]", v):
            raise ValueError("Ao menos um número")
        return v

    @field_validator("full_name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Nome muito curto")
        # Remove caracteres perigosos
        if re.search(r"[<>\"'%;()&+]", v):
            raise ValueError("Nome contém caracteres inválidos")
        return v


class UserResponse(BaseModel):
    """
    Resposta segura — password_hash NUNCA aparece aqui.
    Apenas dados necessários para o frontend.
    """
    id: UUID4
    email: str
    full_name: str
    role: UserRole
    is_active: bool
    company_id: UUID4
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    """Atualização parcial — apenas campos permitidos."""
    full_name: Optional[str] = None
    is_active: Optional[bool] = None