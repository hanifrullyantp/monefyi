-- Fase G8-2: Model Kehadiran day_fraction, Tarif Beriwayat effectiveFrom, Akrual Upah Proyek (Dr hpp_labor / Cr hutang_gaji), & Kebijakan Kerja (BLOCKED remote — jangan push ke produksi)
-- 1) Memperluas CHECK constraint planner_finance_accounts_type_check dengan 'hutang_gaji' & memperbarui seed_default_chart_of_accounts.
-- 2) Membuat tabel planner_attendance_project_splits (day_fraction (0, 1], trigger jaga total/hari <= 1.0, & journal_entry_id ON DELETE RESTRICT).
-- 3) Membuat tabel planner_compensation_rate_history (tarif daily/borongan/monthly beriwayat effective_from tanpa fallback tersembunyi).
-- 4) Membuat tabel planner_daily_assignments (jadwal harian PM) & planner_org_labor_policies (kebijakan kerja & statutory_config_json).
-- 5) Mengaktifkan RLS ketat berbasis is_org_member(org_id, ...) pada seluruh tabel baru tanpa memutasi tabel jurnal.

-- 1. Perluas COA dengan 'hutang_gaji'
ALTER TABLE planner_finance_accounts
  DROP CONSTRAINT IF EXISTS planner_finance_accounts_type_check;

ALTER TABLE planner_finance_accounts
  ADD CONSTRAINT planner_finance_accounts_type_check
  CHECK (type IN (
    'kas', 'piutang', 'piutang_retensi', 'uang_muka_klien', 'stok', 'aset_tetap', 'akumulasi_penyusutan', 'prabayar',
    'hutang_dagang', 'hutang_gaji', 'hutang_pajak', 'hutang_lain',
    'modal_disetor', 'dividen', 'laba_ditahan',
    'pendapatan_proyek',
    'hpp_material', 'hpp_labor', 'hpp_equipment', 'hpp_overhead', 'hpp_other', 'hpp_uncategorized',
    'beban_opex', 'beban_penyusutan',
    'laba'
  ));

CREATE OR REPLACE FUNCTION public.seed_default_chart_of_accounts(p_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_org_id IS NULL THEN
    RAISE EXCEPTION 'org_id required';
  END IF;

  INSERT INTO planner_finance_accounts (org_id, type, category, name, is_system)
  SELECT p_org_id, v.acc_type, v.acc_category, v.acc_name, true
  FROM (VALUES
    ('kas', 'aktiva', 'Kas Bisnis'),
    ('piutang', 'aktiva', 'Piutang Usaha'),
    ('piutang_retensi', 'aktiva', 'Piutang Retensi'),
    ('stok', 'aktiva', 'Persediaan Barang'),
    ('aset_tetap', 'aktiva', 'Properti & Peralatan'),
    ('akumulasi_penyusutan', 'pasiva', 'Akumulasi Penyusutan'),
    ('prabayar', 'aktiva', 'Biaya Dibayar Dimuka'),
    ('uang_muka_klien', 'pasiva', 'Uang Muka Klien'),
    ('hutang_dagang', 'pasiva', 'Hutang Dagang'),
    ('hutang_gaji', 'pasiva', 'Hutang Gaji & Upah'),
    ('hutang_pajak', 'pasiva', 'Hutang Pajak'),
    ('hutang_lain', 'pasiva', 'Hutang Lain-lain'),
    ('modal_disetor', 'pasiva', 'Modal Disetor'),
    ('dividen', 'pasiva', 'Dividen / Prive'),
    ('laba_ditahan', 'pasiva', 'Laba Ditahan'),
    ('pendapatan_proyek', 'pendapatan', 'Pendapatan Proyek'),
    ('hpp_material', 'beban', 'HPP Proyek - Material'),
    ('hpp_labor', 'beban', 'HPP Proyek - Tenaga Kerja'),
    ('hpp_equipment', 'beban', 'HPP Proyek - Peralatan'),
    ('hpp_overhead', 'beban', 'HPP Proyek - Overhead'),
    ('hpp_other', 'beban', 'HPP Proyek - Lainnya'),
    ('hpp_uncategorized', 'beban', 'HPP Proyek - Belum Dikategorikan'),
    ('beban_opex', 'beban', 'Beban Operasional'),
    ('beban_penyusutan', 'beban', 'Beban Penyusutan'),
    ('laba', 'pasiva', 'Laba Periode Berjalan')
  ) AS v(acc_type, acc_category, acc_name)
  WHERE NOT EXISTS (
    SELECT 1 FROM planner_finance_accounts a
    WHERE a.org_id = p_org_id AND a.type = v.acc_type AND a.is_system = true AND a.project_id IS NULL
  );
END;
$$;

-- 2. Tabel pembagian kehadiran harian per proyek (`day_fraction`)
CREATE TABLE IF NOT EXISTS planner_attendance_project_splits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES planner_organizations(id) ON DELETE CASCADE,
  worker_id uuid NOT NULL,
  party_id uuid REFERENCES planner_parties(id) ON DELETE RESTRICT,
  project_id uuid NOT NULL REFERENCES planner_projects(id) ON DELETE RESTRICT,
  work_date date NOT NULL,
  day_fraction numeric(4,2) NOT NULL CHECK (day_fraction > 0 AND day_fraction <= 1),
  regular_hours numeric(5,2) NOT NULL DEFAULT 0 CHECK (regular_hours >= 0),
  overtime_hours numeric(5,2) NOT NULL DEFAULT 0 CHECK (overtime_hours >= 0),
  source text NOT NULL DEFAULT 'manual' CHECK (
    source IN ('pm_schedule', 'manual', 'check_in', 'reported_mismatch_schedule', 'reported_without_schedule')
  ),
  verification_status text NOT NULL DEFAULT 'pending' CHECK (
    verification_status IN ('pending', 'needs_confirmation', 'confirmed', 'accrued', 'rejected')
  ),
  journal_entry_id uuid REFERENCES planner_journal_entries(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attendance_splits_org_worker_date
  ON planner_attendance_project_splits(org_id, worker_id, work_date);

CREATE INDEX IF NOT EXISTS idx_attendance_splits_org_project_date
  ON planner_attendance_project_splits(org_id, project_id, work_date);

CREATE INDEX IF NOT EXISTS idx_attendance_splits_journal
  ON planner_attendance_project_splits(journal_entry_id)
  WHERE journal_entry_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.planner_guard_attendance_split_integrity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_fraction numeric(6,2);
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.journal_entry_id IS NOT NULL THEN
      RAISE EXCEPTION 'split_kehadiran_terikat_jurnal_tidak_boleh_dihapus'
        USING ERRCODE = '55000';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.journal_entry_id IS NOT NULL THEN
    IF NEW.day_fraction IS DISTINCT FROM OLD.day_fraction
       OR NEW.regular_hours IS DISTINCT FROM OLD.regular_hours
       OR NEW.overtime_hours IS DISTINCT FROM OLD.overtime_hours
       OR NEW.project_id IS DISTINCT FROM OLD.project_id
       OR NEW.worker_id IS DISTINCT FROM OLD.worker_id
       OR NEW.work_date IS DISTINCT FROM OLD.work_date
       OR NEW.journal_entry_id IS DISTINCT FROM OLD.journal_entry_id THEN
      RAISE EXCEPTION 'split_kehadiran_terikat_jurnal_tidak_boleh_diubah'
        USING ERRCODE = '55000';
    END IF;
  END IF;

  SELECT COALESCE(SUM(day_fraction), 0)
  INTO v_total_fraction
  FROM planner_attendance_project_splits
  WHERE org_id = NEW.org_id
    AND worker_id = NEW.worker_id
    AND work_date = NEW.work_date
    AND verification_status <> 'rejected'
    AND id <> NEW.id;

  IF NEW.verification_status <> 'rejected' AND (v_total_fraction + NEW.day_fraction) > 1.00 THEN
    RAISE EXCEPTION 'total_day_fraction_melebihi_satu_hari'
      USING ERRCODE = '23514',
            HINT = 'Jumlah day_fraction per pekerja per tanggal tidak boleh melebihi 1.00.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS planner_attendance_splits_integrity_guard ON planner_attendance_project_splits;
CREATE TRIGGER planner_attendance_splits_integrity_guard
  BEFORE INSERT OR UPDATE OR DELETE ON planner_attendance_project_splits
  FOR EACH ROW EXECUTE FUNCTION public.planner_guard_attendance_split_integrity();

ALTER TABLE planner_attendance_project_splits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS planner_attendance_splits_select ON planner_attendance_project_splits;
DROP POLICY IF EXISTS planner_attendance_splits_insert ON planner_attendance_project_splits;
DROP POLICY IF EXISTS planner_attendance_splits_update ON planner_attendance_project_splits;

CREATE POLICY planner_attendance_splits_select ON planner_attendance_project_splits
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, 'worker'));

CREATE POLICY planner_attendance_splits_insert ON planner_attendance_project_splits
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id, 'manager'));

CREATE POLICY planner_attendance_splits_update ON planner_attendance_project_splits
  FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id, 'manager'))
  WITH CHECK (public.is_org_member(org_id, 'manager'));

-- 3. Tabel riwayat tarif kompensasi beriwayat `effective_from`
CREATE TABLE IF NOT EXISTS planner_compensation_rate_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES planner_organizations(id) ON DELETE CASCADE,
  worker_id uuid,
  role_name text,
  rate_type text NOT NULL CHECK (rate_type IN ('daily', 'borongan', 'monthly')),
  rate_rupiah bigint NOT NULL CHECK (rate_rupiah > 0),
  effective_from date NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (worker_id IS NOT NULL OR NULLIF(btrim(COALESCE(role_name, '')), '') IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_compensation_rate_history_worker
  ON planner_compensation_rate_history(org_id, worker_id, effective_from DESC)
  WHERE worker_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_compensation_rate_history_role
  ON planner_compensation_rate_history(org_id, role_name, effective_from DESC)
  WHERE worker_id IS NULL;

ALTER TABLE planner_compensation_rate_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS planner_compensation_rate_history_select ON planner_compensation_rate_history;
DROP POLICY IF EXISTS planner_compensation_rate_history_insert ON planner_compensation_rate_history;

CREATE POLICY planner_compensation_rate_history_select ON planner_compensation_rate_history
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, 'worker'));

CREATE POLICY planner_compensation_rate_history_insert ON planner_compensation_rate_history
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id, 'manager'));

-- 4. Tabel jadwal penugasan harian PM
CREATE TABLE IF NOT EXISTS planner_daily_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES planner_organizations(id) ON DELETE CASCADE,
  worker_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES planner_projects(id) ON DELETE CASCADE,
  work_date date NOT NULL,
  source_work_item_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_assignments_org_worker_date
  ON planner_daily_assignments(org_id, worker_id, work_date);

ALTER TABLE planner_daily_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS planner_daily_assignments_select ON planner_daily_assignments;
DROP POLICY IF EXISTS planner_daily_assignments_insert ON planner_daily_assignments;
DROP POLICY IF EXISTS planner_daily_assignments_update ON planner_daily_assignments;

CREATE POLICY planner_daily_assignments_select ON planner_daily_assignments
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, 'worker'));

CREATE POLICY planner_daily_assignments_insert ON planner_daily_assignments
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id, 'manager'));

CREATE POLICY planner_daily_assignments_update ON planner_daily_assignments
  FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id, 'manager'))
  WITH CHECK (public.is_org_member(org_id, 'manager'));

-- 5. Tabel kebijakan kerja & konfigurasi BPJS/PPh 21 organisasi
CREATE TABLE IF NOT EXISTS planner_org_labor_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES planner_organizations(id) ON DELETE CASCADE,
  standard_work_days integer NOT NULL DEFAULT 25 CHECK (standard_work_days > 0 AND standard_work_days <= 31),
  standard_hours_per_day numeric(4,2) NOT NULL DEFAULT 8.00 CHECK (standard_hours_per_day > 0 AND standard_hours_per_day <= 24),
  overtime_multiplier numeric(4,2) NOT NULL DEFAULT 1.50 CHECK (overtime_multiplier >= 0),
  max_kasbon_deduction_pct numeric(5,2) NOT NULL DEFAULT 30.00 CHECK (max_kasbon_deduction_pct >= 0 AND max_kasbon_deduction_pct <= 100),
  statutory_config_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id)
);

CREATE INDEX IF NOT EXISTS idx_org_labor_policies_org
  ON planner_org_labor_policies(org_id);

ALTER TABLE planner_org_labor_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS planner_org_labor_policies_select ON planner_org_labor_policies;
DROP POLICY IF EXISTS planner_org_labor_policies_insert ON planner_org_labor_policies;
DROP POLICY IF EXISTS planner_org_labor_policies_update ON planner_org_labor_policies;

CREATE POLICY planner_org_labor_policies_select ON planner_org_labor_policies
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, 'worker'));

CREATE POLICY planner_org_labor_policies_insert ON planner_org_labor_policies
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id, 'manager'));

CREATE POLICY planner_org_labor_policies_update ON planner_org_labor_policies
  FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id, 'manager'))
  WITH CHECK (public.is_org_member(org_id, 'manager'));
