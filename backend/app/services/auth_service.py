# backend/app/services/auth_service.py

from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timezone

from app.repositories.user_repository import UserRepository
from app.repositories.audit_repository import AuditRepository
from app.core.security import (
    verify_password,
    create_access_token,
    create_refresh_token,
    get_subject_from_token,
)
from app.core.config import settings
from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.user import UserCreate, UserResponse
from app.models.user import User
import uuid


class AuthError(Exception):
    """Erro de autenticação — mensagem genérica para o cliente."""
    def __init__(self, message: str = "Credenciais inválidas"):
        self.message = message
        super().__init__(message)


class AuthService:

    def __init__(self, db: Session):
        self.db = db
        self.user_repo = UserRepository(db)
        self.audit_repo = AuditRepository(db)

    def login(
        self,
        data: LoginRequest,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> TokenResponse:
        """
        Autenticação segura:
        1. Busca usuário pelo email
        2. Verifica senha com bcrypt
        3. Gera tokens
        4. Registra auditoria (sucesso e falha)

        IMPORTANTE: Mensagem de erro IGUAL para email e senha inválidos.
        Isso impede enumeração — atacante não sabe se email existe.
        """
        user = self.user_repo.get_by_email(data.email)

        # Verifica senha mesmo se usuário não existir
        # Evita timing attack por short-circuit
        dummy_hash = "$2b$12$dummy.hash.to.prevent.timing.attack.on.nonexistent"
        password_hash = user.password_hash if user else dummy_hash

        password_ok = verify_password(data.password, password_hash)

        if not user or not password_ok or not user.is_active:
            # Registra tentativa falha (sem revelar motivo)
            self.audit_repo.log(
                action="auth.login.failed",
                details={"email": data.email, "reason": "invalid_credentials"},
                ip_address=ip_address,
                user_agent=user_agent,
            )
            raise AuthError("Credenciais inválidas")

        # Gera tokens com claims mínimos
        extra_claims = {
            "role": user.role.value,
            "company_id": str(user.company_id),
        }
        access_token = create_access_token(user.id, extra_claims)
        refresh_token = create_refresh_token(user.id)

        # Atualiza timestamp de acesso
        self.user_repo.update_last_login(user)

        # Auditoria de sucesso
        self.audit_repo.log(
            action="auth.login.success",
            user_id=user.id,
            company_id=user.company_id,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

    def refresh(self, refresh_token: str) -> TokenResponse:
        """
        Gera novo access token a partir do refresh token.
        Valida que é um refresh token (não um access token reutilizado).
        """
        user_id = get_subject_from_token(refresh_token, token_type="refresh")
        if not user_id:
            raise AuthError("Token de refresh inválido ou expirado")

        try:
            uid = uuid.UUID(user_id)
        except ValueError:
            raise AuthError("Token inválido")

        user = self.user_repo.get_by_id(uid)
        if not user or not user.is_active:
            raise AuthError("Usuário não encontrado ou inativo")

        extra_claims = {
            "role": user.role.value,
            "company_id": str(user.company_id),
        }
        new_access = create_access_token(user.id, extra_claims)
        new_refresh = create_refresh_token(user.id)

        self.audit_repo.log(
            action="auth.token.refresh",
            user_id=user.id,
            company_id=user.company_id,
        )

        return TokenResponse(
            access_token=new_access,
            refresh_token=new_refresh,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

    def register(self, data: UserCreate) -> UserResponse:
        """
        Cadastro de usuário.
        Verifica duplicidade de email sem revelar que o email existe
        (retorna erro genérico).
        """
        if self.user_repo.email_exists(data.email):
            # Mensagem genérica — não confirma se email existe
            raise AuthError("Não foi possível criar o usuário")

        user = self.user_repo.create(data)

        self.audit_repo.log(
            action="auth.user.created",
            user_id=user.id,
            company_id=user.company_id,
            resource_type="user",
            resource_id=str(user.id),
        )

        return UserResponse.model_validate(user)

    def get_current_user_data(self, user: User) -> UserResponse:
        return UserResponse.model_validate(user)