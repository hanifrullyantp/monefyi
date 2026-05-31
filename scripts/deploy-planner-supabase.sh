#!/usr/bin/env bash
# Deploy Planner schema + Edge Functions to the linked Supabase project.
# Prerequisites:
#   - SUPABASE_ACCESS_TOKEN from https://supabase.com/dashboard/account/tokens
#   - SUPABASE_PROJECT_REF (Settings → General → Reference ID), or rely on existing link
#
# Usage (from repo root):
#   export SUPABASE_ACCESS_TOKEN="sbp_..."
#   export SUPABASE_PROJECT_REF="your-project-ref"
#   ./scripts/deploy-planner-supabase.sh
#
# Optional: skip migrations
#   SKIP_DB_PUSH=1 ./scripts/deploy-planner-supabase.sh

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
else
  echo "==> Skipping db push (SKIP_DB_PUSH=1)"
fi

PLANNER_FUNCTIONS=(
  planner-analyze
  planner-parse-command
  planner-create-owner-org
  planner-validate-invitation
  planner-create-invitation
  planner-accept-invitation
  planner-send-invitation-email
  planner-revoke-invitation
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
)

echo "==> Deploying ${#PLANNER_FUNCTIONS[@]} Edge Functions..."
for fn in "${PLANNER_FUNCTIONS[@]}"; do
  echo "    → $fn"
  npx --yes supabase@latest functions deploy "$fn"
done

echo ""
echo "Done. Set Edge Function secrets in Supabase Dashboard if needed:"
echo "  RESEND_API_KEY, RESEND_FROM_EMAIL, APP_URL, APP_CORS_ORIGIN, GEMINI_API_KEY"
