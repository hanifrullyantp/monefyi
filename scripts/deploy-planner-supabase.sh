#!/usr/bin/env bash
# Deploy Planner schema + Edge Functions to the linked Supabase project.
# Prerequisites:
#   - SUPABASE_ACCESS_TOKEN from https://supabase.com/dashboard/account/tokens
#   - SUPABASE_PROJECT_REF (Settings → General → Reference ID), or rely on existing link
#
# Usage (from repo root):
#   export SUPABASE_ACCESS_TOKEN="sbp_YOUR_TOKEN"
#   export SUPABASE_PROJECT_REF="zzwqfmdyncxbolestkqp"
#   ./scripts/deploy-planner-supabase.sh
#
# Optional: skip migrations or smoke tests
#   SKIP_DB_PUSH=1 ./scripts/deploy-planner-supabase.sh
#   SKIP_RLS_SMOKE=1 ./scripts/deploy-planner-supabase.sh
#   SKIP_EDGE_SMOKE=1 ./scripts/deploy-planner-supabase.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/my-supabase-project"

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "Error: set SUPABASE_ACCESS_TOKEN (Supabase dashboard → Account → Access Tokens)." >&2
  exit 1
fi

export SUPABASE_ACCESS_TOKEN

if [[ -n "${SUPABASE_PROJECT_REF:-}" ]]; then
  echo "==> Linking project $SUPABASE_PROJECT_REF..."
  npx --yes supabase@latest link --project-ref "$SUPABASE_PROJECT_REF"
fi

if [[ "${SKIP_DB_PUSH:-}" != "1" ]]; then
  echo "==> Pushing database migrations..."
  npx --yes supabase@latest db push
  if [[ "${SKIP_RLS_SMOKE:-}" != "1" ]]; then
    echo "==> Running RLS smoke test..."
    "$ROOT/scripts/rls-smoke-test.sh" || {
      echo "Warning: RLS smoke test failed (set SKIP_RLS_SMOKE=1 to skip)" >&2
      exit 1
    }
  fi
else
  echo "==> Skipping db push (SKIP_DB_PUSH=1)"
fi

PLANNER_FUNCTIONS=(
  auth-send-email
  planner-analyze
  planner-parse-command
  planner-create-owner-org
  planner-validate-invitation
  planner-create-invitation
  planner-accept-invitation
  planner-send-invitation-email
  planner-revoke-invitation
  planner-submit-join-request
  planner-approve-join-request
  planner-reject-join-request
  planner-change-member-role
  planner-remove-member
  planner-transfer-ownership
  planner-search-companies
  planner-try-domain-join
  monefyi-admin-users
  monefyi-admin-update-user
  monefyi-admin-app-config
  monefyi-admin-platform-stats
  monefyi-admin-company-types
  monefyi-user-account
  monefyi-landing-config
)

NO_VERIFY_JWT_FUNCTIONS=(
  auth-send-email
  monefyi-landing-config
)

echo "==> Deploying ${#PLANNER_FUNCTIONS[@]} Edge Functions..."
for fn in "${PLANNER_FUNCTIONS[@]}"; do
  echo "    → $fn"
  no_verify=0
  for nv in "${NO_VERIFY_JWT_FUNCTIONS[@]}"; do
    if [[ "$fn" == "$nv" ]]; then
      no_verify=1
      break
    fi
  done
  if [[ "$no_verify" == "1" ]]; then
    npx --yes supabase@latest functions deploy "$fn" --no-verify-jwt
  else
    npx --yes supabase@latest functions deploy "$fn"
  fi
done

if [[ "${SKIP_EDGE_SMOKE:-}" != "1" ]]; then
  echo "==> Running edge function smoke test..."
  "$ROOT/scripts/planner-edge-smoke-test.sh" || {
    echo "Warning: edge smoke test failed (set SKIP_EDGE_SMOKE=1 to skip)" >&2
    exit 1
  }
fi

echo ""
echo "Done. Set Edge Function secrets in Supabase Dashboard if needed:"
echo "  RESEND_API_KEY, RESEND_FROM_EMAIL, SEND_EMAIL_HOOK_SECRET, APP_URL, APP_CORS_ORIGIN, GEMINI_API_KEY"
echo ""
echo "Auth signup emails: ./scripts/enable-auth-email-hook.sh"
