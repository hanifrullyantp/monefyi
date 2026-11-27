#!/bin/bash
# scripts/agent-backup-dr.sh
# Automated backup and disaster recovery script for agent system
# Usage: ./scripts/agent-backup-dr.sh [backup|restore|verify]

set -euo pipefail

PROJECT_REF="${SUPABASE_PROJECT_REF:-zzwqfmdyncxbolestkqp}"
BACKUP_DIR="${BACKUP_DIR:-./backups/agent}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/agent_backup_${TIMESTAMP}.sql"

mkdir -p "${BACKUP_DIR}"

case "${1:-backup}" in
  backup)
    echo "[agent-backup-dr] Starting backup at ${TIMESTAMP}..."
    supabase db dump --remote --project-ref "${PROJECT_REF}" > "${BACKUP_FILE}"
    echo "[agent-backup-dr] Backup saved to ${BACKUP_FILE}"
    ;;
  restore)
    if [ -z "${2:-}" ]; then
      echo "Usage: $0 restore <backup_file.sql>"
      exit 1
    fi
    echo "[agent-backup-dr] Restoring from $2..."
    supabase db reset --remote --project-ref "${PROJECT_REF}" --file "$2"
    echo "[agent-backup-dr] Restore complete."
    ;;
  verify)
    echo "[agent-backup-dr] Verifying agent tables exist..."
    supabase db diff --remote --project-ref "${PROJECT_REF}" --linked
    echo "[agent-backup-dr] Verification complete."
    ;;
  *)
    echo "Usage: $0 {backup|restore|verify}"
    exit 1
    ;;
esac
