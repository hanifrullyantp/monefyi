#!/usr/bin/env bash
# Deploy Planner schema + Edge Functions to the linked Supabase project.
# Prerequisites:
#   - Supabase CLI (or use: npx supabase@latest ...)
#   - SUPABASE_ACCESS_TOKEN from https://supabase.com/dashboard/account/tokens
#   - SUPABASE_PROJECT_REF (Settings → General → Reference ID), or rely on existing link
#
# Usage (from repo root):
#   export SUPABASE_ACCESS_TOKEN="sbp_..."
#   export SUPABASE_PROJECT_REF="your_project_ref"   # optional if already linked
#   ./scripts/deploy-planner-supabase.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/my-supabase-project"

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "Error: set SUPABASE_ACCESS_TOKEN (Supabase dashboard → Account → Access Tokens)." >&2
  exit 1
fi

if [[ -n "${SUPABASE_PROJECT_REF:-}" ]]; then
  npx --yes supabase@latest link --project-ref "$SUPABASE_PROJECT_REF"
fi

echo "==> Pushing database migrations (includes Planner core schema)..."
npx --yes supabase@latest db push

echo "==> Deploying Edge Functions: planner-analyze, planner-parse-command..."
npx --yes supabase@latest functions deploy planner-analyze
npx --yes supabase@latest functions deploy planner-parse-command

echo "Done. Set GEMINI_API_KEY in Supabase → Edge Functions → Secrets for planner-parse-command if you use AI parsing."
