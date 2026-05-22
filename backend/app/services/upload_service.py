# backend/app/services/upload_service.py

import os
import uuid
import json
from pathlib import Path
from typing import List
from sqlalchemy.orm import Session
from fastapi import UploadFile

from app.core.config import settings
from app.services.upload_validator import UploadValidator, UploadValidationError
from app.services.spreadsheet_parser import SpreadsheetParser
from app.repositories.audit_repository import AuditRepository
from app.schemas.upload import (
    ColumnDetectionResult, ColumnMapping,
    UploadResult, UploadStatus, RowError
)
from app.models.user import User
from app.models.employee import Employee
from app.models.position import Position
from sqlalchemy import select


class UploadService:

    def __init__(self, db: Session):
        self.db = db
        self.audit = AuditRepository(db)
        self.upload_dir = Path(settings.UPLOAD_DIR)
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    async def handle_upload(
        self,
        file: UploadFile,
        current_user: User,
    ) -> ColumnDetectionResult:
        """
        Etapa 1 do upload: valida e detecta colunas.
        Arquivo fica em staging — aguarda confirmação do mapeamento.
        
        Retorna preview para o usuário confirmar antes de importar.
        """
        company_id = str(current_user.company_id)

        try:
            # Validação completa em múltiplas camadas
            content, safe_filename, extension = await UploadValidator.validate_all(
                file, company_id
            )
        except UploadValidationError as e:
            self.audit.log(
                action="upload.validation.failed",
                user_id=current_user.id,
                company_id=current_user.company_id,
                details={"reason": e.message, "filename": file.filename},
            )
            raise

        # Salva em pasta staging — ainda não confirmado
        staging_dir = self.upload_dir / "staging" / company_id
        staging_dir.mkdir(parents=True, exist_ok=True)

        file_path = staging_dir / safe_filename
        file_path.write_bytes(content)

        # Gera ID temporário para referenciar o arquivo
        file_id = str(uuid.uuid4())

        # Salva metadados em arquivo JSON temporário
        meta_path = staging_dir / f"{file_id}.meta.json"
        meta_path.write_text(json.dumps({
            "file_id": file_id,
            "safe_filename": safe_filename,
            "extension": extension,
            "company_id": company_id,
            "user_id": str(current_user.id),
        }))

        # Detecta colunas para preview
        result = SpreadsheetParser.detect_columns(content, extension, file_id)

        self.audit.log(
            action="upload.staging.created",
            user_id=current_user.id,
            company_id=current_user.company_id,
            details={
                "file_id": file_id,
                "total_rows": result.total_rows,
                "columns": result.detected_columns,
            },
        )

        return result

    def confirm_import(
        self,
        file_id: str,
        mappings: List[ColumnMapping],
        current_user: User,
    ) -> UploadResult:
        """
        Etapa 2: usuário confirma mapeamento e importação é executada.
        Valida ownership — usuário só pode importar seus próprios uploads.
        """
        company_id = str(current_user.company_id)
        staging_dir = self.upload_dir / "staging" / company_id

        # Valida que o file_id pertence a esta empresa
        meta_path = staging_dir / f"{file_id}.meta.json"
        if not meta_path.exists():
            raise ValueError("Upload não encontrado ou expirado")

        meta = json.loads(meta_path.read_text())

        # Ownership check — mesmo com file_id válido, verifica empresa
        if meta["company_id"] != company_id:
            self.audit.log(
                action="upload.ownership.violation",
                user_id=current_user.id,
                company_id=current_user.company_id,
                details={"file_id": file_id},
            )
            raise PermissionError("Acesso negado a este arquivo")

        # Lê arquivo do staging
        file_path = staging_dir / meta["safe_filename"]
        if not file_path.exists():
            raise ValueError("Arquivo de staging não encontrado")

        content = file_path.read_bytes()
        extension = meta["extension"]

        # Parse com mapeamento confirmado pelo usuário
        valid_rows, errors = SpreadsheetParser.parse_employees(
            content, extension, mappings
        )

        # Persiste colaboradores válidos
        imported = 0
        for row_data in valid_rows:
            try:
                self._save_employee(row_data, current_user)
                imported += 1
            except Exception as e:
                errors.append(RowError(
                    row_number=0,
                    column=None,
                    value=str(row_data.get("name", "")),
                    reason=f"Erro ao salvar: {str(e)[:100]}",
                ))

        # Determina status final
        if imported == 0 and errors:
            final_status = UploadStatus.FAILED
        elif errors:
            final_status = UploadStatus.PARTIAL
        else:
            final_status = UploadStatus.SUCCESS

        # Move arquivo de staging para processados
        self._move_to_processed(file_path, meta_path, company_id)

        result = UploadResult(
            file_id=file_id,
            status=final_status,
            total_rows=len(valid_rows) + len(errors),
            imported_rows=imported,
            skipped_rows=len(errors),
            errors=errors[:50],  # Limita a 50 erros na resposta
            created_at=__import__("datetime").datetime.now(__import__("datetime").timezone.utc),
        )

        self.audit.log(
            action="upload.import.completed",
            user_id=current_user.id,
            company_id=current_user.company_id,
            details={
                "file_id": file_id,
                "status": final_status,
                "imported": imported,
                "errors": len(errors),
            },
        )

        return result

    def _save_employee(self, row_data: dict, current_user: User) -> None:
        """
        Salva ou atualiza colaborador.
        Upsert por matrícula — evita duplicatas.
        """
        registration = row_data.get("registration")
        existing = None

        if registration:
            stmt = select(Employee).where(
                Employee.registration == registration,
                Employee.company_id == current_user.company_id,
            )
            existing = self.db.scalar(stmt)

        if existing:
            # Atualiza dados existentes
            for field, value in row_data.items():
                if hasattr(existing, field) and value is not None:
                    setattr(existing, field, value)
        else:
            # Busca ou cria position pelo título
            position = self._get_or_create_position(
                row_data.get("position_title", "Não informado"),
                row_data.get("department", "Não informado"),
                current_user,
            )
            employee = Employee(
                name=row_data.get("name", ""),
                registration=registration,
                department=row_data.get("department"),
                cost_center=row_data.get("cost_center"),
                manager_name=row_data.get("manager_name"),
                current_salary=row_data.get("current_salary", 0),
                hire_date=row_data.get("hire_date"),
                position_id=position.id,
                company_id=current_user.company_id,
            )
            self.db.add(employee)

        self.db.commit()

    def _get_or_create_position(
        self,
        title: str,
        department: str,
        current_user: User,
    ) -> Position:
        """
        Busca cargo pelo título normalizado ou cria novo.
        Normalização: lowercase + sem espaços duplos.
        """
        from app.models.position import SeniorityLevel
        title_normalized = " ".join(title.lower().split())

        stmt = select(Position).where(
            Position.title_normalized == title_normalized,
            Position.company_id == current_user.company_id,
        )
        position = self.db.scalar(stmt)

        if not position:
            position = Position(
                title=title,
                title_normalized=title_normalized,
                department=department,
                seniority=SeniorityLevel.MID,  # Default — usuário ajusta depois
                company_id=current_user.company_id,
            )
            self.db.add(position)
            self.db.commit()
            self.db.refresh(position)

        return position

    def _move_to_processed(
        self,
        file_path: Path,
        meta_path: Path,
        company_id: str,
    ) -> None:
        """Move arquivos do staging para processados após importação."""
        processed_dir = self.upload_dir / "processed" / company_id
        processed_dir.mkdir(parents=True, exist_ok=True)

        try:
            file_path.rename(processed_dir / file_path.name)
            meta_path.unlink(missing_ok=True)
        except Exception:
            pass  # Falha no cleanup não deve impedir o retorno do resultado