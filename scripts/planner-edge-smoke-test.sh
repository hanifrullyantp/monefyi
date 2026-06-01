#!/usr/bin/env bash
# Edge function smoke test — run after deploying Supabase functions.
# Tests landing config (GET/POST), admin auth, and a read-only planner function.
#
# Usage (repo root):
#   export SUPABASE_ACCESS_TOKEN="sbp_..."   # optional (not required here)
#   export ADMIN_TEST_EMAIL="hanif.rullyant@gmail.com"
#   export ADMIN_TEST_PASSWORD="..."         # required for admin POST tests
#   ./scripts/planner-edge-smoke-test.sh
#
# Optional env:
#   RLS_TEST_EMAIL=owner-onboard@test.monefyi.app
#   RLS_TEST_PASSWORD=TestOnboard2026!
#   SUPABASE_URL / SUPABASE_ANON_KEY (or loaded from monefyi_planner/.env.local)
#   SKIP_EDGE_ADMIN=1  — skip admin-only tests if password not available

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

ADMIN_TEST_EMAIL="${ADMIN_TEST_EMAIL:-hanif.rullyant@gmail.com}"
RLS_TEST_EMAIL="${RLS_TEST_EMAIL:-owner-onboard@test.monefyi.app}"
RLS_TEST_PASSWORD="${RLS_TEST_PASSWORD:-TestOnboard2026!}"
LANDING_SLUG="${LANDING_SLUG:-planner}"

load_env() {
  local env_file="$ROOT/monefyi_planner/.env.local"
  if [[ -z "${SUPABASE_URL:-}" && -f "$env_file" ]]; then
    # shellcheck disable=SC1090
    set -a && source "$env_file" && set +a
    SUPABASE_URL="${VITE_SUPABASE_URL:-${NEXT_PUBLIC_SUPABASE_URL:-}}"
    SUPABASE_ANON_KEY="${VITE_SUPABASE_ANON_KEY:-${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}}"
  fi
}

json_field() {
  local json="$1"
  local field="$2"
  echo "$json" | node -e "
    let d='';
    process.stdin.on('data', c => d += c);
    process.stdin.on('end', () => {
      try {
        const j = JSON.parse(d);
        const val = ${field};
        console.log(val ?? '');
      } catch {
        console.log('');
      }
    });
  "
}

sign_in() {
  local email="$1"
  local password="$2"
  local auth_json
  auth_json=$(curl -sf "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
    -H "apikey: ${SUPABASE_ANON_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${email}\",\"password\":\"${password}\"}") || return 1
  echo "$auth_json"
}

invoke_function() {
  local name="$1"
  local token="$2"
  local body="${3:-{}}"
  local tmp
  tmp=$(mktemp)
  printf '%s' "$body" > "$tmp"
  curl -s -w "\n%{http_code}" "${SUPABASE_URL}/functions/v1/${name}" \
    -X POST \
    -H "apikey: ${SUPABASE_ANON_KEY}" \
    -H "Authorization: Bearer ${token}" \
    -H "Content-Type: application/json" \
    --data-binary "@${tmp}"
  rm -f "$tmp"
}

assert_http() {
  local label="$1"
  local expected="$2"
  local actual="$3"
  local body="$4"
  if [[ "$actual" != "$expected" ]]; then
    echo "FAIL: ${label} — expected HTTP ${expected}, got ${actual}" >&2
    echo "$body" >&2
    exit 1
  fi
  echo "    OK: ${label} (HTTP ${actual})"
}

load_env

if [[ -z "${SUPABASE_URL:-}" || -z "${SUPABASE_ANON_KEY:-}" ]]; then
  echo "FAIL: set SUPABASE_URL + SUPABASE_ANON_KEY or monefyi_planner/.env.local" >&2
  exit 1
fi

BASE="${SUPABASE_URL%/}/functions/v1/monefyi-landing-config"

