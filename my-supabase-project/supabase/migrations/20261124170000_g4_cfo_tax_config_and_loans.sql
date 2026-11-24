-- Fase G4-2: Konfigurasi Pajak Organisasi & Pinjaman Pembiayaan (BLOCKED remote — jangan push ke produksi)
-- 1) Membuat tabel planner_org_tax_configs dengan UNIQUE(org_id) agar tarif pajak, rezim PPh, tanggal setor/lapor,
--    dan ambang kapitalisasi aset selalu bersumber dari konfigurasi organisasi (bukan hardcode) serta mencatat verified_at.
-- 2) Membuat tabel planner_financing_loans untuk jadwal pinjaman modal kerja/aset per organisasi.
-- 3) Mengaktifkan RLS ketat berbasis is_org_member(org_id, ...) pada kedua tabel tanpa menyentuh/memutasi tabel jurnal.

CREATE TABLE IF NOT EXISTS planner_org_tax_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES planner_organizations(id) ON DELETE CASCADE,
  profile_code text NOT NULL,
  effective_from date NOT NULL,
  regulation_ref text NOT NULL,
  verified_at timestamptz,
  is_pkp boolean NOT NULL DEFAULT false,
  ppn_rate_pct numeric(5,2) CHECK (ppn_rate_pct IS NULL OR (ppn_rate_pct >= 0 AND ppn_rate_pct <= 100)),
  income_tax_regime text NOT NULL CHECK (
    income_tax_regime IN ('pph_final_konstruksi', 'pph_badan', 'pph_final_umkm')
  ),
  income_tax_rate_pct numeric(5,2) CHECK (
    income_tax_rate_pct IS NULL OR (income_tax_rate_pct >= 0 AND income_tax_rate_pct <= 100)
  ),
  payment_due_day integer CHECK (payment_due_day IS NULL OR (payment_due_day BETWEEN 1 AND 31)),
  filing_due_day integer CHECK (filing_due_day IS NULL OR (filing_due_day BETWEEN 1 AND 31)),
  capitalization_threshold_rupiah bigint NOT NULL DEFAULT 5000000 CHECK (
    capitalization_threshold_rupiah >= 0
  ),
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id)
);

CREATE INDEX IF NOT EXISTS idx_planner_org_tax_configs_org
  ON planner_org_tax_configs(org_id);

ALTER TABLE planner_org_tax_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS planner_org_tax_configs_select ON planner_org_tax_configs;
DROP POLICY IF EXISTS planner_org_tax_configs_insert ON planner_org_tax_configs;
DROP POLICY IF EXISTS planner_org_tax_configs_update ON planner_org_tax_configs;

CREATE POLICY planner_org_tax_configs_select ON planner_org_tax_configs
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, 'worker'));

CREATE POLICY planner_org_tax_configs_insert ON planner_org_tax_configs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id, 'manager'));

CREATE POLICY planner_org_tax_configs_update ON planner_org_tax_configs
  FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id, 'manager'))
  WITH CHECK (public.is_org_member(org_id, 'manager'));

CREATE TABLE IF NOT EXISTS planner_financing_loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES planner_organizations(id) ON DELETE CASCADE,
  lender_name text NOT NULL,
  principal_rupiah bigint NOT NULL CHECK (principal_rupiah > 0),
  annual_interest_rate_pct numeric(6,3) NOT NULL CHECK (annual_interest_rate_pct >= 0),
  tenor_months integer NOT NULL CHECK (tenor_months > 0),
  start_date date NOT NULL,
  monthly_installment_rupiah bigint NOT NULL CHECK (monthly_installment_rupiah > 0),
  status text NOT NULL DEFAULT 'active' CHECK (
    status IN ('draft', 'active', 'paid_off', 'cancelled')
  ),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_planner_financing_loans_org_status
  ON planner_financing_loans(org_id, status, start_date);

ALTER TABLE planner_financing_loans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS planner_financing_loans_select ON planner_financing_loans;
DROP POLICY IF EXISTS planner_financing_loans_insert ON planner_financing_loans;
DROP POLICY IF EXISTS planner_financing_loans_update ON planner_financing_loans;

CREATE POLICY planner_financing_loans_select ON planner_financing_loans
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, 'worker'));

CREATE POLICY planner_financing_loans_insert ON planner_financing_loans
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id, 'manager'));

CREATE POLICY planner_financing_loans_update ON planner_financing_loans
  FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id, 'manager'))
  WITH CHECK (public.is_org_member(org_id, 'manager'));
