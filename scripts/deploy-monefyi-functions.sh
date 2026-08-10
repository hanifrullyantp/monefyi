#!/usr/bin/env bash
# Deploy all Monefyi PWA edge functions (app + admin + payments).
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

# Core app
CORE_FNS=(
  asfin-parse-transaction
  ai-user-coach
  monefyi-generate-insights
  monefyi-voice-transcribe
  monevisor-apply-action
  start-trial
  lynk-webhook
  email-import
  email-drip
  monefyi-landing-config
  monefyi-user-account
  ai-quota-status
)

# Admin console
ADMIN_FNS=(
  monefyi-admin-app-config
  monefyi-admin-update-user
  monefyi-admin-revenue
  monefyi-admin-users
  monefyi-admin-dashboard
  monefyi-admin-analytics
  monefyi-public-config
  monefyi-admin-test-lab
  monefyi-admin-feedback
  monefyi-admin-company-types
  monefyi-admin-platform-stats
  monefyi-upload-logo
)

# Compliance (also in deploy-compliance-functions.sh)
COMPLIANCE_FNS=(
  monefyi-compliance-notify
  monefyi-account-purge
  monefyi-refund-lynk
  monefyi-weekly-digest-cron
)

ALL=("${CORE_FNS[@]}" "${ADMIN_FNS[@]}" "${COMPLIANCE_FNS[@]}")

for fn in "${ALL[@]}"; do
  if [[ ! -d "supabase/functions/$fn" ]]; then
    echo "Skip (missing): $fn"
    continue
  fi
  echo "==> Deploy $fn"
  case "$fn" in
    lynk-webhook|email-drip|monefyi-account-purge|monefyi-weekly-digest-cron|monefyi-refund-lynk|monefyi-public-config)
      npx --yes supabase@latest functions deploy "$fn" --no-verify-jwt
      ;;
    *)
      npx --yes supabase@latest functions deploy "$fn"
      ;;
  esac
done

echo ""
echo "Monefyi edge functions deploy finished (${#ALL[@]} targets)."
