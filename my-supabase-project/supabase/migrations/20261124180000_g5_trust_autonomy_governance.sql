-- Fase G5: Kepercayaan, Otonomi Berbasis Bukti, SoD, & Pemulihan Insiden (BLOCKED remote — jangan push ke produksi)
-- 1) Membuat tabel append-only planner_shadow_evaluations untuk mencatat perbandingan draf agen vs keputusan manusia per (intent, category, amount_band).
-- 2) Membuat tabel planner_autonomy_policies dengan UNIQUE(org_id, intent, category, amount_band) untuk level otonomi ('L0'|'L1'|'L2'), kill_switch_enabled, batas nominal harian, dan kuota token bulanan.
-- 3) Membuat tabel planner_incident_postmortems terikat ke planner_journal_entries(id) ON DELETE RESTRICT dengan CHECK SoD (approved_by IS NULL OR approved_by <> created_by).
-- 4) Mengaktifkan RLS ketat berbasis is_org_member(org_id, ...) pada ketiga tabel tanpa memutasi tabel jurnal.

CREATE TABLE IF NOT EXISTS planner_shadow_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES planner_organizations(id) ON DELETE CASCADE,
  intent text NOT NULL,
  category text NOT NULL,
  amount_band text NOT NULL CHECK (amount_band IN ('small', 'medium', 'large')),
  agent_draft_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  human_decision_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  agreed boolean NOT NULL,
  is_critical_error boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_planner_shadow_evaluations_org_slice
  ON planner_shadow_evaluations(org_id, intent, category, amount_band, created_at DESC);

CREATE OR REPLACE FUNCTION public.planner_reject_shadow_eval_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'evaluasi_bayangan_tidak_boleh_diubah'
    USING ERRCODE = '55000',
          HINT = 'Tabel planner_shadow_evaluations bersifat append-only untuk audit otonomi.';
END;
$$;

DROP TRIGGER IF EXISTS planner_shadow_evaluations_no_mutation ON planner_shadow_evaluations;
CREATE TRIGGER planner_shadow_evaluations_no_mutation
  BEFORE UPDATE OR DELETE ON planner_shadow_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.planner_reject_shadow_eval_mutation();

ALTER TABLE planner_shadow_evaluations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS planner_shadow_evaluations_select ON planner_shadow_evaluations;
DROP POLICY IF EXISTS planner_shadow_evaluations_insert ON planner_shadow_evaluations;

CREATE POLICY planner_shadow_evaluations_select ON planner_shadow_evaluations
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, 'worker'));

CREATE POLICY planner_shadow_evaluations_insert ON planner_shadow_evaluations
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id, 'manager'));

CREATE TABLE IF NOT EXISTS planner_autonomy_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES planner_organizations(id) ON DELETE CASCADE,
  intent text NOT NULL,
  category text NOT NULL,
  amount_band text NOT NULL CHECK (amount_band IN ('small', 'medium', 'large')),
  current_level text NOT NULL DEFAULT 'L1' CHECK (current_level IN ('L0', 'L1', 'L2')),
  kill_switch_enabled boolean NOT NULL DEFAULT false,
  daily_cap_rupiah bigint NOT NULL DEFAULT 10000000 CHECK (daily_cap_rupiah >= 0),
  monthly_token_budget bigint NOT NULL DEFAULT 500000 CHECK (monthly_token_budget >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, intent, category, amount_band)
);

CREATE INDEX IF NOT EXISTS idx_planner_autonomy_policies_org
  ON planner_autonomy_policies(org_id, current_level);

ALTER TABLE planner_autonomy_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS planner_autonomy_policies_select ON planner_autonomy_policies;
DROP POLICY IF EXISTS planner_autonomy_policies_insert ON planner_autonomy_policies;
DROP POLICY IF EXISTS planner_autonomy_policies_update ON planner_autonomy_policies;

CREATE POLICY planner_autonomy_policies_select ON planner_autonomy_policies
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, 'worker'));

CREATE POLICY planner_autonomy_policies_insert ON planner_autonomy_policies
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id, 'owner'));

CREATE POLICY planner_autonomy_policies_update ON planner_autonomy_policies
  FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id, 'owner'))
  WITH CHECK (public.is_org_member(org_id, 'owner'));

CREATE TABLE IF NOT EXISTS planner_incident_postmortems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES planner_organizations(id) ON DELETE CASCADE,
  original_journal_id uuid NOT NULL REFERENCES planner_journal_entries(id) ON DELETE RESTRICT,
  proposed_reversal_json jsonb NOT NULL,
  status text NOT NULL DEFAULT 'awaiting_approval' CHECK (
    status IN ('awaiting_approval', 'approved', 'rejected', 'executed')
  ),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (approved_by IS NULL OR approved_by <> created_by)
);

CREATE INDEX IF NOT EXISTS idx_planner_incident_postmortems_org_status
  ON planner_incident_postmortems(org_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_planner_incident_postmortems_journal
  ON planner_incident_postmortems(original_journal_id);

CREATE OR REPLACE FUNCTION public.planner_guard_incident_postmortem_integrity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'postmortem_insiden_tidak_boleh_dihapus'
      USING ERRCODE = '55000';
  END IF;

  IF OLD.org_id IS DISTINCT FROM NEW.org_id
     OR OLD.original_journal_id IS DISTINCT FROM NEW.original_journal_id
     OR OLD.created_by IS DISTINCT FROM NEW.created_by THEN
    RAISE EXCEPTION 'identitas_postmortem_tidak_boleh_diubah'
      USING ERRCODE = '55000';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS planner_incident_postmortems_integrity_guard ON planner_incident_postmortems;
CREATE TRIGGER planner_incident_postmortems_integrity_guard
  BEFORE UPDATE OR DELETE ON planner_incident_postmortems
  FOR EACH ROW EXECUTE FUNCTION public.planner_guard_incident_postmortem_integrity();

ALTER TABLE planner_incident_postmortems ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS planner_incident_postmortems_select ON planner_incident_postmortems;
DROP POLICY IF EXISTS planner_incident_postmortems_insert ON planner_incident_postmortems;
DROP POLICY IF EXISTS planner_incident_postmortems_update ON planner_incident_postmortems;

CREATE POLICY planner_incident_postmortems_select ON planner_incident_postmortems
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, 'worker'));

CREATE POLICY planner_incident_postmortems_insert ON planner_incident_postmortems
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id, 'manager'));

CREATE POLICY planner_incident_postmortems_update ON planner_incident_postmortems
  FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id, 'manager'))
  WITH CHECK (public.is_org_member(org_id, 'manager'));
