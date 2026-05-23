#!/bin/bash
# =============================================================
# Monefyi Planner — Database Migration Runner
# =============================================================
# 
# Cara pakai:
# 1. Set environment variables:
#    export SUPABASE_DB_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"
#    atau:
#    export SUPABASE_DB_URL="postgresql://postgres:[password]@db.zzwqfmdyncxbolestkqp.supabase.co:5432/postgres"
#
# 2. Jalankan:
#    bash planner/scripts/run-migration.sh
#
# Alternatif: Copy isi file SQL dan paste di Supabase Dashboard > SQL Editor

set -e

MIGRATION_FILE="$(dirname "$0")/../supabase/migrations/001_planner_core_schema.sql"

if [ -z "$SUPABASE_DB_URL" ]; then
  echo "ERROR: SUPABASE_DB_URL environment variable is not set"
  echo ""
  echo "Set it with your Supabase database connection string:"
  echo '  export SUPABASE_DB_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"'
  echo ""
  echo "Or copy the SQL file content and run it in Supabase Dashboard > SQL Editor:"
  echo "  File: $MIGRATION_FILE"
  exit 1
fi

echo "Running migration: $MIGRATION_FILE"
echo "Target: $SUPABASE_DB_URL"
echo ""

psql "$SUPABASE_DB_URL" -f "$MIGRATION_FILE"

echo ""
echo "Migration completed successfully!"
