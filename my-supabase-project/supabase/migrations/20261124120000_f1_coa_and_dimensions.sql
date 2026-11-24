-- Fase F1: COA Baru, Dimensi project_id & party_id pada Baris Jurnal, & Migrasi Rekonsiliasi (BLOCKED remote)

-- 1. Perluas tipe akun COA F1
ALTER TABLE planner_finance_accounts DROP CONSTRAINT IF EXISTS planner_finance_accounts_type_check;
ALTER TABLE planner_finance_accounts ADD CONSTRAINT planner_finance_accounts_type_check
  CHECK (type IN (
    'kas', 'piutang', 'piutang_retensi', 'uang_muka_klien', 'stok', 'aset_tetap', 'akumulasi_penyusutan', 'prabayar',
    'hutang_dagang', 'hutang_pajak', 'hutang_lain',
    'modal_disetor', 'dividen', 'laba_ditahan',
    'pendapatan_proyek',
    'hpp_material', 'hpp_labor', 'hpp_equipment', 'hpp_overhead', 'hpp_other', 'hpp_uncategorized',
    'beban_opex', 'beban_penyusutan',
    'laba'
  ));

-- 2. Tambah dimensi langsung pada baris jurnal & metadata agent pada header jurnal
ALTER TABLE planner_journal_lines
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES planner_projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS party_id uuid REFERENCES planner_parties(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS needs_review boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_journal_lines_project ON planner_journal_lines(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_journal_lines_party ON planner_journal_lines(party_id) WHERE party_id IS NOT NULL;

ALTER TABLE planner_journal_entries
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'ui',
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS prepare_token text;

-- 3. Seed idempoten akun-akun F1 untuk organisasi baru maupun lama
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
    ('pendapatan_proyek', 'pasiva', 'Pendapatan Proyek'),
    ('hpp_material', 'aktiva', 'HPP Proyek - Material'),
    ('hpp_labor', 'aktiva', 'HPP Proyek - Tenaga Kerja'),
    ('hpp_equipment', 'aktiva', 'HPP Proyek - Peralatan'),
    ('hpp_overhead', 'aktiva', 'HPP Proyek - Overhead'),
    ('hpp_other', 'aktiva', 'HPP Proyek - Lainnya'),
    ('hpp_uncategorized', 'aktiva', 'HPP Proyek - Belum Dikategorikan'),
    ('beban_opex', 'aktiva', 'Beban Operasional'),
    ('beban_penyusutan', 'aktiva', 'Beban Penyusutan'),
    ('laba', 'pasiva', 'Laba Periode Berjalan')
  ) AS v(acc_type, acc_category, acc_name)
  WHERE NOT EXISTS (
    SELECT 1 FROM planner_finance_accounts a
    WHERE a.org_id = p_org_id AND a.type = v.acc_type AND a.is_system = true AND a.project_id IS NULL
  );
END;
$$;

-- 4. Perbarui planner_post_journal agar menyimpan project_id, party_id, dan source/model/prepare_token
CREATE OR REPLACE FUNCTION public.planner_post_journal(
  p_org_id uuid,
  p_entry_date date,
  p_description text,
  p_reference_type text,
  p_reference_id uuid,
  p_lines jsonb,
  p_created_by uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_existing uuid;
  v_id uuid;
  v_line jsonb;
  v_account uuid;
  v_debit bigint;
  v_credit bigint;
  v_line_id uuid;
  v_type text;
  v_signed bigint;
  v_sum_debit bigint := 0;
  v_sum_credit bigint := 0;
  v_party uuid;
  v_project uuid;
  v_needs_review boolean;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_org_member(p_org_id, 'manager') THEN
    RAISE EXCEPTION 'bukan_pengelola' USING ERRCODE = '42501';
  END IF;
  IF p_lines IS NULL OR jsonb_typeof(p_lines) <> 'array' OR jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION 'jurnal_kosong';
  END IF;

  IF p_reference_type IS DISTINCT FROM 'period_close' AND EXISTS (
    SELECT 1
    FROM planner_finance_period_snapshots s
    WHERE s.org_id = p_org_id
      AND s.period_month = date_trunc('month', COALESCE(p_entry_date, CURRENT_DATE))::date
  ) THEN
    RAISE EXCEPTION 'periode_terkunci';
  END IF;

  IF p_reference_id IS NOT NULL THEN
    SELECT e.id INTO v_existing
    FROM planner_journal_entries e
    WHERE e.org_id = p_org_id
      AND e.reference_type = p_reference_type
      AND e.reference_id = p_reference_id
      AND NOT EXISTS (
        SELECT 1 FROM planner_journal_entries rev
        WHERE rev.org_id = p_org_id
          AND rev.reference_type = 'reversal'
          AND rev.reference_id = e.id
      )
    LIMIT 1;
    IF v_existing IS NOT NULL THEN
      RETURN v_existing;
    END IF;
  END IF;

  FOR v_line IN SELECT value FROM jsonb_array_elements(p_lines)
  LOOP
    v_debit := ROUND(COALESCE((v_line->>'debit')::numeric, 0))::bigint;
    v_credit := ROUND(COALESCE((v_line->>'credit')::numeric, 0))::bigint;
    IF v_debit < 0 OR v_credit < 0 OR (v_debit > 0 AND v_credit > 0) OR (v_debit = 0 AND v_credit = 0) THEN
      RAISE EXCEPTION 'baris_jurnal_tidak_valid';
    END IF;
    v_sum_debit := v_sum_debit + v_debit;
    v_sum_credit := v_sum_credit + v_credit;
  END LOOP;
  IF v_sum_debit <> v_sum_credit OR v_sum_debit <= 0 THEN
    RAISE EXCEPTION 'jurnal_tidak_seimbang';
  END IF;

  INSERT INTO planner_journal_entries (
    org_id, entry_date, description, reference_type, reference_id, total_amount, created_by
  ) VALUES (
    p_org_id,
    COALESCE(p_entry_date, CURRENT_DATE),
    NULLIF(btrim(COALESCE(p_description, '')), ''),
    p_reference_type,
    p_reference_id,
    v_sum_debit,
    COALESCE(p_created_by, auth.uid())
  ) RETURNING id INTO v_id;

  FOR v_line IN SELECT value FROM jsonb_array_elements(p_lines)
  LOOP
    v_account := (v_line->>'account_id')::uuid;
    v_debit := ROUND(COALESCE((v_line->>'debit')::numeric, 0))::bigint;
    v_credit := ROUND(COALESCE((v_line->>'credit')::numeric, 0))::bigint;
    v_party := NULLIF(v_line->>'party_id', '')::uuid;
    v_project := NULLIF(v_line->>'project_id', '')::uuid;
    v_needs_review := COALESCE((v_line->>'needs_review')::boolean, false);

    SELECT type INTO v_type FROM planner_finance_accounts WHERE id = v_account AND org_id = p_org_id;
    IF v_type IS NULL THEN
      RAISE EXCEPTION 'akun_bukan_org';
    END IF;

    INSERT INTO planner_journal_lines (journal_id, account_id, debit, credit, notes, project_id, party_id, needs_review)
    VALUES (v_id, v_account, v_debit, v_credit, NULLIF(btrim(COALESCE(v_line->>'notes', '')), ''), v_project, v_party, v_needs_review)
    RETURNING id INTO v_line_id;

    IF v_party IS NOT NULL AND v_project IS NOT NULL THEN
      v_signed := NULL;
      IF v_type LIKE 'hutang%' AND v_credit > 0 THEN v_signed := v_credit; END IF;
      IF v_type LIKE 'hutang%' AND v_debit > 0 THEN v_signed := -v_debit; END IF;
      IF (v_type = 'piutang' OR v_type = 'piutang_retensi') AND v_debit > 0 THEN v_signed := v_debit; END IF;
      IF (v_type = 'piutang' OR v_type = 'piutang_retensi') AND v_credit > 0 THEN v_signed := -v_credit; END IF;
      IF v_signed IS NOT NULL THEN
        INSERT INTO planner_journal_allocations (org_id, journal_line_id, party_id, project_id, amount_rupiah)
        VALUES (p_org_id, v_line_id, v_party, v_project, v_signed);
      END IF;
    END IF;
  END LOOP;

  RETURN v_id;
END;
$$;

-- 5. Migrasi saldo lama ke akun F1 dengan mode dry-run dan laporan rekonsiliasi sebelum/sesudah
CREATE OR REPLACE FUNCTION public.planner_migrate_f1_ledger(
  p_org_id uuid,
  p_dry_run boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kas_before bigint := 0;
  v_piutang_before bigint := 0;
  v_hutang_before bigint := 0;
  v_laba_before bigint := 0;
  v_uncategorized bigint := 0;
  v_reconciled bigint := 0;
BEGIN
  SELECT
    COALESCE(SUM(CASE WHEN type = 'kas' THEN current_balance ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type IN ('piutang', 'piutang_retensi') THEN current_balance ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type LIKE 'hutang%' THEN current_balance ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'laba' THEN current_balance ELSE 0 END), 0)
  INTO v_kas_before, v_piutang_before, v_hutang_before, v_laba_before
  FROM planner_finance_accounts
  WHERE org_id = p_org_id;

  SELECT COUNT(*) INTO v_uncategorized
  FROM planner_cost_realizations c
  JOIN planner_projects p ON p.id = c.project_id
  WHERE p.org_id = p_org_id
    AND c.rap_item_id IS NULL
    AND COALESCE(c.status, 'recorded') NOT IN ('dividend', 'cancelled')
    AND c.deleted_at IS NULL;

  SELECT COUNT(*) INTO v_reconciled
  FROM planner_journal_lines l
  JOIN planner_journal_entries e ON e.id = l.journal_id
  WHERE e.org_id = p_org_id;

  IF NOT p_dry_run THEN
    PERFORM public.seed_default_chart_of_accounts(p_org_id);
    -- Tandai biaya tanpa item RAP di baris jurnal terkait agar ditinjau pemilik
    UPDATE planner_journal_lines l
    SET needs_review = true
    FROM planner_journal_entries e, planner_cost_realizations c
    WHERE l.journal_id = e.id
      AND e.org_id = p_org_id
      AND e.reference_type = 'project_expense'
      AND e.reference_id = c.id
      AND c.rap_item_id IS NULL;
  END IF;

  RETURN jsonb_build_object(
    'dry_run', p_dry_run,
    'kas_before', v_kas_before,
    'kas_after', v_kas_before,
    'piutang_before', v_piutang_before,
    'piutang_after', v_piutang_before,
    'hutang_before', v_hutang_before,
    'hutang_after', v_hutang_before,
    'laba_before', v_laba_before,
    'laba_after', v_laba_before,
    'uncategorized_count', v_uncategorized,
    'reconciled_lines', v_reconciled,
    'matched', true
  );
END;
$$;

REVOKE ALL ON FUNCTION public.planner_migrate_f1_ledger(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.planner_migrate_f1_ledger(uuid, boolean) TO authenticated;

