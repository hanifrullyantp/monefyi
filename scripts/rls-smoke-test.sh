#!/usr/bin/env bash
# RLS smoke test — run after supabase db push.
# 1) SQL checks (helpers + policies) via Supabase CLI
# 2) Authenticated REST: sign in as seed owner, INSERT planner_projects + RETURNING
#
# Usage (repo root):
#   export SUPABASE_ACCESS_TOKEN="sbp_..."
#   export SUPABASE_PROJECT_REF="zzwqfmdyncxbolestkqp"
#   ./scripts/rls-smoke-test.sh
#
# Optional env:
#   RLS_TEST_EMAIL=owner-onboard@test.monefyi.app
#   RLS_TEST_PASSWORD=TestOnboard2026!
#   SUPABASE_URL / SUPABASE_ANON_KEY (or loaded from monefyi_planner/.env.local)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/my-supabase-project"

RLS_TEST_EMAIL="${RLS_TEST_EMAIL:-owner-onboard@test.monefyi.app}"
RLS_TEST_PASSWORD="${RLS_TEST_PASSWORD:-TestOnboard2026!}"

load_env() {
  local env_file="$ROOT/monefyi_planner/.env.local"
  if [[ -z "${SUPABASE_URL:-}" && -f "$env_file" ]]; then
    # shellcheck disable=SC1090
    set -a && source "$env_file" && set +a
    SUPABASE_URL="${VITE_SUPABASE_URL:-${NEXT_PUBLIC_SUPABASE_URL:-}}"
    SUPABASE_ANON_KEY="${VITE_SUPABASE_ANON_KEY:-${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}}"
  fi
}

echo "==> RLS smoke test (SQL helpers + policies)"
if [[ -n "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  export SUPABASE_ACCESS_TOKEN
  npx --yes supabase@latest db query --linked < "$ROOT/scripts/rls-smoke-test.sql"
else
  echo "    SKIP: SUPABASE_ACCESS_TOKEN not set (SQL checks need linked project)"
fi

load_env

if [[ -z "${SUPABASE_URL:-}" || -z "${SUPABASE_ANON_KEY:-}" ]]; then
  echo "==> SKIP authenticated API test (set SUPABASE_URL + SUPABASE_ANON_KEY or monefyi_planner/.env.local)"
  exit 0
fi

echo "==> Authenticated API test: sign in as $RLS_TEST_EMAIL"
AUTH_JSON=$(curl -sf "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${RLS_TEST_EMAIL}\",\"password\":\"${RLS_TEST_PASSWORD}\"}") || {
  echo "FAIL: could not sign in (check seed user / password)" >&2
  exit 1
}

ACCESS_TOKEN=$(echo "$AUTH_JSON" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).access_token||'')}catch{console.log('')}})")
USER_ID=$(echo "$AUTH_JSON" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).user?.id||'')}catch{console.log('')}})")

if [[ -z "$ACCESS_TOKEN" ]]; then
  echo "FAIL: no access_token in auth response" >&2
  exit 1
fi

echo "    Signed in user: $USER_ID"

echo "==> Resolve seed org_id"
ORG_JSON=$(curl -sf "${SUPABASE_URL}/rest/v1/planner_org_members?select=org_id&user_id=eq.${USER_ID}&status=eq.active&limit=1" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}") || {
  echo "FAIL: could not load org membership" >&2
  exit 1
}

ORG_ID=$(echo "$ORG_JSON" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const j=JSON.parse(d);console.log(j[0]?.org_id||'')}catch{console.log('')}})")
if [[ -z "$ORG_ID" ]]; then
  echo "FAIL: no active org for test user" >&2
  exit 1
fi
echo "    org_id: $ORG_ID"

echo "==> INSERT planner_projects + RETURNING (42P17 regression test)"
PROJECT_NAME="rls-smoke-$(date +%s)"
INSERT_RESP=$(curl -s -w "\n%{http_code}" "${SUPABASE_URL}/rest/v1/planner_projects" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"org_id\": \"${ORG_ID}\",
    \"name\": \"${PROJECT_NAME}\",
    \"planned_start\": \"2026-06-01\",
    \"planned_end\": \"2026-09-01\",
    \"status\": \"planning\",
    \"created_by\": \"${USER_ID}\"
  }")

HTTP_CODE=$(echo "$INSERT_RESP" | tail -n1)
BODY=$(echo "$INSERT_RESP" | sed '$d')

if [[ "$HTTP_CODE" != "201" ]]; then
  echo "FAIL: INSERT planner_projects HTTP $HTTP_CODE" >&2
  echo "$BODY" >&2
  if echo "$BODY" | grep -q "infinite recursion"; then
    echo "Hint: apply migration 20260601120000_fix_planner_projects_rls.sql" >&2
  fi
  exit 1
fi

PROJECT_ID=$(echo "$BODY" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d)[0].id)}catch{console.log('')}})")
echo "    Created project: $PROJECT_ID"

echo "==> Cleanup test project"
curl -sf -X DELETE "${SUPABASE_URL}/rest/v1/planner_projects?id=eq.${PROJECT_ID}" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" > /dev/null || true

echo "==> HR query: list members + profiles embed"
MEMBERS_RESP=$(curl -s -w "\n%{http_code}" \
  "${SUPABASE_URL}/rest/v1/planner_org_members?select=*,profiles(name,avatar_url)&org_id=eq.${ORG_ID}&status=neq.removed&order=accepted_at.asc" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}")

MEMBERS_CODE=$(echo "$MEMBERS_RESP" | tail -n1)
MEMBERS_BODY=$(echo "$MEMBERS_RESP" | sed '$d')

if [[ "$MEMBERS_CODE" != "200" ]]; then
  echo "FAIL: list members HTTP $MEMBERS_CODE" >&2
  echo "$MEMBERS_BODY" >&2
  exit 1
fi

MEMBER_COUNT=$(echo "$MEMBERS_BODY" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).length)}catch{console.log(0)}})")
if [[ "${MEMBER_COUNT:-0}" -lt 1 ]]; then
  echo "FAIL: expected at least 1 org member" >&2
  exit 1
fi
echo "    Members loaded: $MEMBER_COUNT"

echo ""
echo "RLS smoke test: PASSED"
