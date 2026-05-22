# backend/app/db/init_db.py

# Importar todos os models aqui para o Alembic detectar
from app.db.base import Base
from app.models.company import Company       # noqa
from app.models.user import User             # noqa
from app.models.position import Position     # noqa
from app.models.salary_band import SalaryBand # noqa
from app.models.employee import Employee     # noqa
from app.models.audit_log import AuditLog   # noqa
from app.db.session import engine


def create_tables():
    """
    Cria todas as tabelas no banco.
    Em produção, usar Alembic migrations — nunca create_all direto.
    """
    Base.metadata.create_all(bind=engine)