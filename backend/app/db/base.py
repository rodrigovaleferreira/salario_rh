# backend/app/db/base.py

from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import Column, DateTime, func


class Base(DeclarativeBase):
    """
    Base para todos os models.
    Adiciona created_at e updated_at automaticamente.
    """
    pass


class TimestampMixin:
    """
    Mixin reutilizável — adiciona timestamps em qualquer model.
    server_default=func.now() → o banco gera o valor, não o Python.
    """
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )