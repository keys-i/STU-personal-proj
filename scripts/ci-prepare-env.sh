#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   scripts/ci-prepare-env.sh backend
#   scripts/ci-prepare-env.sh frontend
#
# What it does:
# - Creates <target>/.env from example files if present, otherwise writes sane defaults
# - Ensures required vars exist
# - Appends dockerignore "whitelist" rules so .env is included in build context

TARGET="${1:-}"
if [[ "$TARGET" != "backend" && "$TARGET" != "frontend" ]]; then
  echo "Usage: $0 <backend|frontend>" >&2
  exit 2
fi

ENV_FILE="${TARGET}/.env"

# Prefer example env files if present
if [[ -f "${TARGET}/examples/example.env" ]]; then
  cp "${TARGET}/examples/example.env" "$ENV_FILE"
elif [[ -f "${TARGET}/examples/examples.env" ]]; then
  cp "${TARGET}/examples/examples.env" "$ENV_FILE"
else
  if [[ "$TARGET" == "backend" ]]; then
    echo "DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres?schema=public" > "$ENV_FILE"
  else
    {
      echo "VITE_API_BASE_URL=/api"
      echo "VITE_API_PROXY_TARGET=http://localhost:3000"
    } > "$ENV_FILE"
  fi
fi

# Validate required vars exist
if [[ "$TARGET" == "backend" ]]; then
  grep -q '^DATABASE_URL=' "$ENV_FILE"
else
  grep -q '^VITE_API_BASE_URL=' "$ENV_FILE"
  grep -q '^VITE_API_PROXY_TARGET=' "$ENV_FILE"
fi

# Ensure .env is included in Docker build context even if .dockerignore blocks it
{
  echo ""
  echo "# Added by GitHub Actions for CI build (${TARGET})"
  echo "!${TARGET}/"
  echo "!${TARGET}/.env"
  echo "!${TARGET}/examples/"
} >> .dockerignore

echo "Prepared ${ENV_FILE} and updated .dockerignore"
