# backend/app/repositories/user_repository.py

from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import Optional
from uuid import UUID
from app.models.user import User, UserRole
from app.schemas.user import UserCreate
from app.core.security import hash_password


class UserRepository:
    """
    Toda query relacionada a User passa por aqui.
    Nunca acessar db.query(User) fora desta classe.
    """

    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, user_id: UUID) -> Optional[User]:
        stmt = select(User).where(
            User.id == user_id,
            User.is_active == True
        )
        return self.db.scalar(stmt)

    def get_by_email(self, email: str) -> Optional[User]:
        """
        Busca case-insensitive — evita duplicidade por capitalização.
        Nunca retornar erro diferente para email inexistente vs senha errada
        (previne enumeração de usuários).
        """
        stmt = select(User).where(
            User.email == email.lower().strip()
        )
        return self.db.scalar(stmt)

    def get_by_company(self, company_id: UUID) -> list[User]:
        stmt = select(User).where(
            User.company_id == company_id,
            User.is_active == True
        )
        return list(self.db.scalars(stmt).all())

    def create(self, data: UserCreate) -> User:
        user = User(
            email=data.email.lower().strip(),
            password_hash=hash_password(data.password),
            full_name=data.full_name.strip(),
            role=data.role,
            company_id=data.company_id,
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def update_last_login(self, user: User) -> None:
        """Atualiza timestamp sem expor dados desnecessários."""
        from datetime import datetime, timezone
        user.updated_at = datetime.now(timezone.utc)
        self.db.commit()

    def deactivate(self, user_id: UUID) -> bool:
        user = self.get_by_id(user_id)
        if not user:
            return False
        user.is_active = False
        self.db.commit()
        return True

    def email_exists(self, email: str) -> bool:
        """
        Verifica existência sem retornar o objeto inteiro.
        Usado no cadastro para evitar duplicidade.
        """
        stmt = select(User.id).where(
            User.email == email.lower().strip()
        )
        return self.db.scalar(stmt) is not None