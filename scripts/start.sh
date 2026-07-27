#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

IMAGE_NAME="pm-mvp"
CONTAINER_NAME="pm-mvp"
PORT=8000

mkdir -p data

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required but was not found on PATH."
  exit 1
fi

echo "Building image ${IMAGE_NAME}..."
docker build -t "${IMAGE_NAME}" .

if docker ps -a --format '{{.Names}}' | grep -qx "${CONTAINER_NAME}"; then
  echo "Removing existing container ${CONTAINER_NAME}..."
  docker rm -f "${CONTAINER_NAME}" >/dev/null
fi

ENV_ARGS=()
if [[ -f .env ]]; then
  ENV_ARGS+=(--env-file .env)
fi

echo "Starting ${CONTAINER_NAME} on http://localhost:${PORT} ..."
docker run -d \
  --name "${CONTAINER_NAME}" \
  -p "${PORT}:8000" \
  -v "${ROOT}/data:/data" \
  "${ENV_ARGS[@]}" \
  "${IMAGE_NAME}"

echo "Started. Health: http://localhost:${PORT}/api/health"
