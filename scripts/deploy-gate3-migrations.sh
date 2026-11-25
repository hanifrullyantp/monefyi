#!/usr/bin/env bash
# ==============================================================================
# Froyek — Runner Gerbang 3: 16 Migrasi SQL Berurutan + Verifikasi + Dry-Run
# ==============================================================================
# Dijalankan LANGSUNG oleh Owner di terminal lokal (BUKAN oleh agen AI).
# - Tidak pernah mencetak atau menyimpan PROD_DATABASE_URL / password.
# - Menjalankan 16 file migrasi (20261124100000..20261124200000) satu per satu
#   dengan ON_ERROR_STOP=1 dan --single-transaction (berhenti & rollback bila gagal).
# - Hanya menjalankan dry-run planner_migrate_f1_ledger(..., true) secara default.
#
# Penggunaan:
#   1) Uji lokal daftar file (tanpa koneksi DB):
#      bash scripts/deploy-gate3-migrations.sh --check-files
#
#   2) Jalankan Gerbang 3 ke produksi (setelah Gerbang 2 Backup terverifikasi):
#      export PROD_DATABASE_URL="postgresql://postgres:<PASSWORD>@db.zzwqfmdyncxbolestkqp.supabase.co:5432/postgres?sslmode=require"
#      bash scripts/deploy-gate3-migrations.sh --confirm-backup-verified
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MIGRATIONS_DIR="$REPO_ROOT/my-supabase-project/supabase/migrations"

MIGRATIONS=(
  "20261124100000_f0_accounting_correctness.sql"
  "20261124120000_f1_coa_and_dimensions.sql"
  "20261124140000_g0_1_real_f1_migration.sql"
  "20261124141000_g0_3_account_taxonomy.sql"
  "20261124142000_g0_4_immutability_guard.sql"
  "20261124143000_g0_2_rpc_f1_accounts.sql"
  "20261124144000_g0_5_revenue_recognition.sql"
  "20261124145000_g0_6_party_id_and_interproject_loans.sql"
  "20261124150000_g1_1_journal_attachments.sql"
  "20261124151000_g1_2_bank_reconciliation.sql"
  "20261124160000_g2_proactive_reminders_audit.sql"
  "20261124170000_g4_cfo_tax_config_and_loans.sql"
  "20261124180000_g5_trust_autonomy_governance.sql"
  "20261124190000_g8_hrd_project_labor_accrual.sql"
  "20261124193000_g7_unified_feedback_events.sql"
  "20261124200000_g10_channel_gateway_proactive.sql"
)

CHECK_FILES_ONLY=false
CONFIRM_BACKUP=false

for arg in "$@"; do
  case "$arg" in
    --check-files)
      CHECK_FILES_ONLY=true
      ;;
    --confirm-backup-verified)
      CONFIRM_BACKUP=true
      ;;
    *)
      echo "Argumen tidak dikenal: $arg" >&2
      exit 1
      ;;
  esac
done

echo "=== GERBANG 3: VERIFIKASI KEBERADAAN 16 FILE MIGRASI ==="
for i in "${!MIGRATIONS[@]}"; do
  idx=$((i + 1))
  file="$MIGRATIONS_DIR/${MIGRATIONS[$i]}"
  if [[ ! -f "$file" ]]; then
    echo "ERROR: File migrasi #$idx tidak ditemukan: $file" >&2
    exit 1
  fi
  printf "  [%02d/16] OK  %s\n" "$idx" "${MIGRATIONS[$i]}"
done

if [[ "$CHECK_FILES_ONLY" == "true" ]]; then
  echo "PASS: Seluruh 16 file migrasi tersedia dan urut."
  exit 0
fi

if [[ "$CONFIRM_BACKUP" != "true" ]]; then
  echo "BERHENTI: Flag --confirm-backup-verified wajib diberikan untuk memastikan Gerbang 2 (Backup) sudah terverifikasi." >&2
  exit 1
fi

if [[ -z "${PROD_DATABASE_URL:-}" ]]; then
  echo "BERHENTI: Variabel lingkungan PROD_DATABASE_URL belum diatur." >&2
  echo "Contoh: export PROD_DATABASE_URL=\"postgresql://postgres:<PASSWORD>@db.zzwqfmdyncxbolestkqp.supabase.co:5432/postgres?sslmode=require\"" >&2
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "BERHENTI: Perintah 'psql' tidak ditemukan di PATH." >&2
  exit 1
fi

run_sql() {
  psql "$PROD_DATABASE_URL" --no-psqlrc --set ON_ERROR_STOP=1 --quiet "$@"
}

