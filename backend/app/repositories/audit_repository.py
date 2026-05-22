# backend/app/repositories/audit_repository.py

from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID
from app.models.audit_log import AuditLog


class AuditRepository:

    def __init__(self, db: Session):
        self.db = db

    def log(
        self,
        action: str,
        user_id: Optional[UUID] = None,
        company_id: Optional[UUID] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        details: Optional[dict] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> AuditLog:
        """
        Registra ação no log de auditoria.
        
        Exemplos de action:
          "auth.login.success"
          "auth.login.failed"
          "upload.create"
          "position.update"
          "report.export"
          "salary.band.create"
        """
        entry = AuditLog(
            action=action,
            user_id=user_id,
            company_id=company_id,
            resource_type=resource_type,
            resource_id=str(resource_id) if resource_id else None,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        self.db.add(entry)
        self.db.commit()
        return entry