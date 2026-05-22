# frontend/Dockerfile

# ── Etapa 1: Build ────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copia package files primeiro (cache de dependências)
COPY package.json package-lock.json* ./
RUN npm ci --silent

# Copia código e build
COPY . .

# URL da API em produção (sobrescrito pelo docker-compose)
ARG VITE_API_URL=http://localhost:8000/api/v1
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ── Etapa 2: Nginx ────────────────────────────────────────────────
FROM nginx:1.25-alpine

# Remove config padrão
RUN rm /etc/nginx/conf.d/default.conf

# Config customizada
COPY nginx.conf /etc/nginx/conf.d/app.conf

# Arquivos do build
COPY --from=builder /app/dist /usr/share/nginx/html

# Permissões corretas
RUN chown -R nginx:nginx /usr/share/nginx/html \
    && chmod -R 755 /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget -qO- http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]