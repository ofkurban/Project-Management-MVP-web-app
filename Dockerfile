# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS frontend

WORKDIR /frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

WORKDIR /app

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PATH="/app/backend/.venv/bin:$PATH" \
    STATIC_DIR=/app/static \
    DATABASE_PATH=/data/app.db

COPY backend/pyproject.toml backend/uv.lock /app/backend/
COPY backend/app /app/backend/app

WORKDIR /app/backend
RUN uv sync --frozen --no-dev

COPY --from=frontend /frontend/out /app/static

RUN mkdir -p /data

EXPOSE 8000

CMD [".venv/bin/uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
