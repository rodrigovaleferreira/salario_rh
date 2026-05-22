# backend/app/services/diagnostic_service.py

from sqlalchemy.orm import Session
from typing import List, Dict, Any
from uuid import UUID

from app.services.salary_service import SalaryService
from app.services.employee_service import EmployeeService
from app.repositories.employee_repository import EmployeeRepository
from app.models.user import User


class DiagnosticService:
    """
    Diagnóstico organizacional automatizado.
    Cruza dados salariais, hierárquicos e de headcount
    para gerar insights e recomendações.
    Sem IA — estatística descritiva clássica.
    """

    def __init__(self, db: Session):
        self.db          = db
        self.salary_svc  = SalaryService(db)
        self.emp_svc     = EmployeeService(db)
        self.emp_repo    = EmployeeRepository(db)

    def generate(self, current_user: User) -> Dict[str, Any]:
        company_id = current_user.company_id

        summary     = self.salary_svc.get_statistical_summary(company_id)
        analysis    = self.salary_svc.analyze_employees(company_id)
        compression = self.salary_svc.detect_compression(company_id)
        dept_comp   = self.salary_svc.get_department_comparison(company_id)
        headcount   = self.emp_repo.get_headcount_by_department(company_id)
        histogram   = self.emp_repo.get_salary_histogram(company_id)

        issues    = []
        warnings  = []
        positives = []
        recommendations = []

        # ── Análise de distorções individuais ────────────────────
        critical_count = summary.get("distribution", {}).get("critical", 0)
        below_pct      = summary.get("distribution", {}).get("below_pct", 0)
        above_pct      = summary.get("distribution", {}).get("above_pct", 0)
        within_pct     = summary.get("distribution", {}).get("within_pct", 0)

        if critical_count > 0:
            issues.append({
                "type":        "salary_distortion",
                "severity":    "critical",
                "title":       f"{critical_count} colaborador(es) com distorção crítica",
                "description": f"{critical_count} pessoa(s) com desvio superior a 20% "
                               f"em relação à sua faixa salarial.",
                "action":      "Revisar salários individualmente com urgência.",
            })

        if below_pct > 20:
            issues.append({
                "type":        "below_band",
                "severity":    "high",
                "title":       f"{below_pct:.0f}% dos colaboradores abaixo da faixa",
                "description": "Alta concentração de salários abaixo do mínimo da "
                               "faixa indica risco de retenção.",
                "action":      "Planejar reajuste salarial estruturado.",
            })
        elif below_pct > 10:
            warnings.append({
                "type":     "below_band_moderate",
                "title":    f"{below_pct:.0f}% dos colaboradores abaixo da faixa",
                "action":   "Monitorar e planejar revisões salariais.",
            })

        if above_pct > 15:
            warnings.append({
                "type":     "above_band",
                "title":    f"{above_pct:.0f}% dos colaboradores acima da faixa",
                "description": "Custo elevado — podem ser casos de senioridade "
                               "não reconhecida na estrutura.",
                "action":   "Avaliar promoção ou reenquadramento de cargo.",
            })

        if within_pct >= 70:
            positives.append({
                "type":  "healthy_distribution",
                "title": f"{within_pct:.0f}% dos colaboradores dentro da faixa salarial",
                "description": "Estrutura salarial bem calibrada.",
            })

        # ── Compressão salarial ───────────────────────────────────
        critical_compressions = [
            c for c in compression if c.get("severity") == "critical"
        ]
        if critical_compressions:
            issues.append({
                "type":     "salary_compression",
                "severity": "high",
                "title":    f"{len(critical_compressions)} caso(s) de compressão "
                            f"salarial crítica",
                "description": "Diferença inferior a 5% entre níveis hierárquicos "
                               "gera desmotivação e dificulta progressão de carreira.",
                "action":   "Redesenhar a estrutura de faixas para garantir "
                            "diferenciação mínima de 15% entre níveis.",
            })
        elif compression:
            warnings.append({
                "type":   "salary_compression_warning",
                "title":  f"{len(compression)} caso(s) de compressão salarial",
                "action": "Revisar amplitude das faixas entre níveis adjacentes.",
            })

        # ── Disparidade entre departamentos ──────────────────────
        if dept_comp:
            above_avg = [
                d for d in dept_comp
                if d.get("deviation_from_company_avg", 0) > 30
            ]
            below_avg = [
                d for d in dept_comp
                if d.get("deviation_from_company_avg", 0) < -30
            ]
            if above_avg or below_avg:
                warnings.append({
                    "type":  "dept_disparity",
                    "title": "Disparidade salarial significativa entre departamentos",
                    "description": (
                        f"Departamentos acima da média: "
                        f"{', '.join(d['department'] for d in above_avg) or 'nenhum'}. "
                        f"Abaixo da média: "
                        f"{', '.join(d['department'] for d in below_avg) or 'nenhum'}."
                    ),
                    "action": "Avaliar equidade interna entre áreas similares.",
                })

        # ── Concentração de headcount ─────────────────────────────
        if headcount:
            total_hc = sum(h.get("headcount", 0) for h in headcount)
            if total_hc > 0:
                max_dept = max(headcount, key=lambda h: h.get("headcount", 0))
                max_pct  = (max_dept.get("headcount", 0) / total_hc * 100)
                if max_pct > 50:
                    warnings.append({
                        "type":  "headcount_concentration",
                        "title": f"{max_pct:.0f}% do headcount concentrado "
                                 f"em '{max_dept.get('department')}'",
                        "action": "Avaliar se a estrutura organizacional "
                                  "está adequada ao modelo de negócio.",
                    })

        # ── Coeficiente de variação ───────────────────────────────
        cv = summary.get("variation_coefficient", 0)
        if cv > 50:
            warnings.append({
                "type":  "high_variation",
                "title": f"Alta dispersão salarial (CV: {cv:.1f}%)",
                "description": "Coeficiente de variação acima de 50% indica "
                               "grande heterogeneidade na estrutura de remuneração.",
                "action": "Revisar equidade interna e estrutura de faixas.",
            })
        elif cv < 20:
            positives.append({
                "type":  "low_variation",
                "title": f"Dispersão salarial controlada (CV: {cv:.1f}%)",
                "description": "Salários bem distribuídos em relação à média.",
            })

        # ── Recomendações consolidadas ────────────────────────────
        if issues:
            recommendations.append(
                "Priorize a revisão dos colaboradores com distorção crítica "
                "antes do próximo ciclo de avaliação."
            )
        if compression:
            recommendations.append(
                "Considere ampliar o spread das faixas salariais para "
                "garantir diferenciação adequada entre níveis de senioridade."
            )
        if not issues and not warnings:
            recommendations.append(
                "A estrutura salarial está saudável. "
                "Realize revisões periódicas a cada 6 meses."
            )

        # ── Score de saúde organizacional (0–100) ─────────────────
        score = 100
        score -= len([i for i in issues if i.get("severity") == "critical"]) * 20
        score -= len([i for i in issues if i.get("severity") == "high"]) * 10
        score -= len(warnings) * 5
        score += len(positives) * 5
        score = max(0, min(100, score))

        health_label = (
            "Crítico"   if score < 40 else
            "Atenção"   if score < 60 else
            "Regular"   if score < 75 else
            "Bom"       if score < 90 else
            "Excelente"
        )

        return {
            "score":           score,
            "health_label":    health_label,
            "summary":         summary,
            "issues":          issues,
            "warnings":        warnings,
            "positives":       positives,
            "recommendations": recommendations,
            "compression":     compression,
            "dept_comparison": dept_comp,
            "headcount_by_dept": headcount,
            "salary_histogram":  histogram,
            "total_employees": summary.get("headcount", 0),
            "critical_count":  critical_count,
        }