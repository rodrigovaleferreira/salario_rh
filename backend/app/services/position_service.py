# backend/app/services/position_service.py

from sqlalchemy.orm import Session
from typing import Optional, List
from uuid import UUID

from app.repositories.position_repository import PositionRepository
from app.repositories.audit_repository import AuditRepository
from app.schemas.position import (
    PositionCreate, PositionUpdate,
    PositionResponse, PositionTreeNode,
)
from app.models.user import User
from app.models.position import Position, SeniorityLevel


class PositionService:

    def __init__(self, db: Session):
        self.db = db
        self.repo = PositionRepository(db)
        self.audit = AuditRepository(db)

    def list(
        self,
        current_user: User,
        department: Optional[str] = None,
        seniority: Optional[SeniorityLevel] = None,
        search: Optional[str] = None,
    ) -> List[PositionResponse]:
        positions = self.repo.list(
            company_id=current_user.company_id,
            department=department,
            seniority=seniority,
            search=search,
        )
        return [PositionResponse.model_validate(p) for p in positions]

    def get_departments(self, current_user: User) -> List[str]:
        return self.repo.get_departments(current_user.company_id)

    def create(
        self,
        data: PositionCreate,
        current_user: User,
    ) -> PositionResponse:
        # Valida parent_id se informado
        if data.parent_id:
            parent = self.repo.get_by_id(
                data.parent_id, current_user.company_id
            )
            if not parent:
                raise ValueError("Cargo pai não encontrado")

        position = self.repo.create(data, current_user.company_id)

        self.audit.log(
            action="position.created",
            user_id=current_user.id,
            company_id=current_user.company_id,
            resource_type="position",
            resource_id=str(position.id),
            details={"title": position.title},
        )
        return PositionResponse.model_validate(position)

    def update(
        self,
        position_id: UUID,
        data: PositionUpdate,
        current_user: User,
    ) -> PositionResponse:
        position = self.repo.get_by_id(position_id, current_user.company_id)
        if not position:
            raise ValueError("Cargo não encontrado")

        updated = self.repo.update(position, data)

        self.audit.log(
            action="position.updated",
            user_id=current_user.id,
            company_id=current_user.company_id,
            resource_type="position",
            resource_id=str(position_id),
            details=data.model_dump(exclude_unset=True),
        )
        return PositionResponse.model_validate(updated)

    def deactivate(
        self,
        position_id: UUID,
        current_user: User,
    ) -> None:
        position = self.repo.get_by_id(position_id, current_user.company_id)
        if not position:
            raise ValueError("Cargo não encontrado")

        self.repo.deactivate(position)

        self.audit.log(
            action="position.deactivated",
            user_id=current_user.id,
            company_id=current_user.company_id,
            resource_type="position",
            resource_id=str(position_id),
        )

    def get_tree(self, current_user: User) -> List[PositionTreeNode]:
        """
        Monta árvore hierárquica de cargos.
        Cargos sem parent ficam na raiz.
        """
        positions = self.repo.list(company_id=current_user.company_id)
        return self._build_tree(positions, parent_id=None)

    def _build_tree(
        self,
        positions: List[Position],
        parent_id,
    ) -> List[PositionTreeNode]:
        nodes = []
        for p in positions:
            if str(p.parent_id) == str(parent_id) or (
                p.parent_id is None and parent_id is None
            ):
                node = PositionTreeNode(
                    id=p.id,
                    title=p.title,
                    seniority=p.seniority,
                    department=p.department,
                    hierarchy_level=p.hierarchy_level,
                    children=self._build_tree(positions, p.id),
                )
                nodes.append(node)
        return nodes