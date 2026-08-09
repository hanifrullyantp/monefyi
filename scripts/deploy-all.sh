#!/usr/bin/env bash
# Deploy all Monefyi Supabase migrations + edge functions.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> 1/3 Product-marketing migrations"
./scripts/deploy-monefyi-product-marketing.sh

echo "==> 2/3 Growth migrations"
./scripts/deploy-growth-migrations.sh

echo "==> 3/3 Compliance edge functions"
./scripts/deploy-compliance-functions.sh

echo ""
echo "All deploy steps finished."
echo "Set secrets: RESEND_API_KEY, CRON_SECRET, APP_URL, LYNK_API_KEY (optional)"
echo "Cron (UTC): daily 0 3 * * * → monefyi-account-purge; 0 12 * * 0 → monefyi-weekly-digest-cron"
echo "Both require header x-cron-secret"
