-- Fase G2-2: Mesin Pengingat Multitenant, Draf Penagihan, & Jejak Audit Proaktif (BLOCKED remote — jangan push ke produksi)
-- 1) Membuat tabel append-only planner_proactive_audit_logs dengan trigger penolak UPDATE/DELETE.
-- 2) Membuat tabel planner_finance_reminders dengan deduplikasi idempoten UNIQUE(org_id, dedupe_key).
-- 3) Membuat tabel planner_collection_drafts dengan CHECK pemisahan wewenang (SoD: approved_by <> created_by)
--    dan wajib jejak audit (status <> 'dispatched' OR (approved_by IS NOT NULL AND audit_log_id IS NOT NULL)).
-- 4) Mengaktifkan RLS ketat berbasis is_org_member(org_id, ...) pada ketiga tabel tanpa memutasi tabel jurnal.

CREATE TABLE IF NOT EXISTS planner_proactive_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES planner_organizations(id) ON DELETE CASCADE,
  actor_id text NOT NULL,
  actor_type text NOT NULL CHECK (actor_type IN ('user', 'agent', 'cron', 'system')),
  action text NOT NULL,
  target_table text NOT NULL,
  target_id text NOT NULL,
  payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_planner_proactive_audit_logs_org_created
  ON planner_proactive_audit_logs(org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_planner_proactive_audit_logs_target
  ON planner_proactive_audit_logs(org_id, target_table, target_id);

-- Trigger append-only: jejak audit tidak boleh diubah maupun dihapus
CREATE OR REPLACE FUNCTION public.planner_reject_proactive_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_log_proaktif_tidak_boleh_diubah'
    USING ERRCODE = '55000',
          HINT = 'Tabel planner_proactive_audit_logs bersifat append-only dan imutabel.';
END;
$$;

DROP TRIGGER IF EXISTS planner_proactive_audit_logs_no_mutation ON planner_proactive_audit_logs;
CREATE TRIGGER planner_proactive_audit_logs_no_mutation
  BEFORE UPDATE OR DELETE ON planner_proactive_audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.planner_reject_proactive_audit_mutation();

ALTER TABLE planner_proactive_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS planner_proactive_audit_logs_select ON planner_proactive_audit_logs;
DROP POLICY IF EXISTS planner_proactive_audit_logs_insert ON planner_proactive_audit_logs;

CREATE POLICY planner_proactive_audit_logs_select ON planner_proactive_audit_logs
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, 'worker'));

CREATE POLICY planner_proactive_audit_logs_insert ON planner_proactive_audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id, 'manager'));

CREATE TABLE IF NOT EXISTS planner_finance_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES planner_organizations(id) ON DELETE CASCADE,
  reminder_type text NOT NULL CHECK (
    reminder_type IN (
      'payable_due',
      'receivable_overdue',
      'termin_ready_to_bill',
      'missing_receipt_attachment',
      'journal_needs_review'
    )
  ),
  dedupe_key text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  entity_id text NOT NULL,
  title text NOT NULL,
  detail_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'open' CHECK (
    status IN ('open', 'acknowledged', 'resolved', 'dismissed')
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, dedupe_key)
);

CREATE INDEX IF NOT EXISTS idx_planner_finance_reminders_org_status
  ON planner_finance_reminders(org_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_planner_finance_reminders_org_type
  ON planner_finance_reminders(org_id, reminder_type);

ALTER TABLE planner_finance_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS planner_finance_reminders_select ON planner_finance_reminders;
DROP POLICY IF EXISTS planner_finance_reminders_insert ON planner_finance_reminders;
DROP POLICY IF EXISTS planner_finance_reminders_update ON planner_finance_reminders;

CREATE POLICY planner_finance_reminders_select ON planner_finance_reminders
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, 'worker'));

CREATE POLICY planner_finance_reminders_insert ON planner_finance_reminders
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id, 'manager'));

CREATE POLICY planner_finance_reminders_update ON planner_finance_reminders
  FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id, 'manager'))
  WITH CHECK (public.is_org_member(org_id, 'manager'));

CREATE TABLE IF NOT EXISTS planner_collection_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES planner_organizations(id) ON DELETE CASCADE,
  party_id uuid NOT NULL REFERENCES planner_parties(id) ON DELETE RESTRICT,
  channel text NOT NULL CHECK (channel IN ('whatsapp', 'email')),
  subject text NOT NULL,
  body text NOT NULL,
  total_amount_rupiah bigint NOT NULL CHECK (total_amount_rupiah > 0),
  autonomy_level text NOT NULL DEFAULT 'L1' CHECK (autonomy_level IN ('L0', 'L1', 'L2', 'L3')),
  provenance_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending_approval' CHECK (
    status IN ('pending_approval', 'approved', 'dispatched', 'rejected')
  ),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  audit_log_id uuid REFERENCES planner_proactive_audit_logs(id) ON DELETE RESTRICT,
  dispatched_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (approved_by IS NULL OR approved_by <> created_by),
  CHECK (status <> 'dispatched' OR (approved_by IS NOT NULL AND audit_log_id IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_planner_collection_drafts_org_status
  ON planner_collection_drafts(org_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_planner_collection_drafts_org_party
  ON planner_collection_drafts(org_id, party_id);

-- Penjaga integritas draf penagihan: mencegah mutasi lintas org / pengubahan status setelah dispatched
CREATE OR REPLACE FUNCTION public.planner_guard_collection_draft_integrity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'draf_penagihan_tidak_boleh_dihapus'
      USING ERRCODE = '55000';
  END IF;

  IF OLD.org_id IS DISTINCT FROM NEW.org_id OR OLD.created_by IS DISTINCT FROM NEW.created_by THEN
    RAISE EXCEPTION 'identitas_draf_penagihan_tidak_boleh_diubah'
      USING ERRCODE = '55000';
  END IF;

  IF OLD.status = 'dispatched' THEN
    RAISE EXCEPTION 'draf_penagihan_sudah_dikirim_tidak_boleh_diubah'
      USING ERRCODE = '55000';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS planner_collection_drafts_integrity_guard ON planner_collection_drafts;
CREATE TRIGGER planner_collection_drafts_integrity_guard
  BEFORE UPDATE OR DELETE ON planner_collection_drafts
  FOR EACH ROW EXECUTE FUNCTION public.planner_guard_collection_draft_integrity();

ALTER TABLE planner_collection_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS planner_collection_drafts_select ON planner_collection_drafts;
DROP POLICY IF EXISTS planner_collection_drafts_insert ON planner_collection_drafts;
DROP POLICY IF EXISTS planner_collection_drafts_update ON planner_collection_drafts;

CREATE POLICY planner_collection_drafts_select ON planner_collection_drafts
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, 'worker'));

CREATE POLICY planner_collection_drafts_insert ON planner_collection_drafts
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id, 'manager'));

CREATE POLICY planner_collection_drafts_update ON planner_collection_drafts
  FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id, 'manager'))
  WITH CHECK (public.is_org_member(org_id, 'manager'));
