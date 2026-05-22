# backend/app/core/security.py

from datetime import datetime, timedelta, timezone
from typing import Optional, Union
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.core.config import settings

# Contexto de hashing — bcrypt com custo 12
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)


def hash_password(plain_password: str) -> str:
    """
    Nunca armazene senha em texto puro.
    bcrypt gera salt automaticamente e o inclui no hash.
    """
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Comparação segura — resistente a timing attack.
    """
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(
    subject: Union[str, int],
    extra_claims: Optional[dict] = None
) -> str:
    """
    JWT de curta duração (30min por padrão).
    subject = user_id (nunca email ou dado sensível no payload público).
    """
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload = {
        "sub": str(subject),
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "access",
    }
    if extra_claims:
        payload.update(extra_claims)

    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(subject: Union[str, int]) -> str:
    """
    Refresh token de longa duração (7 dias).
    Separado do access token — escopo diferente.
    """
    expire = datetime.now(timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    payload = {
        "sub": str(subject),
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "refresh",
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    """
    Decodifica e valida JWT.
    Retorna None em qualquer erro — nunca lança exceção para o cliente.
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        return payload
    except JWTError:
        return None


def get_subject_from_token(token: str, token_type: str = "access") -> Optional[str]:
    """
    Extrai subject (user_id) validando também o tipo do token.
    Impede uso de refresh token como access token.
    """
    payload = decode_token(token)
    if not payload:
        return None
    if payload.get("type") != token_type:
        return None
    return payload.get("sub")