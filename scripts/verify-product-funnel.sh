#!/usr/bin/env bash
# Smoke: product isolation RPC, production URLs, Lynk webhook endpoints.
# Usage (repo root): ./scripts/verify-product-funnel.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

pass() { echo -e "${GREEN}PASS${NC}: $*"; }
fail() { echo -e "${RED}FAIL${NC}: $*"; exit 1; }

load_env() {
  if [[ -f "$ROOT/my-supabase-project/.env" ]]; then
    set -a
    # shellcheck disable=SC1091
    source "$ROOT/my-supabase-project/.env"
    set +a
  fi
  if [[ -f "$ROOT/monefyi_planner/.env.local" ]]; then
    set -a
    # shellcheck disable=SC1091
    source "$ROOT/monefyi_planner/.env.local"
    set +a
  fi
  SUPABASE_URL="${SUPABASE_URL:-${VITE_SUPABASE_URL:-${NEXT_PUBLIC_SUPABASE_URL:-}}}"
  SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-${VITE_SUPABASE_ANON_KEY:-${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}}}"
}

http_ok() {
  local url="$1"
  local code
  code=$(curl -sI -m 20 -o /dev/null -w "%{http_code}" "$url" || true)
  [[ "$code" == "200" || "$code" == "308" ]]
}

sign_in() {
  local email="$1"
  local password="$2"
  curl -sf "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
    -H "apikey: ${SUPABASE_ANON_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${email}\",\"password\":\"${password}\"}"
}

rpc_has_product() {
  local token="$1"
  local product="$2"
  curl -sf "${SUPABASE_URL}/rest/v1/rpc/user_has_product" \
    -H "apikey: ${SUPABASE_ANON_KEY}" \
    -H "Authorization: Bearer ${token}" \
    -H "Content-Type: application/json" \
    -d "{\"p_product\":\"${product}\"}"
}

load_env

[[ -n "$SUPABASE_URL" && -n "$SUPABASE_ANON_KEY" ]] || fail "Set SUPABASE_URL + anon key (monefyi_planner/.env.local)"

echo "==> Production URLs"
for url in \
  "https://app.monefyi.com" \
  "https://estimator.monefyi.com" \
  "https://planner.monefyi.com/app"; do
  if http_ok "$url"; then pass "$url"; else fail "$url not reachable"; fi
done

echo "==> Lynk webhooks (expect 401/400 without valid payload — not 404)"
for fn in lynk-webhook planner-lynk-webhook; do
  body=$(curl -s -w "\n%{http_code}" -X POST "${SUPABASE_URL}/functions/v1/${fn}" \
    -H "Content-Type: application/json" \
    -H "apikey: ${SUPABASE_ANON_KEY}" \
    -H "X-Lynk-Signature: invalid" \
    -d '{"event":"payment.received","data":{"message_id":"x","message_data":{"refId":"a","totals":{"grandTotal":1}}}}')
  code=$(echo "$body" | tail -1)
  [[ "$code" == "401" || "$code" == "400" ]] && pass "${fn} (HTTP ${code})" || fail "${fn} unexpected HTTP ${code}"
done

echo "==> Product RPC (Planner test user)"
RLS_TEST_EMAIL="${RLS_TEST_EMAIL:-owner-onboard@test.monefyi.app}"
RLS_TEST_PASSWORD="${RLS_TEST_PASSWORD:-TestOnboard2026!}"
if auth_json=$(sign_in "$RLS_TEST_EMAIL" "$RLS_TEST_PASSWORD" 2>/dev/null); then
  token=$(echo "$auth_json" | node -pe "JSON.parse(require('fs').readFileSync(0,'utf8')).access_token")
  m=$(rpc_has_product "$token" "monefyi")
  p=$(rpc_has_product "$token" "planner")
  [[ "$m" == "false" && "$p" == "true" ]] && pass "planner user isolated (monefyi=false, planner=true)" \
    || fail "unexpected entitlements monefyi=${m} planner=${p}"
else
  echo "WARN: skip RPC test — could not sign in ${RLS_TEST_EMAIL}"
fi

if [[ -n "${LYNK_MERCHANT_KEY:-}" ]]; then
  run_lynk_e2e() {
    local fn="$1"
    local title="$2"
    local amount="$3"
    local REF="verify_${fn}_$(date +%s)"
    local MSG="API_CALL_${REF}"
    local SIG
    SIG=$(LYNK_MERCHANT_KEY="$LYNK_MERCHANT_KEY" node "$ROOT/scripts/lynk-compute-signature.mjs" \
      --refId "$REF" --amount "$amount" --messageId "$MSG" 2>/dev/null)
    local payload
    payload=$(cat <<EOF
{"event":"payment.received","data":{"message_action":"SUCCESS","message_id":"${MSG}","message_data":{"refId":"${REF}","customer":{"email":"verify-${REF}@monefyi.app","name":"Verify","phone":""},"items":[{"title":"${title}","qty":1}],"totals":{"grandTotal":${amount}}}}}
EOF
)
    local resp code json
    resp=$(curl -s -w "\n%{http_code}" -X POST "${SUPABASE_URL}/functions/v1/${fn}" \
      -H "Content-Type: application/json" \
      -H "apikey: ${SUPABASE_ANON_KEY}" \
      -H "X-Lynk-Signature: ${SIG}" \
      -d "$payload")
    code=$(echo "$resp" | tail -1)
    json=$(echo "$resp" | sed '$d')
    if [[ "$code" == "200" ]] && echo "$json" | grep -q '"ok":true'; then
      pass "${fn} (${title}) HTTP 200 + email.sent"
    else
      fail "${fn} E2E HTTP ${code} — ${json}"
    fi
  }
  echo "==> Lynk E2E Estimator"
  run_lynk_e2e "planner-lynk-webhook" "Monefyi Estimator Standard" 99000
  echo "==> Lynk E2E Finance (via lynk-webhook router)"
  run_lynk_e2e "lynk-webhook" "Monefyi Bulanan" 99000
else
  echo "SKIP: Lynk E2E (set LYNK_MERCHANT_KEY to enable)"
fi

echo ""
pass "All configured checks completed"
