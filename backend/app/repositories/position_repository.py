# backend/app/repositories/position_repository.py

from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import Optional, List
from uuid import UUID

from app.models.position import Position, SeniorityLevel
from app.schemas.position import PositionCreate, PositionUpdate


class PositionRepository:

    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, position_id: UUID, company_id: UUID) -> Optional[Position]:
        stmt = select(Position).where(
            Position.id == position_id,
            Position.company_id == company_id,
        )
        return self.db.scalar(stmt)

    def list(
        self,
        company_id: UUID,
        department: Optional[str] = None,
        seniority: Optional[SeniorityLevel] = None,
        is_active: bool = True,
        search: Optional[str] = None,
    ) -> List[Position]:
        stmt = select(Position).where(
            Position.company_id == company_id,
            Position.is_active == is_active,
        )
        if department:
            stmt = stmt.where(Position.department == department)
        if seniority:
            stmt = stmt.where(Position.seniority == seniority)
        if search:
            search_term = f"%{search.lower().strip()}%"
            stmt = stmt.where(
                Position.title_normalized.like(search_term)
            )
        stmt = stmt.order_by(
            Position.hierarchy_level,
            Position.department,
            Position.title,
        )
        return list(self.db.scalars(stmt).all())

    def get_departments(self, company_id: UUID) -> List[str]:
        """Lista departamentos únicos — para filtros."""
        from sqlalchemy import distinct
        stmt = (
            select(distinct(Position.department))
            .where(
                Position.company_id == company_id,
                Position.is_active == True,
            )
            .order_by(Position.department)
        )
        return list(self.db.scalars(stmt).all())

    def create(self, data: PositionCreate, company_id: UUID) -> Position:
        import re
        title_normalized = " ".join(
            re.sub(r"[^a-z0-9 ]", "", data.title.lower()).split()
        )
        position = Position(
            title=data.title.strip(),
            title_normalized=title_normalized,
            seniority=data.seniority,
            department=data.department.strip(),
            area=data.area,
            cost_center=data.cost_center,
            hierarchy_level=data.hierarchy_level,
            parent_id=data.parent_id,
            description=data.description,
            code=data.code,
            company_id=company_id,
        )
        self.db.add(position)
        self.db.commit()
        self.db.refresh(position)
        return position

    def update(self, position: Position, data: PositionUpdate) -> Position:
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(position, field, value)
        # Renormaliza título se foi alterado
        if "title" in update_data:
            import re
            position.title_normalized = " ".join(
                re.sub(r"[^a-z0-9 ]", "", position.title.lower()).split()
            )
        self.db.commit()
        self.db.refresh(position)
        return position

    def deactivate(self, position: Position) -> None:
        position.is_active = False
        self.db.commit()