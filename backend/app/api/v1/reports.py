# backend/app/api/v1/reports.py

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.orm import Session
from datetime import datetime

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.services.report_service import ReportService
from app.repositories.audit_repository import AuditRepository

router = APIRouter(prefix="/reports", tags=["Relatórios"])


@router.get("/full-report/pdf")
async def download_full_report_pdf(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Gera e retorna relatório executivo completo em PDF.
    O backend monta o PDF — o frontend apenas faz o download.
    """
    try:
        service = ReportService(db)
        pdf_bytes = service.generate_full_report(current_user)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao gerar relatório PDF.",
        )

    audit = AuditRepository(db)
    audit.log(
        action="report.pdf.downloaded",
        user_id=current_user.id,
        company_id=current_user.company_id,
    )

    filename = (
        f"relatorio_salarial_"
        f"{datetime.now().strftime('%Y%m%d_%H%M')}.pdf"
    )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Length": str(len(pdf_bytes)),
        },
    )


@router.get("/full-report/xlsx")
async def download_full_report_xlsx(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Exporta todos os dados para Excel com múltiplas abas."""
    try:
        service = ReportService(db)
        xlsx_bytes = service.generate_xlsx_export(current_user)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao gerar exportação Excel.",
        )

    audit = AuditRepository(db)
    audit.log(
        action="report.xlsx.downloaded",
        user_id=current_user.id,
        company_id=current_user.company_id,
    )

    filename = (
        f"dados_salariais_"
        f"{datetime.now().strftime('%Y%m%d_%H%M')}.xlsx"
    )

    return Response(
        content=xlsx_bytes,
        media_type=(
            "application/vnd.openxmlformats-officedocument"
            ".spreadsheetml.sheet"
        ),
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Length": str(len(xlsx_bytes)),
        },
    )