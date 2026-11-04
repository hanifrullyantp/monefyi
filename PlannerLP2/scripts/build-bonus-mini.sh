#!/usr/bin/env bash
# Build 4 bonus mini apps (static) → PlannerLP2/public/bonus/mini/{slug}/
set -euo pipefail

if [[ "${SKIP_BONUS_MINI:-}" == "1" ]]; then
  echo "SKIP_BONUS_MINI=1 — lewati build mini app bonus"
  exit 0
fi

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
MINI="$ROOT/Mini App Monefyi"
OUT_ROOT="$ROOT/PlannerLP2/public/bonus/mini"

build_one() {
  local dir="$1"
  local slug="$2"
  local app_path="$MINI/$dir"

  if [[ ! -f "$app_path/package.json" ]]; then
    echo "Skip missing: $dir"
    return 0
  fi

  echo "==> Building $dir → /bonus/mini/$slug/"
  (
    cd "$app_path"
    if [[ ! -d node_modules ]]; then
      npm install --no-audit --no-fund
    fi
    rm -rf .next out
    BONUS_STATIC_EXPORT=true \
    BONUS_EMBED_BASEPATH="/bonus/mini/$slug" \
      npm run build
  )

  if [[ ! -d "$app_path/out" ]]; then
    echo "No out/ for $dir — skip copy (needs output: export)"
    return 1
  fi

  rm -rf "$OUT_ROOT/$slug"
  mkdir -p "$OUT_ROOT/$slug"
  cp -R "$app_path/out/." "$OUT_ROOT/$slug/"
  echo "Copied to $OUT_ROOT/$slug"
}

mkdir -p "$OUT_ROOT"

build_one "Kalkulator Gaji" "salary"
build_one "budget-planner" "budget"
build_one "debt-free-planner" "debt-free"
build_one "Bagi Hasil" "bagi-hasil"

echo "Bonus mini static embed ready under PlannerLP2/public/bonus/mini/"
