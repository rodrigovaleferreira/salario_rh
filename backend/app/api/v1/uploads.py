# backend/app/api/v1/uploads.py

from fastapi import (
    APIRouter, Depends, UploadFile, File,
    HTTPException, status, Request
)
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.services.upload_service import UploadService
from app.services.upload_validator import UploadValidationError
from app.schemas.upload import (
    ColumnDetectionResult, UploadPreviewRequest, UploadResult
)
from app.core.middleware import limiter

router = APIRouter(prefix="/uploads", tags=["Upload de Planilhas"])


@router.post(
    "/",
    response_model=ColumnDetectionResult,
    status_code=status.HTTP_201_CREATED,
)
@limiter.limit("10/minute")
async def upload_spreadsheet(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Etapa 1 — Upload e detecção de colunas.
    
    Fluxo:
    1. Valida arquivo (extensão, MIME, tamanho)
    2. Salva em staging
    3. Detecta colunas automaticamente
    4. Retorna preview para o usuário confirmar mapeamento
    
    Segurança:
    - Máximo 10 uploads/min por IP
    - Validação de MIME type real (não confia no browser)
    - Sanitização de nome de arquivo
    - Proteção contra path traversal
    """
    service = UploadService(db)

    try:
        result = await service.handle_upload(file, current_user)
        return result
    except UploadValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=e.message,
        )


@router.post(
    "/confirm",
    response_model=UploadResult,
)
@limiter.limit("10/minute")
async def confirm_import(
    request: Request,
    data: UploadPreviewRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Etapa 2 — Confirma mapeamento e executa importação.
    
    O usuário revisa o mapeamento automático,
    ajusta se necessário, e confirma a importação.
    Erros são retornados por linha — não cancela importação inteira.
    """
    service = UploadService(db)

    try:
        result = service.confirm_import(
            file_id=data.file_id,
            mappings=data.column_mappings,
            current_user=current_user,
        )
        return result
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )