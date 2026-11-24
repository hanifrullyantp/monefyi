-- Fase G0-5: Pengakuan Pendapatan DP Berbasis Progres / Termin Terjadwal (BLOCKED remote — jangan push ke produksi)
-- Menambahkan metode pengakuan pendapatan DP per proyek ('termin' default konservatif atau 'progress_pct'),
-- jadwal pengakuan bulanan idempoten, serta RPC append-only Dr uang_muka_klien / Cr pendapatan_proyek.

-- 1. Tambah kolom revenue_recognition_method pada planner_projects
ALTER TABLE planner_projects
  ADD COLUMN IF NOT EXISTS revenue_recognition_method text NOT NULL DEFAULT 'termin';

ALTER TABLE planner_projects DROP CONSTRAINT IF EXISTS planner_projects_revenue_recognition_method_check;
ALTER TABLE planner_projects ADD CONSTRAINT planner_projects_revenue_recognition_method_check
  CHECK (revenue_recognition_method IN ('termin', 'progress_pct'));

-- 2. Tambah 'revenue_recognition' ke constraint planner_journal_entries_reference_type_check
ALTER TABLE planner_journal_entries DROP CONSTRAINT IF EXISTS planner_journal_entries_reference_type_check;
ALTER TABLE planner_journal_entries ADD CONSTRAINT planner_journal_entries_reference_type_check
  CHECK (reference_type IS NULL OR reference_type IN (
    'project_expense', 'project_income', 'opex', 'transfer', 'manual',
    'amortize', 'depreciation', 'opening',
    'project_close', 'payroll_disbursement', 'bon_disbursement', 'payroll_accrual', 'period_close',
    'reversal', 'payable_payment', 'receivable_receipt', 'dividend', 'f1_migration',
    'revenue_recognition'
  ));

-- 3. Tabel jadwal pengakuan pendapatan DP bulanan per proyek
CREATE TABLE IF NOT EXISTS planner_revenue_recognition_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES planner_organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES planner_projects(id) ON DELETE CASCADE,
  period_month date NOT NULL,
  recognition_method text NOT NULL DEFAULT 'termin'
    CHECK (recognition_method IN ('termin', 'progress_pct')),
  progress_pct numeric(5,2),
  amount_rupiah bigint NOT NULL CHECK (amount_rupiah >= 0),
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'posted', 'skipped')),
  journal_entry_id uuid REFERENCES planner_journal_entries(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  posted_at timestamptz,
  UNIQUE (project_id, period_month)
);

CREATE INDEX IF NOT EXISTS idx_rev_recog_org_period
  ON planner_revenue_recognition_schedules(org_id, period_month);
CREATE INDEX IF NOT EXISTS idx_rev_recog_project
  ON planner_revenue_recognition_schedules(project_id);

ALTER TABLE planner_revenue_recognition_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS planner_revenue_recognition_schedules_read ON planner_revenue_recognition_schedules;
DROP POLICY IF EXISTS planner_revenue_recognition_schedules_write ON planner_revenue_recognition_schedules;

CREATE POLICY planner_revenue_recognition_schedules_read ON planner_revenue_recognition_schedules
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, 'worker'));

CREATE POLICY planner_revenue_recognition_schedules_write ON planner_revenue_recognition_schedules
  FOR ALL TO authenticated
  USING (public.is_org_member(org_id, 'manager'))
  WITH CHECK (public.is_org_member(org_id, 'manager'));

