-- Fase F0 (Kebenaran Akuntansi): Migrasi SQL Lokal (BLOCKED remote — jangan push ke produksi)
-- Memperbaiki T1 (dividen proyek tidak masuk total_spent & backfill), serta menyiapkan kolom soft-delete (T4).

-- 1. Tambah tipe referensi 'dividend' pada jurnal
ALTER TABLE planner_journal_entries DROP CONSTRAINT IF EXISTS planner_journal_entries_reference_type_check;
ALTER TABLE planner_journal_entries ADD CONSTRAINT planner_journal_entries_reference_type_check
  CHECK (reference_type IS NULL OR reference_type IN (
    'project_expense', 'project_income', 'opex', 'transfer', 'manual',
    'amortize', 'depreciation', 'opening',
    'project_close', 'payroll_disbursement', 'bon_disbursement', 'payroll_accrual', 'period_close',
    'reversal', 'payable_payment', 'receivable_receipt', 'dividend'
  ));

-- 2. Kolom soft-delete dan status cancelled untuk baris sumber
ALTER TABLE planner_cost_realizations
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE planner_cost_realizations DROP CONSTRAINT IF EXISTS planner_cost_realizations_status_check;
ALTER TABLE planner_cost_realizations ADD CONSTRAINT planner_cost_realizations_status_check
  CHECK (status IS NULL OR status IN ('recorded', 'verified', 'disputed', 'cancelled', 'dividend'));

ALTER TABLE planner_project_incomes
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- 3. Trigger total_spent mengecualikan status 'dividend' / 'cancelled' dan baris soft-deleted
CREATE OR REPLACE FUNCTION public.planner_fill_derived_project_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_rap boolean;
  v_has_work boolean;
  v_progress numeric;
BEGIN
  SELECT EXISTS (SELECT 1 FROM planner_rap_items r WHERE r.project_id = NEW.id) INTO v_has_rap;
  IF v_has_rap THEN
    SELECT COALESCE(SUM(r.quantity * r.unit_price), 0)
      INTO NEW.total_budget
    FROM planner_rap_items r
    WHERE r.project_id = NEW.id;
  END IF;

  SELECT COALESCE(SUM(c.total_amount), 0)
    INTO NEW.total_spent
  FROM planner_cost_realizations c
  WHERE c.project_id = NEW.id
    AND COALESCE(c.status, 'recorded') NOT IN ('dividend', 'cancelled')
    AND c.deleted_at IS NULL;

  SELECT COALESCE(SUM(i.amount), 0)
    INTO NEW.total_received
  FROM planner_project_incomes i
  WHERE i.project_id = NEW.id
    AND i.status = 'received'
    AND i.deleted_at IS NULL;

  SELECT EXISTS (SELECT 1 FROM planner_work_items w WHERE w.project_id = NEW.id) INTO v_has_work;
  IF v_has_work THEN
    SELECT ROUND(
      SUM((CASE WHEN COALESCE(w.weight, 0) > 0 THEN w.weight ELSE 1 END) * COALESCE(w.progress_pct, 0))
      / NULLIF(SUM(CASE WHEN COALESCE(w.weight, 0) > 0 THEN w.weight ELSE 1 END), 0)
    , 2)
      INTO v_progress
    FROM planner_work_items w
    WHERE w.project_id = NEW.id;
    NEW.progress_pct := COALESCE(v_progress, 0);
  ELSIF TG_OP = 'INSERT' THEN
    NEW.progress_pct := 0;
  ELSE
    NEW.progress_pct := OLD.progress_pct;
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Backfill biaya proyek mengecualikan status 'dividend' / 'cancelled' dan soft-deleted
CREATE OR REPLACE FUNCTION public.planner_backfill_cost_journals()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_org uuid;
  v_kas uuid;
  v_laba uuid;
  v_journal uuid;
  v_amount bigint;
  v_count integer := 0;
