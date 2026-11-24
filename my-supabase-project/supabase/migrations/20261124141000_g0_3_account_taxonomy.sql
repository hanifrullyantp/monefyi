-- Fase G0-3: Perbaikan Taksonomi Kategori Akun ('pendapatan' / 'beban') & Neraca (BLOCKED remote — jangan push ke produksi)
-- Memperbaiki kategori akun P&L agar tidak lagi masuk ke 'aktiva' atau 'pasiva' pada Neraca:
--   1. Memperluas CHECK constraint planner_finance_accounts.category menjadi ('aktiva', 'pasiva', 'pendapatan', 'beban').
--   2. Memperbarui baris akun lama: pendapatan_proyek -> 'pendapatan', hpp_*/beban_* -> 'beban'.
--   3. Memperbarui seed_default_chart_of_accounts(p_org_id) dengan 4 kategori akun.
--   4. Memperbarui planner_apply_line_balance() agar saldo normal debit ('aktiva', 'beban') memakai debit - credit
--      dan saldo normal kredit ('pasiva', 'pendapatan') memakai credit - debit.

-- 1. Perluas CHECK constraint category pada planner_finance_accounts
ALTER TABLE planner_finance_accounts
  DROP CONSTRAINT IF EXISTS planner_finance_accounts_category_check;

ALTER TABLE planner_finance_accounts
  ADD CONSTRAINT planner_finance_accounts_category_check
  CHECK (category IN ('aktiva', 'pasiva', 'pendapatan', 'beban'));

-- 2. Perbarui kategori akun yang sudah ada
UPDATE planner_finance_accounts
SET category = 'pendapatan',
    updated_at = now()
WHERE type = 'pendapatan_proyek'
  AND category IS DISTINCT FROM 'pendapatan';

UPDATE planner_finance_accounts
SET category = 'beban',
    updated_at = now()
WHERE type IN (
    'hpp_material',
    'hpp_labor',
    'hpp_equipment',
    'hpp_overhead',
    'hpp_other',
    'hpp_uncategorized',
    'beban_opex',
    'beban_penyusutan'
  )
  AND category IS DISTINCT FROM 'beban';

-- 3. Perbarui seed_default_chart_of_accounts dengan taksonomi 4 kategori
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

-- 4. Perbarui trigger planner_apply_line_balance untuk saldo normal 4 kategori
CREATE OR REPLACE FUNCTION public.planner_apply_line_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_category text;
  v_delta bigint;
BEGIN
  SELECT category INTO v_category FROM planner_finance_accounts WHERE id = NEW.account_id;
  IF v_category IN ('aktiva', 'beban') THEN
    v_delta := NEW.debit - NEW.credit;
  ELSE
    v_delta := NEW.credit - NEW.debit;
  END IF;
  PERFORM set_config('planner.ledger_write', 'on', true);
  UPDATE planner_finance_accounts
  SET current_balance = current_balance + v_delta,
      updated_at = now()
  WHERE id = NEW.account_id;
  RETURN NEW;
END;
$$;
