# backend/app/services/employee_service.py

from sqlalchemy.orm import Session
from typing import Optional, List
from uuid import UUID

from app.repositories.employee_repository import EmployeeRepository
from app.repositories.position_repository import PositionRepository
from app.repositories.audit_repository import AuditRepository
from app.schemas.employee import (
    EmployeeCreate, EmployeeUpdate,
    EmployeeResponse, EmployeeWithAnalysis,
)
from app.models.user import User


class EmployeeService:

    def __init__(self, db: Session):
        self.db = db
        self.repo     = EmployeeRepository(db)
        self.pos_repo = PositionRepository(db)
        self.audit    = AuditRepository(db)

    def list(
        self,
        current_user: User,
        department: Optional[str] = None,
        position_id: Optional[UUID] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 50,
    ) -> dict:
        employees, total = self.repo.list(
            company_id=current_user.company_id,
            department=department,
            position_id=position_id,
            search=search,
            page=page,
            page_size=page_size,
        )

        items = []
        for emp in employees:
            data = EmployeeResponse.model_validate(emp)
            if emp.position:
                data.position_title    = emp.position.title
                data.position_seniority = emp.position.seniority.value
            items.append(data)

        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "pages": -(-total // page_size),  # ceil division
        }

    def create(
        self,
        data: EmployeeCreate,
        current_user: User,
    ) -> EmployeeResponse:
        # Ownership do cargo
        position = self.pos_repo.get_by_id(
            data.position_id, current_user.company_id
        )
        if not position:
            raise ValueError("Cargo não encontrado")

        employee = self.repo.create(data, current_user.company_id)

        self.audit.log(
            action="employee.created",
            user_id=current_user.id,
            company_id=current_user.company_id,
            resource_type="employee",
            resource_id=str(employee.id),
            details={"name": employee.name},
        )

        resp = EmployeeResponse.model_validate(employee)
        resp.position_title = position.title
        resp.position_seniority = position.seniority.value
        return resp

    def update(
        self,
        employee_id: UUID,
        data: EmployeeUpdate,
        current_user: User,
    ) -> EmployeeResponse:
        employee = self.repo.get_by_id(employee_id, current_user.company_id)
        if not employee:
            raise ValueError("Colaborador não encontrado")

        if data.position_id:
            pos = self.pos_repo.get_by_id(
                data.position_id, current_user.company_id
            )
            if not pos:
                raise ValueError("Cargo não encontrado")

        updated = self.repo.update(employee, data)

        self.audit.log(
            action="employee.updated",
            user_id=current_user.id,
            company_id=current_user.company_id,
            resource_type="employee",
            resource_id=str(employee_id),
            details=data.model_dump(exclude_unset=True),
        )

        resp = EmployeeResponse.model_validate(updated)
        if updated.position:
            resp.position_title     = updated.position.title
            resp.position_seniority = updated.position.seniority.value
        return resp

    def deactivate(self, employee_id: UUID, current_user: User) -> None:
        employee = self.repo.get_by_id(employee_id, current_user.company_id)
        if not employee:
            raise ValueError("Colaborador não encontrado")
        self.repo.deactivate(employee)
        self.audit.log(
            action="employee.deactivated",
            user_id=current_user.id,
            company_id=current_user.company_id,
            resource_type="employee",
            resource_id=str(employee_id),
        )

    def get_headcount_by_department(self, current_user: User) -> List[dict]:
        return self.repo.get_headcount_by_department(current_user.company_id)

    def get_salary_histogram(self, current_user: User) -> List[dict]:
        return self.repo.get_salary_histogram(current_user.company_id)