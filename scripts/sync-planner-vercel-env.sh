#!/usr/bin/env bash
# Sync shared Vercel env vars for planner-landing + planner-lp2 (admin password, Lynk URLs).
# Reads from env file or current shell. Never commit the env file with real secrets.
#
# Usage:
#   export PLANNER_ADMIN_PASSWORD='...'
#   export NEXT_PUBLIC_LYNK_ESTIMATOR_STANDARD='https://lynk.id/...'
#   export NEXT_PUBLIC_LYNK_ESTIMATOR_PRO='https://lynk.id/...'
#   export NEXT_PUBLIC_LYNK_PLANNER_PRO='https://lynk.id/...'
#   ./scripts/sync-planner-vercel-env.sh
#
# Or: source a local file (gitignored at repo root):
#   cp docs/planner/PLANNER_VERCEL_ENV.example .env.planner-vercel
#   set -a; source .env.planner-vercel; set +a; ./scripts/sync-planner-vercel-env.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f "$ROOT/.env.planner-vercel" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env.planner-vercel"
  set +a
fi

PLANNER_ADMIN_PASSWORD="${PLANNER_ADMIN_PASSWORD:-${ADMIN_PASSWORD:-monefyi2026}}"

set_env_for_project() {
  local dir="$1"
  local label="$2"
  echo "==> $label ($dir)"
  (
    cd "$dir"
    printf '%s' "$PLANNER_ADMIN_PASSWORD" | npx vercel env add ADMIN_PASSWORD production --force >/dev/null
    echo "  ADMIN_PASSWORD"

    for key in \
      NEXT_PUBLIC_LYNK_ESTIMATOR_STANDARD \
      NEXT_PUBLIC_LYNK_ESTIMATOR_PRO \
      NEXT_PUBLIC_LYNK_PLANNER_PRO; do
      val="${!key:-}"
      if [[ -n "$val" ]]; then
        printf '%s' "$val" | npx vercel env add "$key" production --force >/dev/null
        echo "  $key"
      fi
    done
  )
}

set_env_for_project "$ROOT/Planner-Landing-Page" "planner-landing"
set_env_for_project "$ROOT/PlannerLP2" "planner-lp2"

echo "Done. Redeploy both projects if Lynk URLs changed."
