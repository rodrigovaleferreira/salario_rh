# backend/app/db/session.py

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator
from app.core.config import settings

# Engine com pool de conexões
# pool_pre_ping=True → testa conexão antes de usar (evita conexões mortas)
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    echo=settings.APP_ENV == "development",  # Log SQL só em dev
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)


def get_db() -> Generator[Session, None, None]:
    """
    Dependency do FastAPI — injeta sessão do banco.
    Garante fechamento mesmo em exceções (finally).
    
    Uso:
        @router.get("/")
        def my_route(db: Session = Depends(get_db)):
            ...
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()