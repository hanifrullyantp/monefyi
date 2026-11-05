#!/usr/bin/env bash
# Sync Mayar + payment provider dari PlannerLP2/.env.local → Supabase secrets + Vercel.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LP2_ENV="$ROOT/PlannerLP2/.env.local"
SB_ENV="$ROOT/my-supabase-project/.env"

if [[ ! -f "$LP2_ENV" ]]; then
  echo "Error: $LP2_ENV tidak ditemukan (isi MAYAR_API_KEY & NEXT_PUBLIC_PLANNER_PAYMENT_PROVIDER)." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source "$LP2_ENV"
set +a

if [[ -f "$SB_ENV" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$SB_ENV"
  set +a
fi

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "Error: SUPABASE_ACCESS_TOKEN kosong di my-supabase-project/.env" >&2
  exit 1
fi

if [[ -z "${MAYAR_API_KEY:-}" ]]; then
  echo "Error: MAYAR_API_KEY kosong di PlannerLP2/.env.local" >&2
  exit 1
fi

export SUPABASE_ACCESS_TOKEN
export SUPABASE_YES=1

MAYAR_URL="${MAYAR_API_URL:-https://api.mayar.id}"
PAYMENT_PROVIDER="${NEXT_PUBLIC_PLANNER_PAYMENT_PROVIDER:-lynk}"
MOBILE="${MAYAR_CHECKOUT_DEFAULT_MOBILE:-081234567890}"

echo "==> Supabase Edge secrets (planner-checkout, planner-mayar-webhook)"
(
  cd "$ROOT/my-supabase-project"
  npx --yes supabase@latest link --project-ref "${SUPABASE_PROJECT_REF:-zzwqfmdyncxbolestkqp}" >/dev/null
  npx --yes supabase@latest secrets set \
    MAYAR_API_KEY="$MAYAR_API_KEY" \
    MAYAR_API_URL="$MAYAR_URL" \
    MAYAR_CHECKOUT_DEFAULT_MOBILE="$MOBILE" \
    PLANNER_PAYMENT_PROVIDER="$PAYMENT_PROVIDER"
)
echo "    MAYAR_API_KEY, MAYAR_API_URL, PLANNER_PAYMENT_PROVIDER=$PAYMENT_PROVIDER"

add_vercel_env() {
  local dir="$1"
  local key="$2"
  local val="$3"
  local sensitive="${4:-0}"
  [[ -z "$val" ]] && return 0
  (
    cd "$dir"
    local extra=()
    if [[ "$sensitive" == "1" ]]; then
      extra=()
    elif [[ "$key" == NEXT_PUBLIC_* || "$key" == VITE_* ]]; then
      extra=(--visibility plain)
    fi
    printf '%s' "$val" | npx vercel env add "$key" production --force "${extra[@]}" >/dev/null
    echo "  $key → $(basename "$dir")"
  )
}

echo "==> Vercel production (PlannerLP2 / estimator)"
add_vercel_env "$ROOT/PlannerLP2" NEXT_PUBLIC_PLANNER_PAYMENT_PROVIDER "$PAYMENT_PROVIDER" 0
add_vercel_env "$ROOT/PlannerLP2" MAYAR_API_URL "$MAYAR_URL" 0
add_vercel_env "$ROOT/PlannerLP2" MAYAR_API_KEY "$MAYAR_API_KEY" 1

echo "==> Vercel production (monefyi-planner SPA)"
add_vercel_env "$ROOT/monefyi_planner" VITE_PLANNER_PAYMENT_PROVIDER "$PAYMENT_PROVIDER" 0

echo ""
echo "Done. Redeploy PlannerLP2 + monefyi-planner agar env aktif."
echo "MAYAR_API_KEY hanya di Supabase + Vercel server env (bukan NEXT_PUBLIC_)."
