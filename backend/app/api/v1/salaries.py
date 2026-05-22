# backend/app/api/v1/salaries.py

from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from typing import Optional, List
from uuid import UUID

from app.db.session import get_db
from app.api.deps import get_current_user, require_role, verify_company_ownership
from app.models.user import User, UserRole
from app.services.salary_service import SalaryService
from app.schemas.salary import (
    SalaryBandCreate, SalaryBandResponse, SalaryAnalysisResult
)
from app.core.middleware import limiter

router = APIRouter(prefix="/salaries", tags=["Análise Salarial"])


@router.post(
    "/bands",
    response_model=SalaryBandResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_salary_band(
    data: SalaryBandCreate,
    current_user: User = Depends(
        require_role(UserRole.ADMIN, UserRole.CONSULTANT)
    ),
    db: Session = Depends(get_db),
):
    """
    Cria ou atualiza faixa salarial de um cargo.
    Apenas Admin e Consultor podem definir faixas.
    """
    service = SalaryService(db)
    try:
        return service.create_band(data, current_user)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/bands", response_model=List[SalaryBandResponse])
async def list_salary_bands(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lista todas as faixas salariais da empresa."""
    repo = __import__(
        "app.repositories.salary_repository",
        fromlist=["SalaryRepository"]
    ).SalaryRepository(db)
    bands = repo.get_all_bands(current_user.company_id)
    return [SalaryBandResponse.model_validate(b) for b in bands]


@router.post("/bands/auto-calculate", response_model=List[SalaryBandResponse])
async def auto_calculate_bands(
    spread_percent: int = Query(default=50, ge=20, le=100),
    current_user: User = Depends(
        require_role(UserRole.ADMIN, UserRole.CONSULTANT)
    ),
    db: Session = Depends(get_db),
):
    """
    Calcula faixas automaticamente baseado nos salários existentes.
    spread_percent: amplitude da faixa (20% a 100%).
    """
    service = SalaryService(db)
    return service.auto_calculate_bands(
        current_user.company_id, current_user, spread_percent
    )


@router.get("/analysis", response_model=List[SalaryAnalysisResult])
async def analyze_salaries(
    department: Optional[str] = Query(default=None, max_length=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Análise individual de cada colaborador vs sua faixa salarial.
    Retorna compa-ratio, posição na faixa e flag de criticidade.
    Filtrável por departamento.
    """
    service = SalaryService(db)
    return service.analyze_employees(
        current_user.company_id, department
    )


@router.get("/summary")
async def salary_summary(
    department: Optional[str] = Query(default=None, max_length=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Resumo estatístico: média, mediana, desvio padrão,
    percentis e distribuição por faixa.
    """
    service = SalaryService(db)
    return service.get_statistical_summary(
        current_user.company_id, department
    )


@router.get("/compression")
async def detect_compression(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Detecta compressão salarial entre níveis hierárquicos.
    Identifica quando a diferença entre níveis é menor que 10%.
    """
    service = SalaryService(db)
    return service.detect_compression(current_user.company_id)


@router.get("/department-comparison")
async def department_comparison(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Compara médias salariais entre departamentos.
    Mostra desvio em relação à média geral da empresa.
    """
    service = SalaryService(db)
    return service.get_department_comparison(current_user.company_id)