BEGIN
  FOR r IN
    SELECT c.id, c.project_id, c.date, c.description, c.total_amount, p.org_id, p.name AS project_name
    FROM planner_cost_realizations c
    JOIN planner_projects p ON p.id = c.project_id
    WHERE c.journal_entry_id IS NULL
      AND COALESCE(c.total_amount, 0) > 0
      AND COALESCE(c.status, 'recorded') NOT IN ('dividend', 'cancelled')
      AND c.deleted_at IS NULL
  LOOP
    v_amount := ROUND(r.total_amount)::bigint;
    IF v_amount <= 0 THEN CONTINUE; END IF;
    v_org := r.org_id;

    SELECT id INTO v_laba FROM planner_finance_accounts
    WHERE org_id = v_org AND type = 'laba' AND is_system = true
    LIMIT 1;
    IF v_laba IS NULL THEN CONTINUE; END IF;

    SELECT id INTO v_kas FROM planner_finance_accounts
    WHERE org_id = v_org AND type = 'kas' AND project_id = r.project_id
    LIMIT 1;
    IF v_kas IS NULL THEN
      INSERT INTO planner_finance_accounts (org_id, type, category, name, project_id, is_system)
      VALUES (v_org, 'kas', 'aktiva', 'Kas ' || r.project_name, r.project_id, false)
      RETURNING id INTO v_kas;
    END IF;

    IF EXISTS (
      SELECT 1 FROM planner_journal_entries
      WHERE org_id = v_org AND reference_type = 'project_expense' AND reference_id = r.id
    ) THEN
      UPDATE planner_cost_realizations
      SET journal_entry_id = (
        SELECT id FROM planner_journal_entries
        WHERE org_id = v_org AND reference_type = 'project_expense' AND reference_id = r.id
        LIMIT 1
      ), synced_at = now()
      WHERE id = r.id AND journal_entry_id IS NULL;
      CONTINUE;
    END IF;

    INSERT INTO planner_journal_entries (
      org_id, entry_date, description, reference_type, reference_id, total_amount
    ) VALUES (
      v_org, r.date, 'Biaya: ' || COALESCE(r.description, ''), 'project_expense', r.id, v_amount
    ) RETURNING id INTO v_journal;

    INSERT INTO planner_journal_lines (journal_id, account_id, debit, credit) VALUES
      (v_journal, v_laba, v_amount, 0),
      (v_journal, v_kas, 0, v_amount);

    UPDATE planner_cost_realizations
    SET journal_entry_id = v_journal, synced_at = now()
    WHERE id = r.id;

    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- 5. Perbarui planner_post_journal: dedup hanya untuk jurnal yang belum di-reverse
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
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_org_member(p_org_id, 'manager') THEN
    RAISE EXCEPTION 'bukan_pengelola' USING ERRCODE = '42501';
  END IF;
  IF p_lines IS NULL OR jsonb_typeof(p_lines) <> 'array' OR jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION 'jurnal_kosong';
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
    IF NOT EXISTS (
      SELECT 1 FROM planner_finance_accounts
      WHERE id = v_account AND org_id = p_org_id
    ) THEN
      RAISE EXCEPTION 'akun_bukan_org';
    END IF;

    INSERT INTO planner_journal_lines (journal_id, account_id, debit, credit, notes)
    VALUES (v_id, v_account, v_debit, v_credit, NULLIF(btrim(COALESCE(v_line->>'notes', '')), ''))
    RETURNING id INTO v_line_id;

    v_party := NULLIF(v_line->>'party_id', '')::uuid;
    v_project := NULLIF(v_line->>'project_id', '')::uuid;
    IF v_party IS NOT NULL AND v_project IS NOT NULL THEN
      SELECT type INTO v_type FROM planner_finance_accounts WHERE id = v_account;
      v_signed := NULL;
      IF v_type LIKE 'hutang%' AND v_credit > 0 THEN v_signed := v_credit; END IF;
      IF v_type LIKE 'hutang%' AND v_debit > 0 THEN v_signed := -v_debit; END IF;
      IF v_type = 'piutang' AND v_debit > 0 THEN v_signed := v_debit; END IF;
      IF v_type = 'piutang' AND v_credit > 0 THEN v_signed := -v_credit; END IF;
      IF v_signed IS NOT NULL THEN
        INSERT INTO planner_journal_allocations (org_id, journal_line_id, party_id, project_id, amount_rupiah)
        VALUES (p_org_id, v_line_id, v_party, v_project, v_signed);
      END IF;
    END IF;
  END LOOP;

  RETURN v_id;
