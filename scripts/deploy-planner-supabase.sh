#!/usr/bin/env bash
# Deploy Planner schema + Edge Functions to the linked Supabase project.
#
# JANGAN menaruh token di file ini — token yang ter-commit harus dicabut di Supabase Dashboard
# (Account → Access Tokens) dan diganti yang baru.
#
# Cara pakai:
#   cp scripts/env.supabase.local.example scripts/.env.supabase.local
#   # isi SUPABASE_ACCESS_TOKEN=... di .env.supabase.local
#   ./scripts/deploy-planner-supabase.sh
#
# Atau export di shell:
#   export SUPABASE_ACCESS_TOKEN="sbp_..."
#   export SUPABASE_PROJECT_REF="zzwqfmdyncxbolestkqp"

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Muat kredensial dari file lokal (disarankan; tidak ikut ke git)
if [[ -f "$SCRIPT_DIR/.env.supabase.local" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "$SCRIPT_DIR/.env.supabase.local"
  set +a
  echo "==> Loaded $SCRIPT_DIR/.env.supabase.local"
fi

cd "$ROOT/my-supabase-project"

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "Error: set SUPABASE_ACCESS_TOKEN (mis. di scripts/.env.supabase.local — lihat scripts/env.supabase.local.example)." >&2
  exit 1
fi

if [[ -n "${SUPABASE_PROJECT_REF:-}" ]]; then
  echo "==> Linking project $SUPABASE_PROJECT_REF..."
  npx --yes supabase@latest link --project-ref "$SUPABASE_PROJECT_REF"
fi

# Tarik file migrasi yang ada di riwayat remote tapi belum ada di folder lokal
# (mengatasi "Remote migration versions not found in local migrations directory").
echo "==> Fetching remote migration files missing locally (migration fetch)..."
set +e
npx --yes supabase@latest migration fetch --linked --yes
fetch_rc=$?
set -e
if [[ "$fetch_rc" -ne 0 ]]; then
  echo "    (migration fetch exited $fetch_rc — lanjut; mungkin sudah sinkron.)"
fi

# Tandai reverted untuk versi orphan yang tidak punya konten di history (fallback).
ORPHANS="${SUPABASE_ORPHAN_MIGRATION_VERSIONS:-20260507151500 20260507162500}"
echo "==> Repair orphan remote markers (reverted), if present: $ORPHANS"
for v in $ORPHANS; do
  [[ -n "${v// }" ]] || continue
  echo "    repair reverted $v"
  npx --yes supabase@latest migration repair --status reverted --linked "$v" 2>/dev/null || true
done

echo "==> Migration list (linked) — cek Local vs Remote:"
npx --yes supabase@latest migration list --linked || true

echo "==> Pushing database migrations (includes Planner core schema)..."
npx --yes supabase@latest db push --yes

echo "==> Deploying Edge Functions: planner-analyze, planner-parse-command..."
npx --yes supabase@latest functions deploy planner-analyze
npx --yes supabase@latest functions deploy planner-parse-command

echo "Done. Set GEMINI_API_KEY in Supabase → Edge Functions → Secrets for planner-parse-command if you use AI parsing."
