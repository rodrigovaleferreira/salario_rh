# backend/app/models/audit_log.py

import uuid
from sqlalchemy import Column, String, ForeignKey, JSON, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base import Base, TimestampMixin


class AuditLog(Base, TimestampMixin):
    """
    Log de auditoria — registro imutável de ações.
    NUNCA deletar ou editar registros desta tabela.
    Cobre: login, upload, edição de cargos, acesso a relatórios.
    """
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # O que aconteceu
    action = Column(String(100), nullable=False, index=True)
    # Ex: "user.login", "upload.create", "position.update", "report.export"

    # Em qual entidade
    resource_type = Column(String(100), nullable=True)  # Ex: "position"
    resource_id = Column(String(100), nullable=True)    # Ex: UUID do cargo

    # Detalhes da ação (diff de dados, resultado)
    details = Column(JSON, nullable=True)

    # Contexto da requisição
    ip_address = Column(String(45), nullable=True)   # IPv4/IPv6
    user_agent = Column(Text, nullable=True)

    # Quem fez
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    company_id = Column(
        UUID(as_uuid=True),
        nullable=True,
        index=True
    )

    # Relacionamentos
    user = relationship("User", back_populates="audit_logs")

    def __repr__(self):
        return f"<AuditLog {self.action} by user={self.user_id}>"