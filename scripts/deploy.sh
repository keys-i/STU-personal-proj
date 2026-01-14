#!/usr/bin/env bash
set -Eeuo pipefail

# scripts/deploy.sh
#
# stu-fullstack deploy helper (docker compose)
#
# Examples:
#   ./scripts/deploy.sh
#   ./scripts/deploy.sh --build all --detach
#   ./scripts/deploy.sh --no-cache --down --build backend,frontend
#   ./scripts/deploy.sh --profile dev --logs backend
#   ./scripts/deploy.sh --status
#
# Notes:
# - Run this from repo root OR from scripts/ (it will auto-cd to repo root).
# - Uses `docker compose` when available, otherwise `docker-compose`.

# =========================
# Repo-root detection
# =========================
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"

# If launched from scripts/ (or anywhere else), jump to repo root
cd -- "${REPO_ROOT}"

# =========================
# Colors / Styling
# =========================
# Disable color automatically if not a TTY, unless forced
COLOR=1
if [[ ! -t 1 ]]; then COLOR=0; fi

# Respect NO_COLOR
if [[ -n "${NO_COLOR:-}" ]]; then COLOR=0; fi

# Allow forcing color
if [[ "${FORCE_COLOR:-0}" == "1" ]]; then COLOR=1; fi

if [[ "${COLOR}" == "1" ]]; then
  RED=$'\033[0;31m'
  GRN=$'\033[0;32m'
  YEL=$'\033[0;33m'
  BLU=$'\033[0;34m'
  MAG=$'\033[0;35m'
  CYN=$'\033[0;36m'
  BOLD=$'\033[1m'
  DIM=$'\033[2m'
  RST=$'\033[0m'
else
  RED=""; GRN=""; YEL=""; BLU=""; MAG=""; CYN=""; BOLD=""; DIM=""; RST=""
fi

say()  { printf "%b\n" "$*"; }
hdr()  { say "${MAG}${BOLD}$*${RST}"; }
info() { say "${CYN}${BOLD}info${RST}  $*"; }
ok()   { say "${GRN}${BOLD}ok${RST}    $*"; }
warn() { say "${YEL}${BOLD}warn${RST}  $*"; }
err()  { say "${RED}${BOLD}error${RST} $*"; }
die()  { err "$*"; exit 1; }

# Print a command in dim style then run it
run() {
  say "${DIM}+ $*${RST}"
  "$@"
}

# =========================
# Compose command
# =========================
if docker compose version >/dev/null 2>&1; then
  COMPOSE=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE=(docker-compose)
else
  die "Docker Compose not found. Install Docker Desktop or docker-compose."
fi

# =========================
# Defaults
# =========================
NO_CACHE=0
DETACH=0
DO_DOWN=0
PULL=0
FORCE_RECREATE=1
BUILD=1
UP=1
LOGS_SERVICE=""
FOLLOW_LOGS=0
STATUS_ONLY=0
PROFILE=""              # compose --profile <name>
PROJECT_NAME=""         # compose -p <name>
SERVICES=()             # which services to build/up
BUILD_TARGET="backend"  # default behavior matches your old script

# If you want "all" by default, set BUILD_TARGET="all"
# BUILD_TARGET="all"

