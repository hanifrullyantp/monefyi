#!/usr/bin/env bash
# Reference: schedule compliance crons in Supabase Dashboard → Edge Functions → Cron
# Or use pg_cron + http extension if enabled on your project.
#
# Required secrets (Project Settings → Edge Functions):
#   RESEND_API_KEY, CRON_SECRET, APP_URL
# Optional: LYNK_API_KEY, LYNK_REFUND_API_URL
#
# Cron jobs (UTC):
#   monefyi-account-purge       0 3 * * *     (daily 10:00 WIB)
#   monefyi-weekly-digest-cron  0 12 * * 0    (Sunday 19:00 WIB)
#
# Both POST with header: x-cron-secret: $CRON_SECRET

set -euo pipefail

PROJECT_REF="${SUPABASE_PROJECT_REF:-zzwqfmdyncxbolestkqp}"
BASE="https://${PROJECT_REF}.supabase.co/functions/v1"

echo "Compliance cron endpoints:"
echo "  POST ${BASE}/monefyi-account-purge"
echo "  POST ${BASE}/monefyi-weekly-digest-cron"
echo ""
echo "Test purge (requires CRON_SECRET in env):"
echo "  curl -X POST '${BASE}/monefyi-account-purge' -H 'x-cron-secret: \$CRON_SECRET'"
echo ""
echo "Configure in Supabase Dashboard → Database → Extensions → pg_cron"
echo "or Edge Functions scheduled invocations when available."
