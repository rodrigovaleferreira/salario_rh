# backend/app/core/middleware.py

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from app.core.config import settings

# Instância global do limiter — importar nas rotas
limiter = Limiter(key_func=get_remote_address)


def setup_middleware(app: FastAPI) -> None:
    """
    Configura todos os middlewares de segurança.
    Ordem importa — CORS primeiro, depois rate limit.
    """

    # ── CORS restritivo ───────────────────────────────────────────
    # Em produção: somente domínio do frontend
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
        expose_headers=["X-Request-ID"],
        max_age=600,
    )

    # ── Rate Limiting ─────────────────────────────────────────────
    app.state.limiter = limiter
    app.add_middleware(SlowAPIMiddleware)

    # ── Security Headers ─────────────────────────────────────────
    @app.middleware("http")
    async def add_security_headers(request: Request, call_next):
        response = await call_next(request)

        # Impede clickjacking
        response.headers["X-Frame-Options"] = "DENY"
        # Impede MIME sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"
        # Força HTTPS em produção
        if settings.is_production:
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains"
            )
        # Política de referrer
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        # Remove header que expõe tecnologia
        response.headers.pop("server", None)

        return response


def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    """
    Handler customizado para rate limit.
    Mensagem genérica — não revela limites ao atacante.
    """
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={"detail": "Muitas requisições. Tente novamente em breve."},
    )