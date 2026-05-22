# SalaryPlatform

Plataforma especializada em **Cargos, Salários e Estrutura Organizacional**.

---

## Requisitos

- Docker 24+
- Docker Compose 2.20+
- (Desenvolvimento local) Python 3.11+ e Node 20+

---

## Instalação com Docker

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/salary-platform.git
cd salary-platform
```

### 2. Configure as variáveis de ambiente

```bash
cp .env.example .env
```

Edite o `.env` e preencha obrigatoriamente:
- `POSTGRES_PASSWORD` — senha forte para o banco
- `SECRET_KEY` — gere com:

```bash
python -c "import secrets; print(secrets.token_urlsafe(64))"
```

### 3. Suba os containers

```bash
docker compose up -d --build
```

### 4. Execute o seed (primeiro acesso)

```bash
docker compose exec backend python -m app.db.seed
```

### 5. Acesse

| Serviço   | URL                         |
|-----------|-----------------------------|
| Frontend  | http://localhost            |
| Backend   | http://localhost:8000       |
| API Docs  | http://localhost:8000/api/docs |

---

## Credenciais padrão (seed)

| Perfil    | E-mail                            | Senha          |
|-----------|-----------------------------------|----------------|
| Admin     | admin@salaryplatform.com          | Admin@1234     |
| Consultor | consultor@salaryplatform.com      | Consultor@1234 |

> **Troque as senhas imediatamente após o primeiro acesso.**

---

## Desenvolvimento local (sem Docker)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Configure o .env dentro de backend/
cp .env.example .env  # ajuste DATABASE_URL para localhost

# Sobe o banco isolado
docker compose up db -d

# Inicializa tabelas e seed
python -m app.db.seed

# Roda o servidor
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev   # http://localhost:3000
```

---

## Migrations com Alembic

```bash
cd backend

# Criar nova migration
alembic revision --autogenerate -m "descricao"

# Aplicar migrations
alembic upgrade head

# Reverter última migration
alembic downgrade -1
```

---

## Estrutura do projeto

```
salary-platform/
├── backend/
│   ├── app/
│   │   ├── api/v1/        # Rotas HTTP
│   │   ├── core/          # Config, segurança, middleware
│   │   ├── db/            # Session, base, seed
│   │   ├── models/        # ORM (tabelas)
│   │   ├── repositories/  # Queries do banco
│   │   ├── schemas/       # DTOs Pydantic
│   │   └── services/      # Regras de negócio
│   ├── alembic/           # Migrations
│   ├── tests/             # Testes
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/    # UI reutilizável
│   │   ├── hooks/         # Custom hooks
│   │   ├── pages/         # Páginas
│   │   ├── services/      # Chamadas de API
│   │   └── store/         # Estado global
│   ├── nginx.conf
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Módulos implementados

| Módulo | Descrição |
|--------|-----------|
| Autenticação | JWT + refresh token + rate limiting |
| Upload | XLSX/CSV com validação em 5 camadas |
| Cargos | CRUD + hierarquia + organograma |
| Faixas Salariais | Cálculo automático + manual |
| Análise Salarial | Compa-ratio, dispersão, compressão |
| Colaboradores | Importação + CRUD paginado |
| Dashboard | KPIs + gráficos Recharts |
| Diagnóstico | Score de saúde + recomendações |
| Relatórios | PDF (ReportLab) + Excel (openpyxl) |
| Organograma | Hierarquia navegável + zoom + export |

---

## Segurança

- Senhas com bcrypt (custo 12)
- JWT com access (30min) + refresh (7 dias)
- Rate limiting: 5 req/min no login
- Validação de MIME type real no upload
- Proteção contra path traversal
- Isolamento multitenancy por empresa
- Trilha de auditoria imutável
- Headers de segurança HTTP
- CORS restritivo
- Consultas parametrizadas (ORM)
- Nunca expõe stacktrace ao cliente