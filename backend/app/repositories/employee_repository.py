# backend/app/repositories/employee_repository.py

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, func, and_
from typing import Optional, List
from uuid import UUID
from decimal import Decimal

from app.models.employee import Employee
from app.models.position import Position
from app.schemas.employee import EmployeeCreate, EmployeeUpdate


class EmployeeRepository:

    def __init__(self, db: Session):
        self.db = db

    def get_by_id(
        self, employee_id: UUID, company_id: UUID
    ) -> Optional[Employee]:
        stmt = (
            select(Employee)
            .where(
                Employee.id == employee_id,
                Employee.company_id == company_id,
            )
            .options(joinedload(Employee.position))
        )
        return self.db.scalar(stmt)

    def list(
        self,
        company_id: UUID,
        department: Optional[str] = None,
        position_id: Optional[UUID] = None,
        is_active: bool = True,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 50,
    ) -> tuple[List[Employee], int]:
        """Retorna lista paginada + total."""
        base = (
            select(Employee)
            .where(
                Employee.company_id == company_id,
                Employee.is_active == is_active,
            )
            .options(joinedload(Employee.position))
        )

        if department:
            base = base.where(Employee.department == department)
        if position_id:
            base = base.where(Employee.position_id == position_id)
        if search:
            term = f"%{search.strip().lower()}%"
            base = base.where(
                Employee.name.ilike(term)
            )

        # Total
        count_stmt = select(func.count()).select_from(
            base.subquery()
        )
        total = self.db.scalar(count_stmt) or 0

        # Paginação
        stmt = (
            base
            .order_by(Employee.name)
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        employees = list(self.db.scalars(stmt).unique().all())
        return employees, total

    def create(
        self, data: EmployeeCreate, company_id: UUID
    ) -> Employee:
        employee = Employee(
            name=data.name.strip(),
            registration=data.registration,
            department=data.department,
            cost_center=data.cost_center,
            manager_name=data.manager_name,
            current_salary=data.current_salary,
            hire_date=data.hire_date,
            last_salary_review=data.last_salary_review,
            position_id=data.position_id,
            company_id=company_id,
        )
        self.db.add(employee)
        self.db.commit()
        self.db.refresh(employee)
        return employee

    def update(
        self, employee: Employee, data: EmployeeUpdate
    ) -> Employee:
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(employee, field, value)
        self.db.commit()
        self.db.refresh(employee)
        return employee

    def deactivate(self, employee: Employee) -> None:
        employee.is_active = False
        self.db.commit()

    def get_headcount_by_department(
        self, company_id: UUID
    ) -> List[dict]:
        stmt = (
            select(
                Employee.department,
                func.count(Employee.id).label("headcount"),
                func.avg(Employee.current_salary).label("avg_salary"),
                func.sum(Employee.current_salary).label("total_payroll"),
            )
            .where(
                Employee.company_id == company_id,
                Employee.is_active == True,
            )
            .group_by(Employee.department)
            .order_by(func.count(Employee.id).desc())
        )
        return [r._asdict() for r in self.db.execute(stmt).fetchall()]

    def get_salary_histogram(
        self, company_id: UUID, buckets: int = 8
    ) -> List[dict]:
        """
        Distribuição de frequência salarial em faixas.
        Divide o range em buckets iguais.
        """
        # Min e max da empresa
        minmax = self.db.execute(
            select(
                func.min(Employee.current_salary),
                func.max(Employee.current_salary),
            ).where(
                Employee.company_id == company_id,
                Employee.is_active == True,
            )
        ).fetchone()

        if not minmax or not minmax[0]:
            return []

        sal_min = float(minmax[0])
        sal_max = float(minmax[1])
        bucket_size = (sal_max - sal_min) / buckets or 1

        result = []
        for i in range(buckets):
            low  = sal_min + i * bucket_size
            high = sal_min + (i + 1) * bucket_size

            count = self.db.scalar(
                select(func.count(Employee.id)).where(
                    Employee.company_id == company_id,
                    Employee.is_active == True,
                    Employee.current_salary >= Decimal(str(round(low, 2))),
                    Employee.current_salary < Decimal(str(round(high, 2))),
                )
            ) or 0

            result.append({
                "range_label": f"R${low/1000:.0f}k–R${high/1000:.0f}k",
                "low": round(low, 2),
                "high": round(high, 2),
                "count": count,
            })

        return result