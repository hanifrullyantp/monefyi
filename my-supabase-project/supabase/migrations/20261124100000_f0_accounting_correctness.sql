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

