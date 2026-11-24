-- Fase G0-6: Identitas Pihak via party_id & Pinjaman Antar Proyek via Jurnal Double-Entry (BLOCKED remote — jangan push ke produksi)
-- 1) Menambahkan reference_type 'interproject_loan' dan 'interproject_loan_repayment' pada planner_journal_entries.
-- 2) Menambahkan kolom & indeks party_id pada tabel sumber hutang/piutang/pemasukan/biaya secara idempoten.
-- 3) Membuat RPC append-only public.planner_post_interproject_loan(...) untuk pencairan & pelunasan pinjaman antar proyek 4-baris seimbang.

-- 1. Perluas constraint reference_type pada planner_journal_entries
ALTER TABLE planner_journal_entries DROP CONSTRAINT IF EXISTS planner_journal_entries_reference_type_check;
ALTER TABLE planner_journal_entries ADD CONSTRAINT planner_journal_entries_reference_type_check
  CHECK (reference_type IS NULL OR reference_type IN (
    'project_expense', 'project_income', 'opex', 'transfer', 'manual',
    'amortize', 'depreciation', 'opening',
    'project_close', 'payroll_disbursement', 'bon_disbursement', 'payroll_accrual', 'period_close',
    'reversal', 'payable_payment', 'receivable_receipt', 'dividend', 'f1_migration',
    'revenue_recognition', 'interproject_loan', 'interproject_loan_repayment'
  ));

