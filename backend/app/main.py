# backend/app/main.py

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.middleware import setup_middleware, rate_limit_handler
from slowapi.errors import RateLimitExceeded
from app.db.init_db import create_tables
from app.api.v1 import auth as auth_router
from app.api.v1 import auth as auth_router
from app.api.v1 import uploads as upload_router
from app.api.v1 import salaries as salary_router
from app.api.v1 import positions as position_router
from app.api.v1 import employees as employee_router
from app.api.v1 import reports as report_router




@asynccontextmanager
async def lifespan(app: FastAPI):
    """Executado na inicialização e shutdown."""
    # Startup
    create_tables()
    yield
    # Shutdown (liberar recursos se necessário)


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    docs_url="/api/docs" if not settings.is_production else None,
    redoc_url="/api/redoc" if not settings.is_production else None,
    openapi_url="/api/openapi.json" if not settings.is_production else None,
    lifespan=lifespan,
)

# ── Middlewares de segurança ──────────────────────────────────────
setup_middleware(app)

# ── Handler de rate limit ─────────────────────────────────────────
app.add_exception_handler(RateLimitExceeded, rate_limit_handler)


# ── Handler global de erros de validação ─────────────────────────
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError
):
    """
    Erros de validação Pydantic — formata de forma limpa.
    NUNCA expõe stacktrace interno.
    """
    errors = []
    for error in exc.errors():
        errors.append({
            "field": " → ".join(str(x) for x in error["loc"]),
            "message": error["msg"],
        })
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": "Dados inválidos", "errors": errors},
    )


# ── Handler global de exceções não tratadas ───────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Captura qualquer exceção não tratada.
    Log interno completo, resposta externa genérica.
    NUNCA expor stacktrace ou mensagem interna ao cliente.
    """
    import logging
    import traceback
    logger = logging.getLogger("salary_platform")
    logger.error(
        "Unhandled exception",
        extra={
            "path": request.url.path,
            "method": request.method,
            "traceback": traceback.format_exc(),
        }
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Erro interno. Nossa equipe foi notificada."},
    )


# ── Rotas ─────────────────────────────────────────────────────────
app.include_router(auth_router.router, prefix="/api/v1")


@app.get("/health", tags=["Health"])
def health_check():
    """Endpoint de saúde — usado por load balancers e monitores."""
    return {"status": "ok", "app": settings.APP_NAME}


# E registrar os routers:
app.include_router(auth_router.router, prefix="/api/v1")
app.include_router(upload_router.router, prefix="/api/v1")
app.include_router(salary_router.router, prefix="/api/v1")
app.include_router(position_router.router, prefix="/api/v1")
app.include_router(employee_router.router, prefix="/api/v1")
app.include_router(report_router.router, prefix="/api/v1")

