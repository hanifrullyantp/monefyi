#!/usr/bin/env bash
# Push Product-Marketing Sync migrations (Sprint 1–6) to linked Supabase project.
#
# Usage:
#   export SUPABASE_ACCESS_TOKEN="sbp_..."
#   export SUPABASE_PROJECT_REF="your-project-ref"
#   ./scripts/deploy-monefyi-product-marketing.sh
#
# Loads my-supabase-project/.env when present.

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

echo "==> Pushing migrations (include-all for out-of-order timestamps)..."
npx --yes supabase@latest db push --include-all --yes

echo "==> Verify feature_flags seed"
npx --yes supabase@latest db query --linked \
  "SELECT key, enabled, rollout_pct, status FROM public.feature_flags ORDER BY key;"

echo ""
echo "Done. Migrations applied:"
echo "  20260809140000_product_marketing_sync.sql"
echo "  20260809150000_marketing_contextual_offers.sql"
echo "  20260809160000_sprint3_pro_features.sql"
echo "  20260809170000_sprint4_marketing_advanced.sql"
echo "  20260809180000_sprint5_feature_flags.sql"
echo "  20260809190000_sprint6_beta_launch.sql"
echo "  20260809240000_product_marketing_compliance.sql"
