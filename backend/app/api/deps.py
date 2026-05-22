# backend/app/api/deps.py

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Callable
from uuid import UUID

from app.db.session import get_db
from app.core.security import get_subject_from_token
from app.repositories.user_repository import UserRepository
from app.models.user import User, UserRole

# Extrai Bearer token do header Authorization
bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Dependency principal de autenticação.
    
    Fluxo:
    1. Extrai Bearer token do header
    2. Decodifica e valida JWT
    3. Busca usuário no banco (garante que ainda existe e está ativo)
    4. Retorna User ou lança 401
    
    NUNCA retornar mensagem diferente para token inválido vs usuário inativo
    — evita enumeração.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Não autenticado",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not credentials:
        raise credentials_exception

    token = credentials.credentials
    user_id_str = get_subject_from_token(token, token_type="access")

    if not user_id_str:
        raise credentials_exception

    try:
        user_id = UUID(user_id_str)
    except ValueError:
        raise credentials_exception

    user_repo = UserRepository(db)
    user = user_repo.get_by_id(user_id)

    if not user or not user.is_active:
        raise credentials_exception

    return user


def require_role(*roles: UserRole) -> Callable:
    """
    Factory de dependency para controle de acesso por papel.
    
    Uso:
        @router.delete("/users/{id}")
        def delete_user(
            current_user: User = Depends(require_role(UserRole.ADMIN))
        ):
            ...
    """
    def role_checker(
        current_user: User = Depends(get_current_user),
    ) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permissão insuficiente",
            )
        return current_user

    return role_checker


def get_company_id_from_user(
    current_user: User = Depends(get_current_user),
) -> UUID:
    """
    Extrai company_id do usuário autenticado.
    NUNCA usar company_id enviado pelo frontend — sempre do token.
    """
    return current_user.company_id


def verify_company_ownership(
    resource_company_id: UUID,
    current_user: User,
) -> None:
    """
    Valida que o recurso pertence à empresa do usuário.
    Chame isso sempre que acessar um recurso por ID.
    
    Admins podem acessar qualquer empresa.
    """
    if current_user.role == UserRole.ADMIN:
        return

    if resource_company_id != current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado a este recurso",
        )