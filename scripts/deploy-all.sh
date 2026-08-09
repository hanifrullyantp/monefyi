#!/usr/bin/env bash
# Deploy all Monefyi Supabase migrations + edge functions.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> 1/3 Product-marketing migrations"
./scripts/deploy-monefyi-product-marketing.sh

echo "==> 2/3 Growth migrations"
./scripts/deploy-growth-migrations.sh

echo "==> 3/4 Compliance edge functions"
./scripts/deploy-compliance-functions.sh

echo "==> 4/4 Monefyi app + admin edge functions"
./scripts/deploy-monefyi-functions.sh

echo ""
echo "All deploy steps finished."
echo "Secrets: RESEND_API_KEY, CRON_SECRET, APP_URL (set via supabase secrets set)"
echo "Cron: ./scripts/apply-compliance-crons.sh (after CRON_SECRET is set)"
echo "Refund Lynk auto: OFF — manual super-admin flow only"
