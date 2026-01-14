#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   scripts/ci-cleanup-env.sh backend
#   scripts/ci-cleanup-env.sh frontend

TARGET="${1:-}"
if [[ "$TARGET" != "backend" && "$TARGET" != "frontend" ]]; then
  echo "Usage: $0 <backend|frontend>" >&2
  exit 2
fi

rm -f "${TARGET}/.env"
echo "Removed ${TARGET}/.env"