# =========================
# Help
# =========================
usage() {
  cat <<EOF
${MAG}${BOLD}stu-fullstack deploy${RST} ${DIM}(scripts/deploy.sh)${RST}

${BOLD}Usage${RST}
  ${BOLD}./scripts/deploy.sh${RST} [options]

${BOLD}What it does${RST}
  - By default: builds and starts ${BOLD}${BUILD_TARGET}${RST} via Docker Compose
  - Can build/up multiple services, bring stack down, pull images, follow logs, etc.

${BOLD}Common examples${RST}
  ${DIM}# Build+up backend (default)${RST}
  ./scripts/deploy.sh

  ${DIM}# Build everything + detach${RST}
  ./scripts/deploy.sh --build all --detach

  ${DIM}# Rebuild without cache and restart stack${RST}
  ./scripts/deploy.sh --no-cache --down --build backend,frontend

  ${DIM}# Pull base images, then build+up${RST}
  ./scripts/deploy.sh --pull --build all

  ${DIM}# Only show compose status (no build/up)${RST}
  ./scripts/deploy.sh --status

  ${DIM}# Tail logs for backend${RST}
  ./scripts/deploy.sh --logs backend --follow

${BOLD}Options${RST}
  ${BOLD}Build / Up${RST}
    --build <svc|svc1,svc2|all>   Build one/many services (default: ${BUILD_TARGET})
    --no-build                   Skip build step
    --up                          Run 'docker compose up' (default: on)
    --no-up                      Skip 'up' step (build only)
    --no-cache                   Build without cache
    --pull                       Pull newer base images before build
    --force-recreate             Force recreate containers (default: on)
    --no-recreate                Do not force recreate

  ${BOLD}Lifecycle${RST}
    --down                       docker compose down before up
    --down-only                  Only run down, then exit
    --status                     Show \`docker compose ps\` and exit

  ${BOLD}Logs${RST}
    --logs <service>             Print logs for a service
    --follow, -f                 Follow logs (use with --logs)

  ${BOLD}Compose flags${RST}
    --profile <name>             Pass --profile to docker compose
    --project <name>             Pass -p/--project-name to docker compose

  ${BOLD}Output${RST}
    --no-color                   Disable colored output
    --color                      Force colored output
    -h, --help                   Show this help

${BOLD}Exit codes${RST}
  0 success
  1 failure

EOF
}

# =========================
# Arg parsing
# =========================
parse_services_csv() {
  local s="$1"
  if [[ "$s" == "all" ]]; then
    SERVICES=("backend" "frontend")
    return 0
  fi
  IFS=',' read -r -a SERVICES <<< "$s"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --build)
      [[ $# -ge 2 ]] || die "--build requires a value (e.g. backend or backend,frontend or all)"
      parse_services_csv "$2"
      shift 2
      ;;
    --no-build) BUILD=0; shift ;;
    --up) UP=1; shift ;;
    --no-up) UP=0; shift ;;
    --no-cache) NO_CACHE=1; shift ;;
    --pull) PULL=1; shift ;;
    --force-recreate) FORCE_RECREATE=1; shift ;;
    --no-recreate) FORCE_RECREATE=0; shift ;;

    --down) DO_DOWN=1; shift ;;
    --down-only) DO_DOWN=1; BUILD=0; UP=0; shift ;;
    --status) STATUS_ONLY=1; shift ;;

    --logs)
      [[ $# -ge 2 ]] || die "--logs requires a service name (e.g. backend)"
      LOGS_SERVICE="$2"
      shift 2
      ;;
    --follow|-f) FOLLOW_LOGS=1; shift ;;

    --profile)
      [[ $# -ge 2 ]] || die "--profile requires a value"
      PROFILE="$2"
      shift 2
      ;;
    --project|-p|--project-name)
      [[ $# -ge 2 ]] || die "--project requires a value"
      PROJECT_NAME="$2"
      shift 2
      ;;

    --no-color) COLOR=0; RED=""; GRN=""; YEL=""; BLU=""; MAG=""; CYN=""; BOLD=""; DIM=""; RST=""; shift ;;
    --color) COLOR=1; FORCE_COLOR=1; shift ;; # doesn't retroactively re-init styles; set FORCE_COLOR before calling script for full effect
    -h|--help) usage; exit 0 ;;
    *) die "Unknown argument: $1 (try --help)" ;;
  esac
done

# If user didn't specify --build, use default single service
if [[ ${#SERVICES[@]} -eq 0 ]]; then
  SERVICES=("${BUILD_TARGET}")
fi

# =========================
# Compose base args
# =========================
COMPOSE_ARGS=()
if [[ -n "${PROFILE}" ]]; then
  COMPOSE_ARGS+=(--profile "${PROFILE}")
fi
if [[ -n "${PROJECT_NAME}" ]]; then
  COMPOSE_ARGS+=(-p "${PROJECT_NAME}")
fi

compose() {
  "${COMPOSE[@]}" "${COMPOSE_ARGS[@]}" "$@"
}

# =========================
# Banner / Summary
# =========================
hdr "stu-fullstack deploy"
say "${DIM}repo:${RST} ${REPO_ROOT}"
say "${DIM}compose:${RST} ${COMPOSE[*]} ${COMPOSE_ARGS[*]:-}"
info "services: ${BOLD}${SERVICES[*]}${RST}"
info "build: $( [[ $BUILD -eq 1 ]] && echo "${GRN}on${RST}" || echo "${YEL}off${RST}" ), up: $( [[ $UP -eq 1 ]] && echo "${GRN}on${RST}" || echo "${YEL}off${RST}" )"
info "cache: $( [[ $NO_CACHE -eq 1 ]] && echo "${YEL}no-cache${RST}" || echo "${GRN}cache${RST}" ), pull: $( [[ $PULL -eq 1 ]] && echo "${GRN}yes${RST}" || echo "${DIM}no${RST}" )"
info "recreate: $( [[ $FORCE_RECREATE -eq 1 ]] && echo "${GRN}force${RST}" || echo "${DIM}default${RST}" )"

# =========================
# Actions
# =========================
if [[ $STATUS_ONLY -eq 1 ]]; then
  run compose ps
  exit 0
fi

if [[ $DO_DOWN -eq 1 ]]; then
  warn "Bringing stack down..."
  run compose down
  ok "Down"
fi

if [[ $PULL -eq 1 ]]; then
  info "Pulling images..."
  run compose pull || warn "Pull failed (non-fatal). Continuing..."
fi

if [[ $BUILD -eq 1 ]]; then
  BUILD_ARGS=()
  if [[ $NO_CACHE -eq 1 ]]; then
    BUILD_ARGS+=(--no-cache)
    warn "Building WITHOUT cache"
  else
    info "Building with cache"
  fi

  # Build only requested services
  info "Building: ${SERVICES[*]}"
  run compose build "${BUILD_ARGS[@]}" "${SERVICES[@]}"
  ok "Build complete"
fi

if [[ $UP -eq 1 ]]; then
  UP_ARGS=()
  if [[ $FORCE_RECREATE -eq 1 ]]; then
    UP_ARGS+=(--force-recreate)
  fi

  # always prefer removing orphaned services
  UP_ARGS+=(--remove-orphans)

  if [[ $DETACH -eq 1 ]]; then
    UP_ARGS+=(-d)
  fi

  info "Starting services..."
  run compose up "${UP_ARGS[@]}" "${SERVICES[@]}"
  ok "Stack is up"
fi

# Logs helper (optional)
if [[ -n "${LOGS_SERVICE}" ]]; then
  LOGS_ARGS=()
  if [[ $FOLLOW_LOGS -eq 1 ]]; then
    LOGS_ARGS+=(-f)
  fi
  info "Logs: ${LOGS_SERVICE} $( [[ $FOLLOW_LOGS -eq 1 ]] && echo '(follow)' || true )"
  run compose logs "${LOGS_ARGS[@]}" "${LOGS_SERVICE}"
else
  info "Tip:"
  say "${DIM}  ./scripts/deploy.sh --logs backend --follow${RST}"
fi