END;
$$;

-- 6. RPC transaksi atomik: Pemasukan proyek + jurnal dalam satu transaksi
CREATE OR REPLACE FUNCTION public.planner_create_project_income_atomic(
  p_project_id uuid,
  p_date date,
  p_amount bigint,
  p_category text,
  p_description text,
  p_payment_method text DEFAULT NULL,
  p_client_ref text DEFAULT NULL,
  p_invoice_ref text DEFAULT NULL,
  p_status text DEFAULT 'received',
  p_recorded_by uuid DEFAULT NULL
)
RETURNS planner_project_incomes
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_proj_name text;
  v_kas_id uuid;
  v_laba_id uuid;
  v_journal_id uuid;
  v_row planner_project_incomes;
  v_actor uuid := COALESCE(p_recorded_by, auth.uid());
BEGIN
  SELECT org_id, name INTO v_org_id, v_proj_name
  FROM planner_projects WHERE id = p_project_id;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'proyek_tidak_ditemukan';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'nominal_tidak_valid';
  END IF;

  INSERT INTO planner_project_incomes (
    project_id, date, amount, category, description, payment_method, client_ref, invoice_ref, status, recorded_by
  ) VALUES (
    p_project_id, COALESCE(p_date, CURRENT_DATE), p_amount, COALESCE(p_category, 'other'),
    COALESCE(p_description, ''), p_payment_method, p_client_ref, p_invoice_ref,
    COALESCE(p_status, 'received'), v_actor
  ) RETURNING * INTO v_row;

  IF COALESCE(p_status, 'received') = 'received' THEN
    PERFORM public.seed_default_chart_of_accounts(v_org_id);
    SELECT id INTO v_laba_id FROM planner_finance_accounts
      WHERE org_id = v_org_id AND type = 'laba' AND is_system = true LIMIT 1;
    SELECT id INTO v_kas_id FROM planner_finance_accounts
      WHERE org_id = v_org_id AND type = 'kas' AND project_id = p_project_id AND is_active = true LIMIT 1;
    IF v_kas_id IS NULL THEN
      INSERT INTO planner_finance_accounts (org_id, type, category, name, project_id, is_system)
      VALUES (v_org_id, 'kas', 'aktiva', 'Kas ' || v_proj_name, p_project_id, false)
      RETURNING id INTO v_kas_id;
    END IF;
    IF v_laba_id IS NULL THEN
      RAISE EXCEPTION 'akun_laba_tidak_ditemukan';
    END IF;

    v_journal_id := public.planner_post_journal(
      v_org_id,
      COALESCE(p_date, CURRENT_DATE),
      'Pemasukan proyek: ' || COALESCE(NULLIF(p_description, ''), COALESCE(p_category, 'other')),
      'project_income',
      v_row.id,
      jsonb_build_array(
        jsonb_build_object('account_id', v_kas_id, 'debit', p_amount, 'credit', 0, 'project_id', p_project_id),
        jsonb_build_object('account_id', v_laba_id, 'debit', 0, 'credit', p_amount, 'project_id', p_project_id)
      ),
      v_actor
    );

    UPDATE planner_project_incomes
    SET journal_entry_id = v_journal_id, synced_at = now()
    WHERE id = v_row.id
    RETURNING * INTO v_row;
  END IF;

  RETURN v_row;
