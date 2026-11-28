#!/bin/bash
# scripts/agent-backup-dr.sh
# Backup and Disaster Recovery script for Froyek Agent tables (H-AUD-05)
# Usage:
#   SUPABASE_PROJECT_REF=<ref> ./scripts/agent-backup-dr.sh backup
#   TARGET_EMPTY_DB_URL=postgresql://... CONFIRM_RESTORE=YES_RESTORE_EMPTY_DB ./scripts/agent-backup-dr.sh restore <backup_file.sql>
#   SUPABASE_PROJECT_REF=<ref> ./scripts/agent-backup-dr.sh verify

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups/agent}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/agent_backup_${TIMESTAMP}.sql"

mkdir -p "${BACKUP_DIR}"

case "${1:-}" in
  backup)
    if [ -z "${SUPABASE_PROJECT_REF:-}" ]; then
      echo "[agent-backup-dr] ERROR: SUPABASE_PROJECT_REF wajib disetel secara eksplisit (tidak boleh memakai default project produksi)." >&2
      exit 1
    fi
    echo "[agent-backup-dr] Starting backup at ${TIMESTAMP} for project ${SUPABASE_PROJECT_REF}..."
    supabase db dump --remote --project-ref "${SUPABASE_PROJECT_REF}" -f "${BACKUP_FILE}"
    echo "[agent-backup-dr] Backup saved to ${BACKUP_FILE}"
    ;;
  restore)
    BACKUP_SOURCE="${2:-}"
    TARGET_DB_URL="${TARGET_EMPTY_DB_URL:-}"
    TARGET_DB_NAME="${TARGET_EMPTY_DB_NAME:-}"
    if [ -z "${BACKUP_SOURCE}" ] || [ ! -f "${BACKUP_SOURCE}" ]; then
      echo "Usage: TARGET_EMPTY_DB_URL=postgresql://... TARGET_EMPTY_DB_NAME=<empty_db_name> CONFIRM_RESTORE=YES_RESTORE_EMPTY_DB $0 restore <backup_file.sql>" >&2
      exit 1
    fi
    if [ -z "${TARGET_DB_URL}" ] || [ -z "${TARGET_DB_NAME}" ]; then
      echo "[agent-backup-dr] ERROR: TARGET_EMPTY_DB_URL dan TARGET_EMPTY_DB_NAME wajib disetel secara eksplisit ke database kosong." >&2
      exit 1
    fi
    if [ "${CONFIRM_RESTORE:-}" != "YES_RESTORE_EMPTY_DB" ]; then
      read -r -p "Ketik 'YES_RESTORE_EMPTY_DB' untuk mengonfirmasi restore ke database kosong '${TARGET_DB_NAME}': " USER_CONFIRM
      if [ "${USER_CONFIRM}" != "YES_RESTORE_EMPTY_DB" ]; then
        echo "[agent-backup-dr] Restore dibatalkan karena konfirmasi manual tidak cocok." >&2
        exit 1
      fi
    fi
    echo "[agent-backup-dr] Memeriksa apakah database target '${TARGET_DB_NAME}' benar-benar kosong..."
    EXISTING_TABLES=$(psql "${TARGET_DB_URL}" -Atc "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'planner_agent_%';" 2>/dev/null || echo "error")
    if [ "${EXISTING_TABLES}" != "0" ]; then
      echo "[agent-backup-dr] ERROR: Database target tidak kosong atau tidak dapat diverifikasi (planner_agent_* count=${EXISTING_TABLES}). Restore ditolak!" >&2
      exit 1
    fi
    echo "[agent-backup-dr] Menjalankan psql restore dari ${BACKUP_SOURCE} ke database kosong '${TARGET_DB_NAME}'..."
    psql "${TARGET_DB_URL}" --set ON_ERROR_STOP=on -f "${BACKUP_SOURCE}"
    echo "[agent-backup-dr] Restore selesai dengan aman."
    ;;
  verify)
    if [ -z "${SUPABASE_PROJECT_REF:-}" ]; then
      echo "[agent-backup-dr] ERROR: SUPABASE_PROJECT_REF wajib disetel secara eksplisit." >&2
      exit 1
    fi
    echo "[agent-backup-dr] Verifying agent schema diff on ${SUPABASE_PROJECT_REF}..."
    supabase db diff --remote --project-ref "${SUPABASE_PROJECT_REF}" --linked
    echo "[agent-backup-dr] Verification complete."
    ;;
  *)
    echo "Usage: $0 {backup|restore|verify}" >&2
    exit 1
    ;;
esac
