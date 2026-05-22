# backend/app/services/salary_service.py

import statistics
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Optional, Dict, Any, Tuple
from uuid import UUID
from sqlalchemy.orm import Session

from app.repositories.salary_repository import SalaryRepository
from app.repositories.audit_repository import AuditRepository
from app.schemas.salary import (
    SalaryBandCreate, SalaryBandResponse, SalaryAnalysisResult
)
from app.models.user import User
from app.models.employee import Employee
from app.models.position import Position
from app.models.salary_band import SalaryBand


# ── Limiares de distorção ─────────────────────────────────────────
BELOW_BAND_THRESHOLD = Decimal("0.90")   # < 90% do mínimo → abaixo da faixa
ABOVE_BAND_THRESHOLD = Decimal("1.10")   # > 110% do máximo → acima da faixa
CRITICAL_DEVIATION = Decimal("20")       # > 20% de desvio → crítico
COMPRESSION_THRESHOLD = Decimal("0.10")  # < 10% diferença entre níveis → compressão


def _to_decimal(value, places: int = 2) -> Decimal:
    """Converte qualquer número para Decimal com precisão."""
    return Decimal(str(value)).quantize(
        Decimal(f"0.{'0' * places}"),
        rounding=ROUND_HALF_UP
    )


class SalaryService:

    def __init__(self, db: Session):
        self.db = db
        self.repo = SalaryRepository(db)
        self.audit = AuditRepository(db)

    # ── Faixas Salariais ─────────────────────────────────────────

    def create_band(
        self,
        data: SalaryBandCreate,
        current_user: User,
    ) -> SalaryBandResponse:
        """
        Cria faixa salarial para um cargo.
        Valida que o cargo pertence à empresa do usuário.
        """
        from app.models.position import Position
        from sqlalchemy import select

        # Ownership check do cargo
        stmt = select(Position).where(
            Position.id == data.position_id,
            Position.company_id == current_user.company_id,
        )
        position = self.db.scalar(stmt)
        if not position:
            raise ValueError("Cargo não encontrado ou sem permissão")

        # Verifica se já existe faixa — se sim, atualiza
        existing = self.repo.get_band_by_position(
            data.position_id, current_user.company_id
        )

        if existing:
            band = self.repo.update_band(existing, data)
            action = "salary_band.updated"
        else:
            band = self.repo.create_band(data, current_user.company_id)
            action = "salary_band.created"

        self.audit.log(
            action=action,
            user_id=current_user.id,
            company_id=current_user.company_id,
            resource_type="salary_band",
            resource_id=str(band.id),
            details={
                "position": position.title,
                "min": float(band.salary_min),
                "midpoint": float(band.salary_midpoint),
                "max": float(band.salary_max),
            },
        )

        return SalaryBandResponse.model_validate(band)

    def auto_calculate_bands(
        self,
        company_id: UUID,
        current_user: User,
        spread_percent: int = 50,
    ) -> List[SalaryBandResponse]:
        """
        Calcula faixas automaticamente baseado nos salários reais.
        
        Algoritmo:
        1. Agrupa colaboradores por cargo
        2. Para cada cargo: calcula mediana dos salários
        3. Define min = mediana × (1 - spread/2), max = mediana × (1 + spread/2)
        4. Midpoint = mediana
        
        spread_percent: amplitude da faixa (padrão 50%)
        Ex: mediana=5000, spread=50% → min=3750, mid=5000, max=6250
        """
        employees = self.repo.get_employees_with_positions(company_id)

        # Agrupa por cargo
        by_position: Dict[str, List[Decimal]] = {}
        position_map: Dict[str, Position] = {}

        for emp in employees:
            pos_key = str(emp.position_id)
            if pos_key not in by_position:
                by_position[pos_key] = []
                position_map[pos_key] = emp.position
            by_position[pos_key].append(emp.current_salary)

        results = []
        half_spread = Decimal(str(spread_percent)) / Decimal("200")

        for pos_key, salaries in by_position.items():
            position = position_map[pos_key]
            salary_floats = [float(s) for s in salaries]

            if len(salary_floats) == 0:
                continue

            midpoint = _to_decimal(statistics.median(salary_floats))
            sal_min = _to_decimal(float(midpoint) * float(1 - half_spread))
            sal_max = _to_decimal(float(midpoint) * float(1 + half_spread))

            band_data = SalaryBandCreate(
                position_id=position.id,
                salary_min=sal_min,
                salary_midpoint=midpoint,
                salary_max=sal_max,
            )
            response = self.create_band(band_data, current_user)
            results.append(response)

        return results

    # ── Análise Salarial ─────────────────────────────────────────

    def analyze_employees(
        self,
        company_id: UUID,
        department: Optional[str] = None,
    ) -> List[SalaryAnalysisResult]:
        """
        Analisa posição de cada colaborador em relação à sua faixa.
        
        Classifica em:
        - "below": abaixo do mínimo da faixa (risco de retenção)
        - "within": dentro da faixa (saudável)
        - "above": acima do máximo da faixa (custo elevado)
        
        Compa-ratio = Salário atual / Midpoint × 100
        - < 80: muito abaixo
        - 80-120: zona saudável
        - > 120: acima da faixa
        """
        employees = self.repo.get_employees_with_positions(
            company_id, department
        )

        results = []
        for emp in employees:
            band = emp.position.salary_band if emp.position else None

            if not band:
                continue  # Pula cargos sem faixa definida

            result = self._calculate_employee_position(emp, band)
            results.append(result)

        # Ordena: críticos primeiro
        results.sort(key=lambda r: (not r.is_critical, r.compa_ratio))
        return results

    def _calculate_employee_position(
        self,
        emp: Employee,
        band: SalaryBand,
    ) -> SalaryAnalysisResult:
        """Calcula posição individual de um colaborador."""
        salary = emp.current_salary
        midpoint = band.salary_midpoint
        sal_min = band.salary_min
        sal_max = band.salary_max

        # Compa-ratio: 100 = exatamente no midpoint
        compa_ratio = _to_decimal(
            float(salary) / float(midpoint) * 100
        )

        # Posição na faixa
        if salary < sal_min * BELOW_BAND_THRESHOLD:
            position_in_range = "below"
            deviation = _to_decimal(
                (float(sal_min) - float(salary)) / float(sal_min) * 100
            )
        elif salary > sal_max * ABOVE_BAND_THRESHOLD:
            position_in_range = "above"
            deviation = _to_decimal(
                (float(salary) - float(sal_max)) / float(sal_max) * 100
            )
        else:
            position_in_range = "within"
            # Desvio do midpoint
            deviation = _to_decimal(
                abs(float(salary) - float(midpoint)) / float(midpoint) * 100
            )

        is_critical = deviation >= CRITICAL_DEVIATION

        return SalaryAnalysisResult(
            employee_id=emp.id,
            employee_name=emp.name,
            current_salary=_to_decimal(salary),
            salary_min=_to_decimal(sal_min),
            salary_midpoint=_to_decimal(midpoint),
            salary_max=_to_decimal(sal_max),
            compa_ratio=compa_ratio,
            position_in_range=position_in_range,
            deviation_percent=deviation,
            is_critical=is_critical,
        )

    def get_statistical_summary(
        self,
        company_id: UUID,
        department: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Resumo estatístico completo dos salários.
        Todos os cálculos no backend — frontend só exibe.
        """
        employees = self.repo.get_employees_with_positions(
            company_id, department
        )

        if not employees:
            return {"error": "Sem dados suficientes para análise"}

        salaries = [float(e.current_salary) for e in employees]

        # Estatísticas descritivas
        mean = statistics.mean(salaries)
        median = statistics.median(salaries)
        std_dev = statistics.stdev(salaries) if len(salaries) > 1 else 0

        # Percentis manuais (sem numpy para reduzir dependências)
        sorted_salaries = sorted(salaries)
        n = len(sorted_salaries)

        def percentile(data: list, p: int) -> float:
            idx = (p / 100) * (len(data) - 1)
            lower = int(idx)
            upper = min(lower + 1, len(data) - 1)
            weight = idx - lower
            return data[lower] * (1 - weight) + data[upper] * weight

        p25 = percentile(sorted_salaries, 25)
        p75 = percentile(sorted_salaries, 75)
        p90 = percentile(sorted_salaries, 90)

        # Coeficiente de variação — dispersão relativa
        cv = (std_dev / mean * 100) if mean > 0 else 0

        # Contagem por faixa de posição
        analysis = self.analyze_employees(company_id, department)
        below = sum(1 for r in analysis if r.position_in_range == "below")
        within = sum(1 for r in analysis if r.position_in_range == "within")
        above = sum(1 for r in analysis if r.position_in_range == "above")
        critical = sum(1 for r in analysis if r.is_critical)

        return {
            "headcount": n,
            "mean_salary": round(mean, 2),
            "median_salary": round(median, 2),
            "std_deviation": round(std_dev, 2),
            "variation_coefficient": round(cv, 2),
            "min_salary": round(min(salaries), 2),
            "max_salary": round(max(salaries), 2),
            "p25": round(p25, 2),
            "p75": round(p75, 2),
            "p90": round(p90, 2),
            "total_payroll": round(sum(salaries), 2),
            "distribution": {
                "below_band": below,
                "within_band": within,
                "above_band": above,
                "critical": critical,
                "below_pct": round(below / n * 100, 1) if n else 0,
                "within_pct": round(within / n * 100, 1) if n else 0,
                "above_pct": round(above / n * 100, 1) if n else 0,
            },
        }

    def detect_compression(
        self,
        company_id: UUID,
    ) -> List[Dict[str, Any]]:
        """
        Detecta compressão salarial entre níveis hierárquicos.
        
        Compressão = diferença salarial entre nível N e N+1 é muito pequena.
        Sinal de que a hierarquia não está sendo remunerada adequadamente.
        
        Ex: Analista Jr (R$4.000) vs Analista Pleno (R$4.200) = 5% diferença
            → compressão salarial detectada (limiar: 10%)
        """
        by_position = self.repo.get_salary_aggregates_by_position(company_id)

        # Ordena por nível hierárquico e média salarial
        from app.models.position import SeniorityLevel
        seniority_order = list(SeniorityLevel)

        def seniority_rank(row: dict) -> int:
            try:
                return seniority_order.index(row["seniority"])
            except (ValueError, KeyError):
                return 99

        sorted_positions = sorted(by_position, key=seniority_rank)

        compressions = []
        for i in range(1, len(sorted_positions)):
            current = sorted_positions[i]
            previous = sorted_positions[i - 1]

            curr_avg = float(current["avg_salary"] or 0)
            prev_avg = float(previous["avg_salary"] or 0)

            if prev_avg == 0:
                continue

            diff_pct = (curr_avg - prev_avg) / prev_avg * 100

            if diff_pct < float(COMPRESSION_THRESHOLD * 100):
                compressions.append({
                    "level_lower": previous["title"],
                    "seniority_lower": previous["seniority"],
                    "avg_lower": round(prev_avg, 2),
                    "level_upper": current["title"],
                    "seniority_upper": current["seniority"],
                    "avg_upper": round(curr_avg, 2),
                    "difference_pct": round(diff_pct, 2),
                    "severity": "critical" if diff_pct < 5 else "warning",
                })

        return compressions

    def get_department_comparison(
        self,
        company_id: UUID,
    ) -> List[Dict[str, Any]]:
        """
        Compara salários médios entre departamentos.
        Identifica disparidade salarial entre áreas.
        """
        aggregates = self.repo.get_salary_aggregates_by_department(company_id)

        if not aggregates:
            return []

        # Referência: média geral da empresa
        all_avgs = [float(row["avg_salary"] or 0) for row in aggregates]
        company_avg = statistics.mean(all_avgs) if all_avgs else 0

        result = []
        for row in aggregates:
            dept_avg = float(row["avg_salary"] or 0)
            deviation_from_avg = (
                (dept_avg - company_avg) / company_avg * 100
                if company_avg > 0 else 0
            )
            result.append({
                "department": row["department"],
                "headcount": row["headcount"],
                "avg_salary": round(dept_avg, 2),
                "min_salary": round(float(row["min_salary"] or 0), 2),
                "max_salary": round(float(row["max_salary"] or 0), 2),
                "total_payroll": round(float(row["total_payroll"] or 0), 2),
                "deviation_from_company_avg": round(deviation_from_avg, 2),
                "vs_company_avg": "above" if deviation_from_avg > 10
                                  else "below" if deviation_from_avg < -10
                                  else "aligned",
            })

        return result