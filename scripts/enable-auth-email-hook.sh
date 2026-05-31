#!/usr/bin/env bash
# Enable Supabase Send Email hook → auth-send-email (Resend API).
# Requires: SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_REF
set -euo pipefail

PROJECT_REF="${SUPABASE_PROJECT_REF:-zzwqfmdyncxbolestkqp}"
HOOK_URI="https://${PROJECT_REF}.supabase.co/functions/v1/auth-send-email"

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "Error: set SUPABASE_ACCESS_TOKEN" >&2
  exit 1
fi

if [[ -z "${SEND_EMAIL_HOOK_SECRET:-}" ]]; then
  SEND_EMAIL_HOOK_SECRET="v1,whsec_$(openssl rand -base64 32 | tr -d '\n')"
  echo "Generated SEND_EMAIL_HOOK_SECRET (save this): ${SEND_EMAIL_HOOK_SECRET}"
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/my-supabase-project"

echo "==> Setting edge secrets..."
npx --yes supabase@latest secrets set \
  "SEND_EMAIL_HOOK_SECRET=${SEND_EMAIL_HOOK_SECRET}" \
  --project-ref "$PROJECT_REF"

echo "==> Deploying auth-send-email (no JWT)..."
npx --yes supabase@latest functions deploy auth-send-email \
  --project-ref "$PROJECT_REF" \
  --no-verify-jwt

echo "==> Enabling Send Email hook + planner redirect URLs..."
PATCH_BODY=$(HOOK_URI="$HOOK_URI" SEND_EMAIL_HOOK_SECRET="$SEND_EMAIL_HOOK_SECRET" node <<'NODE'
const body = {
  hook_send_email_enabled: true,
  hook_send_email_uri: process.env.HOOK_URI,
  hook_send_email_secrets: process.env.SEND_EMAIL_HOOK_SECRET,
  site_url: "https://planner.monefyi.com",
  uri_allow_list:
    "https://planner.monefyi.com/**,https://monefyi-planner.vercel.app/**,http://localhost:5173/**",
  rate_limit_email_sent: 30,
};
process.stdout.write(JSON.stringify(body));
NODE
)

curl -sS -X PATCH "https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$PATCH_BODY"
echo ""

echo ""
echo "Done. Auth emails now use Resend API via auth-send-email hook."
echo "SMTP is bypassed when hook is enabled."
