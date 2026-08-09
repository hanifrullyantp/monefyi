#!/usr/bin/env bash
# Apply pg_cron jobs for compliance edge functions (requires pg_cron + pg_net extensions).
#
# Usage:
#   export SUPABASE_ACCESS_TOKEN="sbp_..."
#   export SUPABASE_PROJECT_REF="zzwqfmdyncxbolestkqp"
#   export CRON_SECRET="your-secret"
#   ./scripts/apply-compliance-crons.sh
#
# Skips gracefully if CRON_SECRET unset.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/my-supabase-project"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

if [[ -z "${CRON_SECRET:-}" ]]; then
  echo "Skip: set CRON_SECRET to apply pg_cron jobs (see scripts/setup-compliance-crons.sh)"
  exit 0
fi

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "Error: set SUPABASE_ACCESS_TOKEN" >&2
  exit 1
fi

export SUPABASE_ACCESS_TOKEN
PROJECT_REF="${SUPABASE_PROJECT_REF:-zzwqfmdyncxbolestkqp}"
BASE="https://${PROJECT_REF}.supabase.co/functions/v1"

if [[ -n "${SUPABASE_PROJECT_REF:-}" ]]; then
  echo "==> Linking $SUPABASE_PROJECT_REF"
  npx --yes supabase@latest link --project-ref "$SUPABASE_PROJECT_REF" >/dev/null
fi

# Escape single quotes for SQL string literal
ESCAPED_SECRET="${CRON_SECRET//\'/\'\'}"

read -r -d '' SQL <<EOSQL || true
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

SELECT cron.unschedule(jobid) FROM cron.job
WHERE jobname IN ('monefyi-account-purge-daily', 'monefyi-weekly-digest-sunday');

SELECT cron.schedule(
  'monefyi-account-purge-daily',
  '0 3 * * *',
  \$\$
  SELECT net.http_post(
    url := '${BASE}/monefyi-account-purge',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', '${ESCAPED_SECRET}'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  \$\$
);

SELECT cron.schedule(
  'monefyi-weekly-digest-sunday',
  '0 12 * * 0',
  \$\$
  SELECT net.http_post(
    url := '${BASE}/monefyi-weekly-digest-cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', '${ESCAPED_SECRET}'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  \$\$
);

SELECT jobname, schedule, command FROM cron.job
WHERE jobname LIKE 'monefyi-%';
EOSQL

echo "==> Applying pg_cron schedules..."
echo "$SQL" | npx --yes supabase@latest db query --linked

echo ""
echo "Done. Cron jobs:"
echo "  monefyi-account-purge-daily     0 3 * * * UTC"
echo "  monefyi-weekly-digest-sunday    0 12 * * 0 UTC (19:00 WIB)"
