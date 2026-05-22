# backend/app/repositories/salary_repository.py

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, func, and_
from typing import Optional, List
from uuid import UUID
from decimal import Decimal

from app.models.employee import Employee
from app.models.position import Position
from app.models.salary_band import SalaryBand
from app.schemas.salary import SalaryBandCreate


class SalaryRepository:

    def __init__(self, db: Session):
        self.db = db

    # ── Salary Bands ─────────────────────────────────────────────

    def get_band_by_position(
        self, position_id: UUID, company_id: UUID
    ) -> Optional[SalaryBand]:
        stmt = select(SalaryBand).where(
            SalaryBand.position_id == position_id,
            SalaryBand.company_id == company_id,
        )
        return self.db.scalar(stmt)

    def get_all_bands(self, company_id: UUID) -> List[SalaryBand]:
        stmt = (
            select(SalaryBand)
            .where(SalaryBand.company_id == company_id)
            .options(joinedload(SalaryBand.position))
            .order_by(SalaryBand.salary_midpoint)
        )
        return list(self.db.scalars(stmt).unique().all())

    def create_band(
        self, data: SalaryBandCreate, company_id: UUID
    ) -> SalaryBand:
        """Cria faixa calculando range_spread automaticamente."""
        spread = (
            (data.salary_max - data.salary_min) / data.salary_min * 100
        ).quantize(Decimal("0.01"))

        band = SalaryBand(
            position_id=data.position_id,
            company_id=company_id,
            salary_min=data.salary_min,
            salary_midpoint=data.salary_midpoint,
            salary_max=data.salary_max,
            range_spread=spread,
            market_p25=data.market_p25,
            market_p50=data.market_p50,
            market_p75=data.market_p75,
            currency=data.currency,
        )
        self.db.add(band)
        self.db.commit()
        self.db.refresh(band)
        return band

    def update_band(
        self, band: SalaryBand, data: SalaryBandCreate
    ) -> SalaryBand:
        band.salary_min = data.salary_min
        band.salary_midpoint = data.salary_midpoint
        band.salary_max = data.salary_max
        band.range_spread = (
            (data.salary_max - data.salary_min) / data.salary_min * 100
        ).quantize(Decimal("0.01"))
        band.market_p50 = data.market_p50
        band.version += 1
        self.db.commit()
        self.db.refresh(band)
        return band

    # ── Employees com dados de cargo ──────────────────────────────

    def get_employees_with_positions(
        self,
        company_id: UUID,
        department: Optional[str] = None,
    ) -> List[Employee]:
        """
        Join em uma query — evita N+1.
        Carrega Employee + Position + SalaryBand de uma vez.
        """
        stmt = (
            select(Employee)
            .where(
                Employee.company_id == company_id,
                Employee.is_active == True,
            )
            .options(
                joinedload(Employee.position).joinedload(Position.salary_band)
            )
        )
        if department:
            stmt = stmt.where(
                Employee.department == department
            )

        return list(self.db.scalars(stmt).unique().all())

    def get_salary_aggregates_by_department(
        self, company_id: UUID
    ) -> List[dict]:
        """
        Agrega salários por departamento direto no banco.
        Mais eficiente que trazer todos os registros e calcular em Python.
        """
        stmt = (
            select(
                Employee.department,
                func.count(Employee.id).label("headcount"),
                func.avg(Employee.current_salary).label("avg_salary"),
                func.min(Employee.current_salary).label("min_salary"),
                func.max(Employee.current_salary).label("max_salary"),
                func.sum(Employee.current_salary).label("total_payroll"),
            )
            .where(
                Employee.company_id == company_id,
                Employee.is_active == True,
            )
            .group_by(Employee.department)
            .order_by(func.avg(Employee.current_salary).desc())
        )
        rows = self.db.execute(stmt).fetchall()
        return [row._asdict() for row in rows]

    def get_salary_aggregates_by_position(
        self, company_id: UUID
    ) -> List[dict]:
        stmt = (
            select(
                Position.title,
                Position.seniority,
                Position.department,
                func.count(Employee.id).label("headcount"),
                func.avg(Employee.current_salary).label("avg_salary"),
                func.min(Employee.current_salary).label("min_salary"),
                func.max(Employee.current_salary).label("max_salary"),
            )
            .join(Employee, Employee.position_id == Position.id)
            .where(
                Employee.company_id == company_id,
                Employee.is_active == True,
            )
            .group_by(Position.id, Position.title, Position.seniority, Position.department)
            .order_by(func.avg(Employee.current_salary).desc())
        )
        rows = self.db.execute(stmt).fetchall()
        return [row._asdict() for row in rows]