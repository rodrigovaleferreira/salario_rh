# backend/app/api/v1/auth.py

from fastapi import APIRouter, Depends, Request, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.auth import (
    LoginRequest, TokenResponse,
    RefreshRequest, PasswordResetRequest
)
from app.schemas.user import UserResponse
from app.services.auth_service import AuthService, AuthError
from app.api.deps import get_current_user
from app.models.user import User
from app.core.middleware import limiter

router = APIRouter(prefix="/auth", tags=["Autenticação"])


def _get_client_ip(request: Request) -> str:
    """Extrai IP real considerando proxies."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")  # Máximo 5 tentativas por minuto por IP
async def login(
    request: Request,
    data: LoginRequest,
    db: Session = Depends(get_db),
):
    """
    Autenticação — retorna access_token + refresh_token.
    Rate limit agressivo: 5 tentativas/min por IP.
    Mensagem de erro IGUAL para qualquer falha (anti-enumeração).
    """
    service = AuthService(db)
    try:
        return service.login(
            data=data,
            ip_address=_get_client_ip(request),
            user_agent=request.headers.get("User-Agent"),
        )
    except AuthError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=e.message,
        )


@router.post("/refresh", response_model=TokenResponse)
@limiter.limit("10/minute")
async def refresh_token(
    request: Request,
    data: RefreshRequest,
    db: Session = Depends(get_db),
):
    """Renova access token usando refresh token."""
    service = AuthService(db)
    try:
        return service.refresh(data.refresh_token)
    except AuthError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=e.message,
        )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Logout — invalida sessão no lado do servidor.
    O frontend deve descartar os tokens localmente.
    
    NOTA: JWT é stateless por natureza. Para invalidação real,
    implementar blacklist de tokens (Redis) em produção.
    """
    from app.repositories.audit_repository import AuditRepository
    audit = AuditRepository(db)
    audit.log(
        action="auth.logout",
        user_id=current_user.id,
        company_id=current_user.company_id,
        ip_address=_get_client_ip(request),
    )
    return None


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retorna dados do usuário autenticado.
    Usado pelo frontend para verificar sessão ativa.
    """
    service = AuthService(db)
    return service.get_current_user_data(current_user)


@router.post("/password-reset/request", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("3/minute")
async def request_password_reset(
    request: Request,
    data: PasswordResetRequest,
    db: Session = Depends(get_db),
):
    """
    Solicita reset de senha.
    SEMPRE retorna 204 — mesmo se email não existir.
    Impede enumeração de emails cadastrados.
    """
    # TODO: Implementar envio de email com token de reset
    # Por ora, apenas registra a tentativa
    from app.repositories.audit_repository import AuditRepository
    audit = AuditRepository(db)
    audit.log(
        action="auth.password_reset.requested",
        details={"email": data.email},
        ip_address=_get_client_ip(request),
    )
    return None