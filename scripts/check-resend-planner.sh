#!/usr/bin/env bash
# Cek konfigurasi Resend untuk Planner/Estimator (tanpa mengirim email).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/my-supabase-project"

echo "==> Supabase secrets (Resend + email)"
if ! npx supabase secrets list 2>/dev/null | grep -E "RESEND_API_KEY|RESEND_FROM_EMAIL|SEND_EMAIL_HOOK_SECRET|APP_URL|ESTIMATOR"; then
  echo "WARN: supabase CLI tidak terhubung atau secrets tidak terbaca."
fi

echo ""
echo "==> Edge functions (planner-lynk-webhook, auth-send-email)"
npx supabase functions list 2>/dev/null | grep -E "planner-lynk-webhook|auth-send-email" || true

ENV_FILE="$ROOT/monefyi_planner/.env.local"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a && source "$ENV_FILE" && set +a
fi

SUPABASE_URL="${VITE_SUPABASE_URL:-${NEXT_PUBLIC_SUPABASE_URL:-https://zzwqfmdyncxbolestkqp.supabase.co}}"
SUPABASE_ANON_KEY="${VITE_SUPABASE_ANON_KEY:-${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}}"

if [[ -n "$SUPABASE_ANON_KEY" ]]; then
  echo ""
  echo "==> Landing config (estimator-lp slug)"
  code=$(curl -s -o /dev/null -w "%{http_code}" \
    "${SUPABASE_URL}/functions/v1/monefyi-landing-config?slug=estimator-lp" \
    -H "apikey: ${SUPABASE_ANON_KEY}")
  echo "  monefyi-landing-config HTTP ${code}"
fi

echo ""
echo "==> Resend status"
echo "  RESEND_API_KEY: set di Supabase (lihat secrets list di atas)"
echo "  RESEND_FROM_EMAIL: set di Supabase"
echo "  Auth hook: Supabase Dashboard → Authentication → Hooks → Send Email → auth-send-email"
echo ""
echo "Uji manual:"
echo "  1. Signup di estimator.monefyi.com → cek email verifikasi"
echo "  2. Test pembayaran Lynk → cek email konfirmasi + link atur password"
echo "  3. Resend Dashboard → Logs → delivery status"
