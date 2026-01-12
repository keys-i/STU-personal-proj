#!/usr/bin/env bash
set -Eeuo pipefail


#  === Colors ===
RED='\033[0;31m'
GRN='\033[0;32m'
YEL='\033[0;33m'
BLU='\033[0;34m'
MAG='\033[0;35m'
CYN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
RST='\033[0m'

#   === Helpers ===
say()  { printf "%b\n" "$*"; }
info() { say "${CYN}${BOLD}info${RST}  $*"; }
ok()   { say "${GRN}${BOLD}ok${RST}    $*"; }
warn() { say "${YEL}${BOLD}warn${RST}  $*"; }
die()  { say "${RED}${BOLD}error${RST} $*"; exit 1; }

usage() {
  cat <<'EOF'
deploy.sh - build and run docker compose for stu-fullstack

Usage:
  ./deploy.sh              Build with cache (default) and start services
  ./deploy.sh --no-cache   Build WITHOUT cache and start services
  ./deploy.sh -d           Detach (run in background)
  ./deploy.sh --down       Stop and remove containers before starting

Flags:
  --no-cache   Rebuild images without using cached layers
  -d, --detach Run containers in background
  --down       docker compose down before starting
  -h, --help   Show help
EOF
}

#  === Args ===
NO_CACHE=0
DETACH=0
DO_DOWN=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-cache) NO_CACHE=1; shift ;;
    -d|--detach) DETACH=1; shift ;;
    --down) DO_DOWN=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) die "Unknown argument: $1 (try --help)" ;;
  esac
done

# === Choose compose command ===
if docker compose version >/dev/null 2>&1; then
  COMPOSE=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE=(docker-compose)
else
  die "Docker Compose not found. Install Docker Desktop or docker-compose."
fi


#  === Banner ===
say "${MAG}${BOLD}stu-fullstack deploy${RST} ${DIM}(compose)${RST}"
say "${DIM}cwd:${RST} $(pwd)"
info "mode: $( [[ $NO_CACHE -eq 1 ]] && echo "NO CACHE" || echo "cache" ), $( [[ $DETACH -eq 1 ]] && echo "detach" || echo "attached" )"


# === Run ===
if [[ $DO_DOWN -eq 1 ]]; then
  warn "Bringing stack down first..."
  say "${DIM}+ ${COMPOSE[*]} down${RST}"
  "${COMPOSE[@]}" down
  ok "Down"
fi

BUILD_ARGS=()
if [[ $NO_CACHE -eq 1 ]]; then
  BUILD_ARGS+=(--no-cache)
  warn "Building WITHOUT cache (slower, fresh layers)"
else
  info "Building with cache (default)"
fi

#  === Build backend explicitly (fastest dev loop); add other services if you build them too ===
say "${DIM}+ ${COMPOSE[*]} build ${BUILD_ARGS[*]} backend${RST}"
"${COMPOSE[@]}" build "${BUILD_ARGS[@]}" backend
ok "Build complete"

UP_ARGS=(--force-recreate)
if [[ $DETACH -eq 1 ]]; then
  UP_ARGS+=(-d)
fi

say "${DIM}+ ${COMPOSE[*]} up ${UP_ARGS[*]}${RST}"
"${COMPOSE[@]}" up "${UP_ARGS[@]}"
ok "Stack is up"

info "Tip: follow logs with:"
say "${DIM}  ${COMPOSE[*]} logs -f backend${RST}"
