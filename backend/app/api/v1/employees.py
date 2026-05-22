# backend/app/api/v1/employees.py

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID

from app.db.session import get_db
from app.api.deps import get_current_user, require_role
from app.models.user import User, UserRole
from app.services.employee_service import EmployeeService
from app.services.diagnostic_service import DiagnosticService
from app.schemas.employee import (
    EmployeeCreate, EmployeeUpdate, EmployeeResponse,
)

router = APIRouter(prefix="/employees", tags=["Colaboradores"])


@router.get("/")
async def list_employees(
    department: Optional[str] = Query(default=None, max_length=100),
    position_id: Optional[UUID] = Query(default=None),
    search: Optional[str] = Query(default=None, max_length=100),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = EmployeeService(db)
    return service.list(
        current_user=current_user,
        department=department,
        position_id=position_id,
        search=search,
        page=page,
        page_size=page_size,
    )


@router.post("/", response_model=EmployeeResponse, status_code=201)
async def create_employee(
    data: EmployeeCreate,
    current_user: User = Depends(
        require_role(UserRole.ADMIN, UserRole.CONSULTANT)
    ),
    db: Session = Depends(get_db),
):
    service = EmployeeService(db)
    try:
        return service.create(data, current_user)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/{employee_id}", response_model=EmployeeResponse)
async def update_employee(
    employee_id: UUID,
    data: EmployeeUpdate,
    current_user: User = Depends(
        require_role(UserRole.ADMIN, UserRole.CONSULTANT)
    ),
    db: Session = Depends(get_db),
):
    service = EmployeeService(db)
    try:
        return service.update(employee_id, data, current_user)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{employee_id}", status_code=204)
async def deactivate_employee(
    employee_id: UUID,
    current_user: User = Depends(
        require_role(UserRole.ADMIN, UserRole.CONSULTANT)
    ),
    db: Session = Depends(get_db),
):
    service = EmployeeService(db)
    try:
        service.deactivate(employee_id, current_user)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/headcount-by-department")
async def headcount_by_department(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = EmployeeService(db)
    return service.get_headcount_by_department(current_user)


@router.get("/salary-histogram")
async def salary_histogram(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = EmployeeService(db)
    return service.get_salary_histogram(current_user)


@router.get("/diagnostic")
async def get_diagnostic(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Diagnóstico organizacional completo.
    Cruza análises salariais, hierárquicas e de headcount.
    Gera score de saúde + issues + warnings + recomendações.
    """
    service = DiagnosticService(db)
    return service.generate(current_user)