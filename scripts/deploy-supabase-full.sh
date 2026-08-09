#!/usr/bin/env bash
# Full Supabase deploy: migrations + all edge functions + secrets + crons.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f my-supabase-project/.env ]]; then
  set -a
  # shellcheck disable=SC1091
  source my-supabase-project/.env
  set +a
fi

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "Error: set SUPABASE_ACCESS_TOKEN in my-supabase-project/.env" >&2
  exit 1
fi

export SUPABASE_ACCESS_TOKEN

echo "==> 1/4 Migrations + edge functions"
./scripts/deploy-all.sh

echo "==> 2/4 Secrets"
if [[ -z "${CRON_SECRET:-}" ]]; then
  CRON_SECRET=$(openssl rand -hex 32)
  echo "    Setting CRON_SECRET (new) + REFUND_AUTO_LYNK_ENABLED=false"
  cd my-supabase-project
  npx --yes supabase@latest secrets set \
    CRON_SECRET="$CRON_SECRET" \
    REFUND_AUTO_LYNK_ENABLED=false \
    APP_URL="${APP_URL:-https://monefyi.com/app}"
  cd ..
  export CRON_SECRET
else
  echo "    CRON_SECRET from env — skipping regenerate"
  cd my-supabase-project
  npx --yes supabase@latest secrets set REFUND_AUTO_LYNK_ENABLED=false APP_URL="${APP_URL:-https://monefyi.com/app}"
  cd ..
fi

echo "==> 3/4 pg_cron schedules"
./scripts/apply-compliance-crons.sh

echo "==> 4/4 Verify tables"
cd my-supabase-project
npx --yes supabase@latest db query --linked \
  "SELECT COUNT(*) AS flags FROM feature_flags WHERE status='active';" 2>&1 | tail -5

echo ""
echo "✅ Supabase full deploy complete (project ${SUPABASE_PROJECT_REF:-zzwqfmdyncxbolestkqp})"
