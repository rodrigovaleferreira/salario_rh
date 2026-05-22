# backend/app/db/seed.py

from app.db.session import SessionLocal
from app.db.init_db import create_tables
from app.models.company import Company
from app.models.user import User, UserRole
from app.core.security import hash_password
import uuid


def seed():
    create_tables()
    db = SessionLocal()

    try:
        # Verifica se já existe empresa padrão
        existing = db.query(Company).filter_by(name="Empresa Demo").first()
        if existing:
            print("✅ Seed já executado anteriormente.")
            return

        # Cria empresa padrão
        company = Company(
            id=uuid.uuid4(),
            name="Empresa Demo",
            segment="Consultoria",
            size_range="50-200",
        )
        db.add(company)
        db.flush()

        # Cria usuário admin
        admin = User(
            id=uuid.uuid4(),
            email="admin@salaryplatform.com",
            password_hash=hash_password("Admin@1234"),
            full_name="Administrador",
            role=UserRole.ADMIN,
            is_active=True,
            is_verified=True,
            company_id=company.id,
        )
        db.add(admin)

        # Cria usuário consultor
        consultant = User(
            id=uuid.uuid4(),
            email="consultor@salaryplatform.com",
            password_hash=hash_password("Consultor@1234"),
            full_name="Consultor RH",
            role=UserRole.CONSULTANT,
            is_active=True,
            is_verified=True,
            company_id=company.id,
        )
        db.add(consultant)

        db.commit()

        print("✅ Seed executado com sucesso!")
        print()
        print("👤 Usuários criados:")
        print("   Admin:     admin@salaryplatform.com     / Admin@1234")
        print("   Consultor: consultor@salaryplatform.com / Consultor@1234")

    except Exception as e:
        db.rollback()
        print(f"❌ Erro no seed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()