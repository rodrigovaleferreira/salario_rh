# backend/app/schemas/upload.py

from pydantic import BaseModel, UUID4
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class UploadStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    SUCCESS = "success"
    PARTIAL = "partial"    # Importou com erros em algumas linhas
    FAILED = "failed"


class ColumnMapping(BaseModel):
    """
    Mapeamento de colunas da planilha para campos do sistema.
    O usuário confirma/ajusta antes de importar.
    """
    source_column: str      # Nome da coluna na planilha
    target_field: str       # Campo no sistema
    is_required: bool = False


class UploadPreviewRequest(BaseModel):
    """Solicita preview antes de confirmar importação."""
    file_id: str            # ID temporário do arquivo já validado
    column_mappings: List[ColumnMapping]


class RowError(BaseModel):
    """Erro em uma linha específica da planilha."""
    row_number: int
    column: Optional[str]
    value: Optional[str]
    reason: str


class UploadResult(BaseModel):
    """Resultado completo do processo de importação."""
    file_id: str
    status: UploadStatus
    total_rows: int
    imported_rows: int
    skipped_rows: int
    errors: List[RowError] = []
    warnings: List[str] = []
    created_at: datetime


class ColumnDetectionResult(BaseModel):
    """
    Resultado da detecção automática de colunas.
    Retornado após upload — usuário confirma mapeamento.
    """
    file_id: str
    detected_columns: List[str]
    suggested_mappings: List[ColumnMapping]
    preview_rows: List[Dict[str, Any]]  # Primeiras 5 linhas para preview
    total_rows: int


# Campos aceitos pelo sistema para importação de colaboradores
VALID_TARGET_FIELDS = {
    "name": "Nome do colaborador",
    "registration": "Matrícula",
    "department": "Departamento",
    "position_title": "Cargo",
    "current_salary": "Salário atual",
    "hire_date": "Data de admissão",
    "cost_center": "Centro de custo",
    "manager_name": "Nome do gestor",
}