echo "==> Edge smoke: GET landing (anon)"
GET_RESP=$(curl -s -w "\n%{http_code}" "${BASE}?slug=${LANDING_SLUG}" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json")
GET_CODE=$(echo "$GET_RESP" | tail -n1)
GET_BODY=$(echo "$GET_RESP" | sed '$d')
assert_http "GET monefyi-landing-config" "200" "$GET_CODE" "$GET_BODY"

echo "==> Edge smoke: OPTIONS preflight"
OPT_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS "${BASE}?slug=${LANDING_SLUG}" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Access-Control-Request-Method: POST" \
  -H "Origin: http://localhost:5173")
assert_http "OPTIONS monefyi-landing-config" "200" "$OPT_CODE" ""

echo "==> Edge smoke: sign in owner ($RLS_TEST_EMAIL)"
OWNER_AUTH=$(sign_in "$RLS_TEST_EMAIL" "$RLS_TEST_PASSWORD") || {
  echo "FAIL: could not sign in owner seed user" >&2
  exit 1
}
OWNER_TOKEN=$(json_field "$OWNER_AUTH" "j.access_token")

echo "==> Edge smoke: POST landing as owner (expect 403)"
OWNER_POST=$(invoke_function "monefyi-landing-config" "$OWNER_TOKEN" "{\"slug\":\"${LANDING_SLUG}\",\"content\":{\"version\":1,\"smoke\":\"owner-denied\"}}")
OWNER_POST_CODE=$(echo "$OWNER_POST" | tail -n1)
OWNER_POST_BODY=$(echo "$OWNER_POST" | sed '$d')
assert_http "POST landing as owner" "403" "$OWNER_POST_CODE" "$OWNER_POST_BODY"

echo "==> Edge smoke: planner-search-companies as owner"
SEARCH_RESP=$(invoke_function "planner-search-companies" "$OWNER_TOKEN" '{"q":"test"}')
SEARCH_CODE=$(echo "$SEARCH_RESP" | tail -n1)
SEARCH_BODY=$(echo "$SEARCH_RESP" | sed '$d')
assert_http "planner-search-companies" "200" "$SEARCH_CODE" "$SEARCH_BODY"

echo "==> Edge smoke: monefyi-admin-platform-stats as owner (expect 403)"
OWNER_STATS=$(invoke_function "monefyi-admin-platform-stats" "$OWNER_TOKEN" '{}')
OWNER_STATS_CODE=$(echo "$OWNER_STATS" | tail -n1)
OWNER_STATS_BODY=$(echo "$OWNER_STATS" | sed '$d')
assert_http "admin stats as owner" "403" "$OWNER_STATS_CODE" "$OWNER_STATS_BODY"

if [[ "${SKIP_EDGE_ADMIN:-}" == "1" || -z "${ADMIN_TEST_PASSWORD:-}" ]]; then
  echo "==> SKIP admin landing save tests (set ADMIN_TEST_PASSWORD or unset SKIP_EDGE_ADMIN)"
  echo ""
  echo "Edge smoke test: PASSED (admin tests skipped)"
  exit 0
fi

echo "==> Edge smoke: sign in admin ($ADMIN_TEST_EMAIL)"
ADMIN_AUTH=$(sign_in "$ADMIN_TEST_EMAIL" "$ADMIN_TEST_PASSWORD") || {
  echo "FAIL: could not sign in admin user" >&2
  exit 1
}
ADMIN_TOKEN=$(json_field "$ADMIN_AUTH" "j.access_token")

SMOKE_MARKER="edge-smoke-$(date +%s)"
SAVE_TMP=$(mktemp)
node -e "
const marker = process.argv[1];
const slug = process.argv[2];
const fs = require('fs');
const payload = {
  slug,
  content: {
    version: 1,
    brand: { logoUrl: '', primaryColor: '#000', secondaryColor: '#fff', productName: 'Smoke', productAccent: 'Test' },
    seo: { title: marker, description: marker },
    hero: { badge: marker, title: marker, titleHighlight: marker, subtitle: marker, ctaPrimary: 'Go', ctaSecondary: 'Learn' },
    stats: [],
    featuresSection: { eyebrow: marker, title: marker, subtitle: marker },
    features: [],
    howItWorks: { eyebrow: marker, title: marker, titleHighlight: marker, subtitle: marker },
    testimonialsSection: { title: marker },
    testimonials: [],
    pricingSection: { title: marker, subtitle: marker },
    plans: [],
    cta: { title: marker, titleBreak: marker, subtitle: marker, button: marker },
    footer: { tagline: marker, copyright: marker },
    _smokeMarker: marker,
  },
};
fs.writeFileSync(process.argv[3], JSON.stringify(payload));
" "$SMOKE_MARKER" "$LANDING_SLUG" "$SAVE_TMP"

echo "==> Edge smoke: POST landing save as admin"
ADMIN_POST=$(curl -s -w "\n%{http_code}" "${SUPABASE_URL}/functions/v1/monefyi-landing-config" \
  -X POST \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  --data-binary "@${SAVE_TMP}")
rm -f "$SAVE_TMP"
ADMIN_POST_CODE=$(echo "$ADMIN_POST" | tail -n1)
ADMIN_POST_BODY=$(echo "$ADMIN_POST" | sed '$d')
assert_http "POST landing as admin" "200" "$ADMIN_POST_CODE" "$ADMIN_POST_BODY"

echo "==> Edge smoke: GET landing after save (verify marker)"
GET2_RESP=$(curl -s -w "\n%{http_code}" "${BASE}?slug=${LANDING_SLUG}" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json")
GET2_CODE=$(echo "$GET2_RESP" | tail -n1)
GET2_BODY=$(echo "$GET2_RESP" | sed '$d')
assert_http "GET landing after save" "200" "$GET2_CODE" "$GET2_BODY"

if ! echo "$GET2_BODY" | grep -q "$SMOKE_MARKER"; then
  echo "FAIL: saved landing content marker not found in GET response" >&2
  echo "$GET2_BODY" >&2
  exit 1
fi
echo "    OK: landing round-trip verified (marker: $SMOKE_MARKER)"

echo "==> Edge smoke: monefyi-admin-platform-stats as admin"
ADMIN_STATS=$(invoke_function "monefyi-admin-platform-stats" "$ADMIN_TOKEN" '{}')
ADMIN_STATS_CODE=$(echo "$ADMIN_STATS" | tail -n1)
ADMIN_STATS_BODY=$(echo "$ADMIN_STATS" | sed '$d')
assert_http "admin stats as admin" "200" "$ADMIN_STATS_CODE" "$ADMIN_STATS_BODY"

echo ""
echo "Edge smoke test: PASSED"
