#!/usr/bin/env bash
# Push Growth Phase migrations to linked Supabase project.
#
# Order (apply manually if db push fails):
#   20260809180000_sprint5_feature_flags.sql
#   20260809190000_sprint6_beta_launch.sql
#   20260809200000_growth_phase1_insights.sql
#   20260809210000_sprint8_monthly_review.sql
#   20260809220000_sprint13_18_community.sql
#   20260809230000_growth_advanced.sql
#   20260809250000_household_shared_visibility.sql
#
# Usage:
#   export SUPABASE_ACCESS_TOKEN="sbp_..."
#   export SUPABASE_PROJECT_REF="your-project-ref"
#   ./scripts/deploy-growth-migrations.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/my-supabase-project"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "Error: set SUPABASE_ACCESS_TOKEN" >&2
  exit 1
fi

export SUPABASE_ACCESS_TOKEN

if [[ -n "${SUPABASE_PROJECT_REF:-}" ]]; then
  echo "==> Linking $SUPABASE_PROJECT_REF"
  npx --yes supabase@latest link --project-ref "$SUPABASE_PROJECT_REF"
fi

echo "==> Sync migrations from repo..."
for f in \
  sprint5_feature_flags \
  sprint6_beta_launch \
  growth_phase1_insights \
  sprint8_monthly_review \
  sprint13_18_community \
  growth_advanced \
  household_shared_visibility \
  household_shared_tx_rls \
  refund_manual_gated \
  beta_early_access
do
  src=$(ls "$ROOT/supabase/migrations/"*"_${f}.sql" 2>/dev/null | head -1 || true)
  if [[ -n "$src" && -f "$src" ]]; then
    cp "$src" "supabase/migrations/$(basename "$src")"
    echo "  synced $(basename "$src")"
  fi
done

echo "==> Pushing migrations..."
npx --yes supabase@latest db push --include-all --yes

echo "==> Growth migrations applied."
