# syntax=docker/dockerfile:1

# ----- Frontend build stage -----
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend

# Enable corepack and use pnpm
RUN corepack enable && corepack prepare pnpm@10 --activate

# Install deps first (leverage layer caching)
COPY frontend/pnpm-lock.yaml frontend/package.json ./
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY frontend/ ./
RUN pnpm build

# ----- Backend stage -----
FROM python:3.13-slim AS backend
WORKDIR /app/backend

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Install uv (Python package manager)
ENV UV_INSTALL_DIR=/root/.local/bin
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="$UV_INSTALL_DIR:$PATH"

# Copy backend project files
COPY backend/ ./

# Copy built frontend assets into backend static directory
RUN mkdir -p /app/backend/src/static
COPY --from=frontend-build /app/frontend/dist/ /app/backend/src/static/

# Sync/install backend deps (no dev)
RUN uv sync --no-dev

# Default environment overrides to avoid OS keyring in containers
ENV SERO_SECURITY__SECRET_KEY=container-secret-key \
    SERO_DB__FILEPATH=/data/sero.sqlite \
    SERO_LOG__FILEPATH=/data/logs/app.jsonl \
    SERO_PROCESSING__DIRPATH=/data/output

# Create data dirs
RUN mkdir -p /data /data/logs /data/output

EXPOSE 8000
CMD ["uv", "run", "sero"]