-- 2. Tambah kolom party_id + indeks pada tabel sumber secara aman (idempoten)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'planner_payables'
  ) THEN
    ALTER TABLE public.planner_payables
      ADD COLUMN IF NOT EXISTS party_id uuid REFERENCES public.planner_parties(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_planner_payables_party_id
      ON public.planner_payables(party_id) WHERE party_id IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'planner_receivables'
  ) THEN
    ALTER TABLE public.planner_receivables
      ADD COLUMN IF NOT EXISTS party_id uuid REFERENCES public.planner_parties(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_planner_receivables_party_id
      ON public.planner_receivables(party_id) WHERE party_id IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'planner_project_incomes'
  ) THEN
    ALTER TABLE public.planner_project_incomes
      ADD COLUMN IF NOT EXISTS party_id uuid REFERENCES public.planner_parties(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_planner_project_incomes_party_id
      ON public.planner_project_incomes(party_id) WHERE party_id IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'planner_cost_realizations'
  ) THEN
    ALTER TABLE public.planner_cost_realizations
      ADD COLUMN IF NOT EXISTS party_id uuid REFERENCES public.planner_parties(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_planner_cost_realizations_party_id
      ON public.planner_cost_realizations(party_id) WHERE party_id IS NOT NULL;
  END IF;
END
$$;

-- 3. RPC append-only pinjaman antar proyek via jurnal double-entry 4-baris seimbang
CREATE OR REPLACE FUNCTION public.planner_post_interproject_loan(
  p_org_id uuid,
  p_from_project_id uuid,
  p_to_project_id uuid,
  p_amount bigint,
  p_entry_date date DEFAULT CURRENT_DATE,
  p_description text DEFAULT NULL,
  p_is_repayment boolean DEFAULT false,
  p_actor uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_from_org_id uuid;
  v_to_org_id uuid;
  v_from_name text;
  v_to_name text;
  v_from_kas_id uuid;
  v_to_kas_id uuid;
  v_piutang_id uuid;
  v_hutang_lain_id uuid;
  v_ref_type text;
  v_desc text;
  v_lines jsonb;
  v_journal_id uuid;
  v_actor uuid := COALESCE(p_actor, auth.uid());
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_org_member(p_org_id, 'manager') THEN
    RAISE EXCEPTION 'bukan_pengelola' USING ERRCODE = '42501';
  END IF;

  IF p_from_project_id IS NULL OR p_to_project_id IS NULL OR p_from_project_id = p_to_project_id THEN
    RAISE EXCEPTION 'proyek_pinjaman_harus_berbeda';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'nominal_tidak_valid';
  END IF;

  SELECT org_id, name INTO v_from_org_id, v_from_name
  FROM planner_projects
  WHERE id = p_from_project_id;
  IF v_from_org_id IS NULL OR v_from_org_id <> p_org_id THEN
    RAISE EXCEPTION 'proyek_asal_tidak_ditemukan';
  END IF;

  SELECT org_id, name INTO v_to_org_id, v_to_name
  FROM planner_projects
  WHERE id = p_to_project_id;
  IF v_to_org_id IS NULL OR v_to_org_id <> p_org_id THEN
    RAISE EXCEPTION 'proyek_tujuan_tidak_ditemukan';
  END IF;

  PERFORM public.seed_default_chart_of_accounts(p_org_id);

  -- Pastikan dompet kas kedua proyek tersedia
  SELECT id INTO v_from_kas_id
  FROM planner_finance_accounts
  WHERE org_id = p_org_id AND type = 'kas' AND project_id = p_from_project_id AND is_active = true
  LIMIT 1;
  IF v_from_kas_id IS NULL THEN
    INSERT INTO planner_finance_accounts (org_id, type, category, name, project_id, is_system)
    VALUES (p_org_id, 'kas', 'aktiva', 'Kas ' || COALESCE(v_from_name, 'Proyek'), p_from_project_id, false)
    RETURNING id INTO v_from_kas_id;
  END IF;

  SELECT id INTO v_to_kas_id
  FROM planner_finance_accounts
  WHERE org_id = p_org_id AND type = 'kas' AND project_id = p_to_project_id AND is_active = true
  LIMIT 1;
  IF v_to_kas_id IS NULL THEN
    INSERT INTO planner_finance_accounts (org_id, type, category, name, project_id, is_system)
    VALUES (p_org_id, 'kas', 'aktiva', 'Kas ' || COALESCE(v_to_name, 'Proyek'), p_to_project_id, false)
    RETURNING id INTO v_to_kas_id;
  END IF;

  SELECT id INTO v_piutang_id
  FROM planner_finance_accounts
  WHERE org_id = p_org_id AND type = 'piutang' AND is_system = true AND project_id IS NULL
  LIMIT 1;
  IF v_piutang_id IS NULL THEN
    RAISE EXCEPTION 'akun_piutang_tidak_ditemukan';
  END IF;

  SELECT id INTO v_hutang_lain_id
  FROM planner_finance_accounts
  WHERE org_id = p_org_id AND type = 'hutang_lain' AND is_system = true AND project_id IS NULL
  LIMIT 1;
  IF v_hutang_lain_id IS NULL THEN
    RAISE EXCEPTION 'akun_hutang_lain_tidak_ditemukan';
  END IF;

  IF COALESCE(p_is_repayment, false) THEN
    v_ref_type := 'interproject_loan_repayment';
    v_desc := COALESCE(
      NULLIF(btrim(COALESCE(p_description, '')), ''),
      'Pelunasan pinjaman antar proyek: ' || COALESCE(v_to_name, '') || ' -> ' || COALESCE(v_from_name, '')
    );
    v_lines := jsonb_build_array(
      jsonb_build_object(
        'account_id', v_hutang_lain_id,
        'debit', p_amount,
        'credit', 0,
        'project_id', p_to_project_id
      ),
      jsonb_build_object(
        'account_id', v_to_kas_id,
        'debit', 0,
        'credit', p_amount,
        'project_id', p_to_project_id
      ),
      jsonb_build_object(
        'account_id', v_from_kas_id,
        'debit', p_amount,
        'credit', 0,
        'project_id', p_from_project_id
      ),
      jsonb_build_object(
        'account_id', v_piutang_id,
        'debit', 0,
        'credit', p_amount,
        'project_id', p_from_project_id
      )
    );
  ELSE
    v_ref_type := 'interproject_loan';
    v_desc := COALESCE(
      NULLIF(btrim(COALESCE(p_description, '')), ''),
      'Pinjaman antar proyek: ' || COALESCE(v_from_name, '') || ' -> ' || COALESCE(v_to_name, '')
    );
    v_lines := jsonb_build_array(
      jsonb_build_object(
        'account_id', v_piutang_id,
        'debit', p_amount,
        'credit', 0,
        'project_id', p_from_project_id
      ),
      jsonb_build_object(
        'account_id', v_from_kas_id,
        'debit', 0,
        'credit', p_amount,
        'project_id', p_from_project_id
      ),
      jsonb_build_object(
        'account_id', v_to_kas_id,
        'debit', p_amount,
        'credit', 0,
        'project_id', p_to_project_id
      ),
      jsonb_build_object(
        'account_id', v_hutang_lain_id,
        'debit', 0,
        'credit', p_amount,
        'project_id', p_to_project_id
      )
    );
  END IF;

  v_journal_id := public.planner_post_journal(
    p_org_id,
    COALESCE(p_entry_date, CURRENT_DATE),
    v_desc,
    v_ref_type,
    NULL,
    v_lines,
    v_actor
  );

  RETURN v_journal_id;
END;
$$;

REVOKE ALL ON FUNCTION public.planner_post_interproject_loan(uuid, uuid, uuid, bigint, date, text, boolean, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.planner_post_interproject_loan(uuid, uuid, uuid, bigint, date, text, boolean, uuid) TO authenticated;
