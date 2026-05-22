# backend/app/core/config.py

from pydantic_settings import BaseSettings
from typing import List
import secrets


class Settings(BaseSettings):
    # ── App ──────────────────────────────────────────
    APP_NAME: str = "SalaryPlatform"
    APP_ENV: str = "development"

    # ── Segurança JWT ────────────────────────────────
    SECRET_KEY: str = secrets.token_urlsafe(64)  # fallback dev
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── Banco de dados ───────────────────────────────
    DATABASE_URL: str

    # ── Upload ───────────────────────────────────────
    MAX_UPLOAD_SIZE_MB: int = 10
    ALLOWED_EXTENSIONS: str = "xlsx,csv"
    UPLOAD_DIR: str = "uploads"

    # ── CORS ─────────────────────────────────────────
    ALLOWED_ORIGINS: str = "http://localhost:3000"

    @property
    def allowed_extensions_list(self) -> List[str]:
        return [ext.strip() for ext in self.ALLOWED_EXTENSIONS.split(",")]

    @property
    def allowed_origins_list(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]

    @property
    def max_upload_size_bytes(self) -> int:
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"

    class Config:
        env_file = ".env"
        case_sensitive = True


# Instância global — importar de qualquer lugar
settings = Settings()