END;
$$;

-- 7. RPC transaksi atomik: Realisasi biaya proyek + jurnal dalam satu transaksi
CREATE OR REPLACE FUNCTION public.planner_create_cost_realization_atomic(
  p_project_id uuid,
  p_rap_item_id uuid DEFAULT NULL,
  p_date date DEFAULT CURRENT_DATE,
  p_description text DEFAULT '',
  p_quantity numeric DEFAULT NULL,
  p_unit_price numeric DEFAULT NULL,
  p_total_amount bigint DEFAULT 0,
  p_payment_method text DEFAULT NULL,
  p_supplier text DEFAULT NULL,
  p_status text DEFAULT 'recorded',
  p_recorded_by uuid DEFAULT NULL
)
RETURNS planner_cost_realizations
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_proj_name text;
  v_kas_id uuid;
  v_laba_id uuid;
  v_journal_id uuid;
  v_row planner_cost_realizations;
  v_actor uuid := COALESCE(p_recorded_by, auth.uid());
BEGIN
  SELECT org_id, name INTO v_org_id, v_proj_name
  FROM planner_projects WHERE id = p_project_id;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'proyek_tidak_ditemukan';
  END IF;

  INSERT INTO planner_cost_realizations (
    project_id, rap_item_id, date, description, quantity, unit_price, total_amount,
    payment_method, supplier, status, recorded_by
  ) VALUES (
    p_project_id, p_rap_item_id, COALESCE(p_date, CURRENT_DATE), COALESCE(p_description, ''),
    p_quantity, p_unit_price, COALESCE(p_total_amount, 0),
    p_payment_method, p_supplier, COALESCE(p_status, 'recorded'), v_actor
  ) RETURNING * INTO v_row;

  IF COALESCE(p_total_amount, 0) > 0 THEN
    PERFORM public.seed_default_chart_of_accounts(v_org_id);
    SELECT id INTO v_laba_id FROM planner_finance_accounts
      WHERE org_id = v_org_id AND type = 'laba' AND is_system = true LIMIT 1;
    SELECT id INTO v_kas_id FROM planner_finance_accounts
      WHERE org_id = v_org_id AND type = 'kas' AND project_id = p_project_id AND is_active = true LIMIT 1;
    IF v_kas_id IS NULL THEN
      INSERT INTO planner_finance_accounts (org_id, type, category, name, project_id, is_system)
      VALUES (v_org_id, 'kas', 'aktiva', 'Kas ' || v_proj_name, p_project_id, false)
      RETURNING id INTO v_kas_id;
    END IF;
    IF v_laba_id IS NULL THEN
      RAISE EXCEPTION 'akun_laba_tidak_ditemukan';
    END IF;

    v_journal_id := public.planner_post_journal(
      v_org_id,
      COALESCE(p_date, CURRENT_DATE),
      'Biaya proyek: ' || COALESCE(p_description, ''),
      'project_expense',
      v_row.id,
      jsonb_build_array(
        jsonb_build_object('account_id', v_laba_id, 'debit', p_total_amount, 'credit', 0, 'project_id', p_project_id),
        jsonb_build_object('account_id', v_kas_id, 'debit', 0, 'credit', p_total_amount, 'project_id', p_project_id)
      ),
      v_actor
    );

    UPDATE planner_cost_realizations
    SET journal_entry_id = v_journal_id, synced_at = now()
    WHERE id = v_row.id
    RETURNING * INTO v_row;
  END IF;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.planner_create_project_income_atomic(uuid, date, bigint, text, text, text, text, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.planner_create_project_income_atomic(uuid, date, bigint, text, text, text, text, text, text, uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.planner_create_cost_realization_atomic(uuid, uuid, date, text, numeric, numeric, bigint, text, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.planner_create_cost_realization_atomic(uuid, uuid, date, text, numeric, numeric, bigint, text, text, text, uuid) TO authenticated;