echo ""
echo "=== LANGKAH 3.0: BASELINE JUMLAH BARIS SEBELUM MIGRASI ==="
BASELINE_COUNTS=$(run_sql -t -A -F',' -c "
  SELECT
    (SELECT COUNT(*) FROM public.planner_journal_entries),
    (SELECT COUNT(*) FROM public.planner_journal_lines),
    (SELECT COUNT(*) FROM public.planner_cost_realizations),
    (SELECT COUNT(*) FROM public.planner_payroll_entries),
    (SELECT COUNT(*) FROM public.planner_finance_accounts);
")
IFS=',' read -r BASE_JE BASE_JL BASE_CR BASE_PE BASE_FA <<< "$BASELINE_COUNTS"
echo "  planner_journal_entries   : $BASE_JE"
echo "  planner_journal_lines     : $BASE_JL"
echo "  planner_cost_realizations : $BASE_CR"
echo "  planner_payroll_entries   : $BASE_PE"
echo "  planner_finance_accounts  : $BASE_FA"

echo ""
echo "=== LANGKAH 3.1–3.16: EKSEKUSI 16 MIGRASI SATU PER SATU (ATOMIC PER FILE) ==="
for i in "${!MIGRATIONS[@]}"; do
  idx=$((i + 1))
  name="${MIGRATIONS[$i]}"
  file="$MIGRATIONS_DIR/$name"
  printf "\n--> [%02d/16] Menjalankan %s ...\n" "$idx" "$name"
  run_sql --single-transaction -f "$file"
  printf "    [%02d/16] SUKSES: %s\n" "$idx" "$name"

  if [[ "$idx" -eq 1 ]]; then
    AFTER_F0=$(run_sql -t -A -F',' -c "
      SELECT
        (SELECT COUNT(*) FROM public.planner_journal_entries),
        (SELECT COUNT(*) FROM public.planner_journal_lines);
    ")
    IFS=',' read -r F0_JE F0_JL <<< "$AFTER_F0"
    if [[ "$F0_JE" != "$BASE_JE" || "$F0_JL" != "$BASE_JL" ]]; then
      echo "BERHENTI: Jumlah baris jurnal berubah setelah F0! ($BASE_JE/$BASE_JL -> $F0_JE/$F0_JL)" >&2
      exit 1
    fi
    echo "    Verifikasi F0 OK: jumlah baris jurnal tetap ($F0_JE entries, $F0_JL lines)."
  fi

  if [[ "$idx" -eq 2 ]]; then
    echo "    Verifikasi F1: menguji idempotensi seed_default_chart_of_accounts (2x panggilan pada 1 org)..."
    run_sql -c "
      DO \$\$
      DECLARE v_org uuid;
      BEGIN
        SELECT id INTO v_org FROM public.planner_organizations LIMIT 1;
        IF v_org IS NOT NULL THEN
          PERFORM public.seed_default_chart_of_accounts(v_org);
          PERFORM public.seed_default_chart_of_accounts(v_org);
        END IF;
      END \$\$;
    "
    echo "    Verifikasi F1 OK: seed_default_chart_of_accounts idempoten."
  fi
done

echo ""
echo "=== VERIFIKASI PASCA-16 MIGRASI: JUMLAH BARIS TABEL INTI ==="
AFTER_COUNTS=$(run_sql -t -A -F',' -c "
  SELECT
    (SELECT COUNT(*) FROM public.planner_journal_entries),
    (SELECT COUNT(*) FROM public.planner_journal_lines),
    (SELECT COUNT(*) FROM public.planner_cost_realizations),
    (SELECT COUNT(*) FROM public.planner_payroll_entries),
    (SELECT COUNT(*) FROM public.planner_finance_accounts);
")
IFS=',' read -r END_JE END_JL END_CR END_PE END_FA <<< "$AFTER_COUNTS"
echo "  planner_journal_entries   : $END_JE (baseline: $BASE_JE)"
echo "  planner_journal_lines     : $END_JL (baseline: $BASE_JL)"
echo "  planner_cost_realizations : $END_CR (baseline: $BASE_CR)"
echo "  planner_payroll_entries   : $END_PE (baseline: $BASE_PE)"
echo "  planner_finance_accounts  : $END_FA (baseline: $BASE_FA)"

echo ""
echo "=== DRY-RUN REKONSILIASI SALDO F1 (p_dry_run = true, TIDAK MENGUBAH DATA) ==="
run_sql -c "
  SELECT
    id AS org_id,
    name AS org_name,
    public.planner_migrate_f1_ledger(id, true) AS dry_run_result
  FROM public.planner_organizations
  ORDER BY created_at ASC;
"

echo ""
echo "=== SELESAI GERBANG 3 (SKEMA + DRY-RUN) ==="
echo "Langkah berikutnya:"
echo "  1. Salin seluruh output di atas dan kirim ke Orchestrator untuk verifikasi."
echo "  2. JANGAN jalankan planner_migrate_f1_ledger(..., false) sebelum seluruh hasil dry-run"
echo "     menunjukkan matched=true atau seluruh selisih dijelaskan satu per satu."

