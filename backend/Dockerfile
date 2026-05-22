# backend/Dockerfile

FROM python:3.11-slim

# Evita .pyc e buffers de stdout
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Dependências de sistema para psycopg2 e python-magic
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    gcc \
    libmagic1 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copia e instala dependências primeiro (cache do Docker)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copia o código
COPY . .

# Cria pasta de uploads com permissão correta
RUN mkdir -p uploads/staging uploads/processed \
    && chmod -R 755 uploads

# Usuário não-root para segurança
RUN addgroup --system appgroup \
    && adduser --system --ingroup appgroup appuser \
    && chown -R appuser:appgroup /app

USER appuser

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]