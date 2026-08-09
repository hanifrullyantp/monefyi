#!/usr/bin/env bash
# Deploy compliance edge functions + optional cron note.
#
# Functions:
#   monefyi-compliance-notify — deletion/refund emails
#   monefyi-account-purge     — hard delete after 30-day window (call with x-cron-secret)
#
# Schedule purge daily (Supabase Dashboard → Edge Functions → Cron):
#   POST .../monefyi-account-purge  Header: x-cron-secret: $CRON_SECRET
#
# Usage:
#   export SUPABASE_ACCESS_TOKEN="sbp_..."
#   export SUPABASE_PROJECT_REF="your-project-ref"
#   ./scripts/deploy-compliance-functions.sh

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

echo "==> Deploy monefyi-compliance-notify"
npx --yes supabase@latest functions deploy monefyi-compliance-notify --no-verify-jwt

echo "==> Deploy monefyi-account-purge (requires CRON_SECRET + x-cron-secret header)"
npx --yes supabase@latest functions deploy monefyi-account-purge --no-verify-jwt

echo "==> Deploy monefyi-refund-lynk"
npx --yes supabase@latest functions deploy monefyi-refund-lynk --no-verify-jwt

echo "==> Deploy monefyi-weekly-digest-cron"
npx --yes supabase@latest functions deploy monefyi-weekly-digest-cron --no-verify-jwt

echo ""
echo "Done. Set secrets: RESEND_API_KEY, CRON_SECRET, APP_URL, LYNK_API_KEY (optional)"
echo "Cron schedules (UTC):"
echo "  - monefyi-account-purge: daily 0 3 * * *"
echo "  - monefyi-weekly-digest-cron: 0 12 * * 0 (19:00 WIB Sunday)"
