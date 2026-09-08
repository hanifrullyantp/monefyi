#!/usr/bin/env bash
# Patch Supabase Auth redirect URLs for planner + estimator domains.
# Requires: SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_REF (default zzwqfmdyncxbolestkqp)
set -euo pipefail

PROJECT_REF="${SUPABASE_PROJECT_REF:-zzwqfmdyncxbolestkqp}"

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "Error: set SUPABASE_ACCESS_TOKEN" >&2
  exit 1
fi

REDIRECT_URLS=(
  "https://planner.monefyi.com/**"
  "https://estimator.monefyi.com/**"
  "https://monefyi-planner.vercel.app/**"
  "https://app.planner.monefyi.com/**"
  "http://localhost:5173/**"
  "http://localhost:3000/**"
)

URI_ALLOW_LIST=$(IFS=,; echo "${REDIRECT_URLS[*]}")

echo "==> Fetching current auth config..."
CURRENT=$(curl -sS "https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}")

HTTP_ERR=$(echo "$CURRENT" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const j=JSON.parse(d); if(j.message) process.exit(1);}catch{process.exit(1)}})" 2>/dev/null) || {
  echo "Failed to read auth config: $CURRENT" >&2
  exit 1
}

PATCH_BODY=$(URI_ALLOW_LIST="$URI_ALLOW_LIST" node <<'NODE'
const urls = process.env.URI_ALLOW_LIST.split(",");
const body = {
  site_url: "https://estimator.monefyi.com",
  uri_allow_list: urls.join(","),
  rate_limit_email_sent: 30,
};
process.stdout.write(JSON.stringify(body));
NODE
)

echo "==> Patching auth (site_url + redirect allow list)..."
RESP=$(curl -sS -w "\n%{http_code}" -X PATCH \
  "https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$PATCH_BODY")

HTTP_CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')

if [[ "$HTTP_CODE" != "200" ]]; then
  echo "PATCH failed HTTP $HTTP_CODE: $BODY" >&2
  exit 1
fi

echo "$BODY" | node -e "
let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
  const j=JSON.parse(d);
  console.log('site_url:', j.site_url);
  console.log('uri_allow_list:', j.uri_allow_list);
});"

echo "Done."
