# backend/app/schemas/auth.py

from pydantic import BaseModel, EmailStr, field_validator
import re


class LoginRequest(BaseModel):
    """Dados de login — validados antes de chegar no service."""
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def password_not_empty(cls, v: str) -> str:
        if not v or len(v.strip()) == 0:
            raise ValueError("Senha não pode ser vazia")
        return v


class TokenResponse(BaseModel):
    """Resposta de autenticação — NUNCA incluir dados sensíveis."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # segundos


class RefreshRequest(BaseModel):
    refresh_token: str


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Senha deve ter no mínimo 8 caracteres")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Senha deve ter ao menos uma letra maiúscula")
        if not re.search(r"[0-9]", v):
            raise ValueError("Senha deve ter ao menos um número")
        return v