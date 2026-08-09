#!/usr/bin/env bash
# Reference: schedule compliance crons for edge functions.
#
# Quick apply (pg_cron + pg_net):
#   export CRON_SECRET="..."
#   export SUPABASE_ACCESS_TOKEN="..."
#   ./scripts/apply-compliance-crons.sh
#
# Required secrets (Project Settings → Edge Functions):
#   RESEND_API_KEY, CRON_SECRET, APP_URL
#
# Cron jobs (UTC):
#   monefyi-account-purge       0 3 * * *     (daily 10:00 WIB)
#   monefyi-weekly-digest-cron  0 12 * * 0    (Sunday 19:00 WIB)
#
# Both POST with header: x-cron-secret: $CRON_SECRET

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
"$ROOT/scripts/apply-compliance-crons.sh" 2>/dev/null || true

PROJECT_REF="${SUPABASE_PROJECT_REF:-zzwqfmdyncxbolestkqp}"
BASE="https://${PROJECT_REF}.supabase.co/functions/v1"

echo ""
echo "Compliance cron endpoints:"
echo "  POST ${BASE}/monefyi-account-purge"
echo "  POST ${BASE}/monefyi-weekly-digest-cron"
echo ""
echo "Manual test:"
echo "  curl -X POST '${BASE}/monefyi-account-purge' -H 'x-cron-secret: \$CRON_SECRET'"
