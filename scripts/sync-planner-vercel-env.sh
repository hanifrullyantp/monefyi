#!/usr/bin/env bash
# Sync shared Vercel env for planner-landing, planner-lp2, and monefyi-planner SPA.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f "$ROOT/.env.planner-vercel" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env.planner-vercel"
  set +a
fi

# Supabase from local SPA env if not already exported
SPA_ENV="$ROOT/monefyi_planner/.env.local"
if [[ -f "$SPA_ENV" ]]; then
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ "$line" != *=* ]] && continue
    key="${line%%=*}"
    val="${line#*=}"
    val="${val%\"}"; val="${val#\"}"; val="${val%\'}"; val="${val#\'}"
    case "$key" in
      VITE_SUPABASE_URL) export NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-$val}" ;;
      VITE_SUPABASE_ANON_KEY) export NEXT_PUBLIC_SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY:-$val}" ;;
      VITE_LYNK_ESTIMATOR_STANDARD) export NEXT_PUBLIC_LYNK_ESTIMATOR_STANDARD="${NEXT_PUBLIC_LYNK_ESTIMATOR_STANDARD:-$val}" ;;
      VITE_LYNK_ESTIMATOR_PRO) export NEXT_PUBLIC_LYNK_ESTIMATOR_PRO="${NEXT_PUBLIC_LYNK_ESTIMATOR_PRO:-$val}" ;;
      VITE_LYNK_PLANNER_PRO) export NEXT_PUBLIC_LYNK_PLANNER_PRO="${NEXT_PUBLIC_LYNK_PLANNER_PRO:-$val}" ;;
    esac
  done < "$SPA_ENV"
fi

PLANNER_ADMIN_PASSWORD="${PLANNER_ADMIN_PASSWORD:-${ADMIN_PASSWORD:-monefyi2026}}"
PLANNER_APP_ORIGIN="${PLANNER_APP_ORIGIN:-https://app.planner.monefyi.com}"
NEXT_PUBLIC_PLANNER_APP_URL="${NEXT_PUBLIC_PLANNER_APP_URL:-$PLANNER_APP_ORIGIN}"

add_env() {
  local key="$1"
  local val="$2"
  [[ -z "$val" ]] && return 0
  printf '%s' "$val" | npx vercel env add "$key" production --force >/dev/null
  echo "  $key"
}

sync_landing() {
  local dir="$1"
  local label="$2"
  echo "==> $label"
  (
    cd "$dir"
    add_env ADMIN_PASSWORD "$PLANNER_ADMIN_PASSWORD"
    add_env PLANNER_APP_ORIGIN "$PLANNER_APP_ORIGIN"
    add_env NEXT_PUBLIC_PLANNER_APP_URL "$NEXT_PUBLIC_PLANNER_APP_URL"
    add_env NEXT_PUBLIC_SUPABASE_URL "${NEXT_PUBLIC_SUPABASE_URL:-}"
    add_env NEXT_PUBLIC_SUPABASE_ANON_KEY "${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}"
    add_env NEXT_PUBLIC_LYNK_ESTIMATOR_STANDARD "${NEXT_PUBLIC_LYNK_ESTIMATOR_STANDARD:-}"
    add_env NEXT_PUBLIC_LYNK_ESTIMATOR_PRO "${NEXT_PUBLIC_LYNK_ESTIMATOR_PRO:-}"
    add_env NEXT_PUBLIC_LYNK_PLANNER_PRO "${NEXT_PUBLIC_LYNK_PLANNER_PRO:-}"
  )
}

sync_spa() {
  echo "==> monefyi-planner"
  (
    cd "$ROOT/monefyi_planner"
    add_env VITE_SUPABASE_URL "${NEXT_PUBLIC_SUPABASE_URL:-}"
    add_env VITE_SUPABASE_ANON_KEY "${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}"
    add_env VITE_LYNK_ESTIMATOR_STANDARD "${NEXT_PUBLIC_LYNK_ESTIMATOR_STANDARD:-}"
    add_env VITE_LYNK_ESTIMATOR_PRO "${NEXT_PUBLIC_LYNK_ESTIMATOR_PRO:-}"
    add_env VITE_LYNK_PLANNER_PRO "${NEXT_PUBLIC_LYNK_PLANNER_PRO:-}"
  )
}

sync_landing "$ROOT/Planner-Landing-Page" "planner-landing"
sync_landing "$ROOT/PlannerLP2" "planner-lp2"
sync_spa

echo "Done. Redeploy projects if env changed."