-- 4. RPC idempoten & append-only pengakuan pendapatan DP (Dr uang_muka_klien / Cr pendapatan_proyek)
CREATE OR REPLACE FUNCTION public.planner_recognize_project_dp_revenue(
  p_org_id uuid,
  p_project_id uuid,
  p_period_month date,
  p_amount bigint,
  p_progress_pct numeric DEFAULT NULL,
  p_actor uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_proj_org_id uuid;
  v_proj_name text;
  v_method text;
  v_period_month date;
  v_entry_date date;
  v_schedule_id uuid;
  v_schedule_status text;
  v_journal_id uuid;
  v_uang_muka_id uuid;
  v_pendapatan_id uuid;
  v_actor uuid := COALESCE(p_actor, auth.uid());
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_org_member(p_org_id, 'manager') THEN
    RAISE EXCEPTION 'bukan_pengelola' USING ERRCODE = '42501';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'nominal_tidak_valid';
  END IF;

  SELECT org_id, name, COALESCE(revenue_recognition_method, 'termin')
  INTO v_proj_org_id, v_proj_name, v_method
  FROM planner_projects
  WHERE id = p_project_id;

  IF v_proj_org_id IS NULL OR v_proj_org_id <> p_org_id THEN
    RAISE EXCEPTION 'proyek_tidak_ditemukan';
  END IF;

  v_period_month := date_trunc('month', COALESCE(p_period_month, CURRENT_DATE))::date;
  v_entry_date := (v_period_month + interval '1 month - 1 day')::date;

  -- Siapkan baris jadwal secara idempoten per (project_id, period_month)
  INSERT INTO planner_revenue_recognition_schedules (
    org_id, project_id, period_month, recognition_method, progress_pct, amount_rupiah, status
  ) VALUES (
    p_org_id, p_project_id, v_period_month, v_method, p_progress_pct, p_amount, 'scheduled'
  )
  ON CONFLICT (project_id, period_month) DO NOTHING;

  SELECT id, status, journal_entry_id
  INTO v_schedule_id, v_schedule_status, v_journal_id
  FROM planner_revenue_recognition_schedules
  WHERE project_id = p_project_id AND period_month = v_period_month
  FOR UPDATE;

  IF v_schedule_status = 'posted' AND v_journal_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM planner_journal_entries rev
    WHERE rev.org_id = p_org_id
      AND rev.reference_type = 'reversal'
      AND rev.reference_id = v_journal_id
  ) THEN
    RETURN v_journal_id;
  END IF;

  PERFORM public.seed_default_chart_of_accounts(p_org_id);

  SELECT id INTO v_uang_muka_id
  FROM planner_finance_accounts
  WHERE org_id = p_org_id AND type = 'uang_muka_klien' AND is_system = true AND project_id IS NULL
  LIMIT 1;
  IF v_uang_muka_id IS NULL THEN
    RAISE EXCEPTION 'akun_uang_muka_klien_tidak_ditemukan';
  END IF;

  SELECT id INTO v_pendapatan_id
  FROM planner_finance_accounts
  WHERE org_id = p_org_id AND type = 'pendapatan_proyek' AND is_system = true AND project_id IS NULL
  LIMIT 1;
  IF v_pendapatan_id IS NULL THEN
    RAISE EXCEPTION 'akun_pendapatan_proyek_tidak_ditemukan';
  END IF;

  v_journal_id := public.planner_post_journal(
    p_org_id,
    v_entry_date,
    'Pengakuan pendapatan DP (' || v_method || '): ' || COALESCE(v_proj_name, '') || ' ' || to_char(v_period_month, 'YYYY-MM'),
    'revenue_recognition',
    v_schedule_id,
    jsonb_build_array(
      jsonb_build_object(
        'account_id', v_uang_muka_id,
        'debit', p_amount,
        'credit', 0,
        'project_id', p_project_id
      ),
      jsonb_build_object(
        'account_id', v_pendapatan_id,
        'debit', 0,
        'credit', p_amount,
        'project_id', p_project_id
      )
    ),
    v_actor
  );

  UPDATE planner_revenue_recognition_schedules
  SET recognition_method = v_method,
      progress_pct = p_progress_pct,
      amount_rupiah = p_amount,
      status = 'posted',
      journal_entry_id = v_journal_id,
      posted_at = now()
  WHERE id = v_schedule_id;

  RETURN v_journal_id;
END;
$$;

REVOKE ALL ON FUNCTION public.planner_recognize_project_dp_revenue(uuid, uuid, date, bigint, numeric, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.planner_recognize_project_dp_revenue(uuid, uuid, date, bigint, numeric, uuid) TO authenticated;
