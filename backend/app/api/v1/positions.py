# backend/app/api/v1/positions.py

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from uuid import UUID

from app.db.session import get_db
from app.api.deps import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.position import SeniorityLevel
from app.services.position_service import PositionService
from app.schemas.position import (
    PositionCreate, PositionUpdate,
    PositionResponse, PositionTreeNode,
)

router = APIRouter(prefix="/positions", tags=["Cargos"])


@router.get("/", response_model=List[PositionResponse])
async def list_positions(
    department: Optional[str] = Query(default=None, max_length=100),
    seniority: Optional[SeniorityLevel] = Query(default=None),
    search: Optional[str] = Query(default=None, max_length=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = PositionService(db)
    return service.list(current_user, department, seniority, search)


@router.get("/departments", response_model=List[str])
async def list_departments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = PositionService(db)
    return service.get_departments(current_user)


@router.get("/tree", response_model=List[PositionTreeNode])
async def get_tree(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = PositionService(db)
    return service.get_tree(current_user)


@router.get("/{position_id}", response_model=PositionResponse)
async def get_position(
    position_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from app.repositories.position_repository import PositionRepository
    repo = PositionRepository(db)
    position = repo.get_by_id(position_id, current_user.company_id)
    if not position:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cargo não encontrado",
        )
    return PositionResponse.model_validate(position)


@router.post("/", response_model=PositionResponse, status_code=201)
async def create_position(
    data: PositionCreate,
    current_user: User = Depends(
        require_role(UserRole.ADMIN, UserRole.CONSULTANT)
    ),
    db: Session = Depends(get_db),
):
    service = PositionService(db)
    try:
        return service.create(data, current_user)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/{position_id}", response_model=PositionResponse)
async def update_position(
    position_id: UUID,
    data: PositionUpdate,
    current_user: User = Depends(
        require_role(UserRole.ADMIN, UserRole.CONSULTANT)
    ),
    db: Session = Depends(get_db),
):
    service = PositionService(db)
    try:
        return service.update(position_id, data, current_user)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{position_id}", status_code=204)
async def deactivate_position(
    position_id: UUID,
    current_user: User = Depends(
        require_role(UserRole.ADMIN, UserRole.CONSULTANT)
    ),
    db: Session = Depends(get_db),
):
    service = PositionService(db)
    try:
        service.deactivate(position_id, current_user)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))