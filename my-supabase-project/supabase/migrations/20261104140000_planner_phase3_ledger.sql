-- Fase 3: jurnal v2 menjadi buku tunggal. Pihak, dompet, dan alokasi
-- menempel pada akun dan baris yang sudah ada. Pembatalan:
-- supabase/rollbacks/20261104140000_planner_phase3_ledger.sql

-- Jenis referensi tambahan. Daftar lama dipertahankan.
ALTER TABLE planner_journal_entries DROP CONSTRAINT IF EXISTS planner_journal_entries_reference_type_check;
ALTER TABLE planner_journal_entries ADD CONSTRAINT planner_journal_entries_reference_type_check
  CHECK (reference_type IS NULL OR reference_type IN (
    'project_expense', 'project_income', 'opex', 'transfer', 'manual',
    'amortize', 'depreciation', 'opening',
    'project_close', 'payroll_disbursement', 'bon_disbursement', 'payroll_accrual', 'period_close',
    'reversal', 'payable_payment', 'receivable_receipt'
  ));

ALTER TABLE planner_journal_lines DROP CONSTRAINT IF EXISTS planner_journal_lines_debit_xor_credit;

ALTER TABLE planner_journal_lines
  ALTER COLUMN debit TYPE bigint USING ROUND(debit)::bigint,
  ALTER COLUMN credit TYPE bigint USING ROUND(credit)::bigint;

ALTER TABLE planner_journal_lines
  ADD CONSTRAINT planner_journal_lines_debit_xor_credit CHECK (NOT (debit > 0 AND credit > 0));

ALTER TABLE planner_journal_entries
  ALTER COLUMN total_amount TYPE bigint USING ROUND(total_amount)::bigint;

ALTER TABLE planner_finance_accounts
  ALTER COLUMN current_balance TYPE bigint USING ROUND(current_balance)::bigint;

CREATE TABLE IF NOT EXISTS planner_parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES planner_organizations(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  normalized_name text NOT NULL,
  kind text NOT NULL DEFAULT 'company' CHECK (kind IN ('person', 'company')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, normalized_name)
);

CREATE TABLE IF NOT EXISTS planner_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES planner_organizations(id) ON DELETE CASCADE,
  account_id uuid NOT NULL UNIQUE REFERENCES planner_finance_accounts(id) ON DELETE CASCADE,
  project_id uuid REFERENCES planner_projects(id) ON DELETE SET NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS planner_journal_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES planner_organizations(id) ON DELETE CASCADE,
  journal_line_id uuid NOT NULL REFERENCES planner_journal_lines(id) ON DELETE RESTRICT,
  party_id uuid NOT NULL REFERENCES planner_parties(id),
  project_id uuid NOT NULL REFERENCES planner_projects(id),
  amount_rupiah bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_party_debt ON planner_journal_allocations(party_id, project_id);
CREATE INDEX IF NOT EXISTS idx_wallets_project ON planner_wallets(project_id);

ALTER TABLE planner_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_journal_allocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS planner_parties_read ON planner_parties;
DROP POLICY IF EXISTS planner_parties_write ON planner_parties;
CREATE POLICY planner_parties_read ON planner_parties
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, 'worker'));
CREATE POLICY planner_parties_write ON planner_parties
  FOR ALL TO authenticated
  USING (public.is_org_member(org_id, 'manager'))
  WITH CHECK (public.is_org_member(org_id, 'manager'));

DROP POLICY IF EXISTS planner_wallets_read ON planner_wallets;
DROP POLICY IF EXISTS planner_wallets_write ON planner_wallets;
CREATE POLICY planner_wallets_read ON planner_wallets
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, 'worker'));
CREATE POLICY planner_wallets_write ON planner_wallets
  FOR ALL TO authenticated
  USING (public.is_org_member(org_id, 'manager'))
  WITH CHECK (public.is_org_member(org_id, 'manager'));

DROP POLICY IF EXISTS planner_allocations_read ON planner_journal_allocations;
DROP POLICY IF EXISTS planner_allocations_write ON planner_journal_allocations;
CREATE POLICY planner_allocations_read ON planner_journal_allocations
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, 'worker'));
CREATE POLICY planner_allocations_insert ON planner_journal_allocations
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id, 'manager'));

-- Jurnal: sisipkan saja. Perubahan dan hapus ditolak trigger.
DROP POLICY IF EXISTS planner_journal_entries_write ON planner_journal_entries;
DROP POLICY IF EXISTS planner_journal_entries_insert ON planner_journal_entries;
CREATE POLICY planner_journal_entries_insert ON planner_journal_entries
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id, 'manager'));

DROP POLICY IF EXISTS planner_journal_lines_write ON planner_journal_lines;
DROP POLICY IF EXISTS planner_journal_lines_insert ON planner_journal_lines;
CREATE POLICY planner_journal_lines_insert ON planner_journal_lines
  FOR INSERT TO authenticated
  WITH CHECK (
    journal_id IN (
      SELECT e.id FROM planner_journal_entries e
      WHERE public.is_org_member(e.org_id, 'manager')
    )
  );

CREATE OR REPLACE FUNCTION public.planner_reject_journal_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'jurnal_tidak_boleh_diubah'
    USING HINT = 'Buat jurnal pembalik. Baris yang sudah tercatat tidak diubah dan tidak dihapus.';
END;
$$;

DROP TRIGGER IF EXISTS planner_journal_entries_no_mutation ON planner_journal_entries;
CREATE TRIGGER planner_journal_entries_no_mutation
  BEFORE UPDATE OR DELETE ON planner_journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.planner_reject_journal_mutation();

DROP TRIGGER IF EXISTS planner_journal_lines_no_mutation ON planner_journal_lines;
CREATE TRIGGER planner_journal_lines_no_mutation
  BEFORE UPDATE OR DELETE ON planner_journal_lines
  FOR EACH ROW EXECUTE FUNCTION public.planner_reject_journal_mutation();

CREATE OR REPLACE FUNCTION public.planner_reject_balance_write()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.current_balance IS DISTINCT FROM OLD.current_balance
     AND current_setting('planner.ledger_write', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'saldo_hanya_dari_jurnal'
      USING HINT = 'Saldo akun mengikuti baris jurnal.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS planner_accounts_balance_guard ON planner_finance_accounts;
CREATE TRIGGER planner_accounts_balance_guard
  BEFORE UPDATE ON planner_finance_accounts
  FOR EACH ROW EXECUTE FUNCTION public.planner_reject_balance_write();

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
  IF v_category = 'aktiva' THEN
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

DROP TRIGGER IF EXISTS planner_lines_apply_balance ON planner_journal_lines;
CREATE TRIGGER planner_lines_apply_balance
  AFTER INSERT ON planner_journal_lines
  FOR EACH ROW EXECUTE FUNCTION public.planner_apply_line_balance();

-- Selaraskan saldo tersimpan dengan jumlah baris yang sudah ada.
DO $$
BEGIN
  PERFORM set_config('planner.ledger_write', 'on', true);
  UPDATE planner_finance_accounts a
  SET current_balance = COALESCE((
    SELECT SUM(
      CASE
        WHEN a.category = 'aktiva' THEN l.debit - l.credit
        ELSE l.credit - l.debit
      END
    )
    FROM planner_journal_lines l
    WHERE l.account_id = a.id
  ), 0);
END $$;

CREATE OR REPLACE FUNCTION public.planner_ensure_wallet()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.type = 'kas' THEN
    INSERT INTO planner_wallets (org_id, account_id, project_id, name)
    VALUES (NEW.org_id, NEW.id, NEW.project_id, NEW.name)
    ON CONFLICT (account_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS planner_accounts_ensure_wallet ON planner_finance_accounts;
CREATE TRIGGER planner_accounts_ensure_wallet
  AFTER INSERT ON planner_finance_accounts
  FOR EACH ROW EXECUTE FUNCTION public.planner_ensure_wallet();

INSERT INTO planner_wallets (org_id, account_id, project_id, name)
SELECT a.org_id, a.id, a.project_id, a.name
FROM planner_finance_accounts a
WHERE a.type = 'kas'
ON CONFLICT (account_id) DO NOTHING;

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
    SELECT id INTO v_existing
    FROM planner_journal_entries
    WHERE org_id = p_org_id
      AND reference_type = p_reference_type
      AND reference_id = p_reference_id
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

  v_sum_debit := 0;
  v_sum_credit := 0;

  FOR v_line IN SELECT value FROM jsonb_array_elements(p_lines)
  LOOP
    v_account := (v_line->>'account_id')::uuid;
    v_debit := ROUND(COALESCE((v_line->>'debit')::numeric, 0))::bigint;
    v_credit := ROUND(COALESCE((v_line->>'credit')::numeric, 0))::bigint;
    IF v_debit < 0 OR v_credit < 0 OR (v_debit > 0 AND v_credit > 0) OR (v_debit = 0 AND v_credit = 0) THEN
      RAISE EXCEPTION 'baris_jurnal_tidak_valid';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM planner_finance_accounts
      WHERE id = v_account AND org_id = p_org_id
    ) THEN
      RAISE EXCEPTION 'akun_bukan_org';
    END IF;

    INSERT INTO planner_journal_lines (journal_id, account_id, debit, credit, notes)
    VALUES (v_id, v_account, v_debit, v_credit, NULLIF(btrim(COALESCE(v_line->>'notes', '')), ''))
    RETURNING id INTO v_line_id;

    v_sum_debit := v_sum_debit + v_debit;
    v_sum_credit := v_sum_credit + v_credit;

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

REVOKE ALL ON FUNCTION public.planner_post_journal(uuid, date, text, text, uuid, jsonb, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.planner_post_journal(uuid, date, text, text, uuid, jsonb, uuid) TO authenticated;

-- Amortisasi tidak lagi menulis saldo sendiri. Trigger baris yang menghitung.
CREATE OR REPLACE FUNCTION public.planner_finance_daily_amortize()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_days int;
  v_daily numeric;
  v_amt numeric;
  v_prabayar uuid;
  v_laba uuid;
  v_journal uuid;
  v_count int := 0;
  v_today date := CURRENT_DATE;
BEGIN
  FOR r IN
    SELECT p.*
    FROM planner_prepaid_items p
    WHERE p.remaining_value > 0
      AND p.start_date <= v_today
      AND p.end_date >= v_today
      AND (p.last_amortized_date IS NULL OR p.last_amortized_date < v_today)
  LOOP
    v_days := GREATEST(1, (r.end_date - GREATEST(r.start_date, COALESCE(r.last_amortized_date, r.start_date - 1))));
    v_daily := ROUND(r.remaining_value / v_days, 2);
    v_amt := LEAST(v_daily, r.remaining_value);
    IF v_amt <= 0 THEN CONTINUE; END IF;

    SELECT id INTO v_prabayar FROM planner_finance_accounts
      WHERE org_id = r.org_id AND type = 'prabayar' AND is_system = true LIMIT 1;
    SELECT id INTO v_laba FROM planner_finance_accounts
      WHERE org_id = r.org_id AND type = 'laba' AND is_system = true LIMIT 1;
    IF v_prabayar IS NULL OR v_laba IS NULL THEN CONTINUE; END IF;

    INSERT INTO planner_journal_entries (org_id, entry_date, description, reference_type, reference_id, total_amount)
    VALUES (r.org_id, v_today, 'Amortisasi: ' || r.name, 'amortize', r.id, ROUND(v_amt)::bigint)
    RETURNING id INTO v_journal;

    INSERT INTO planner_journal_lines (journal_id, account_id, debit, credit) VALUES
      (v_journal, v_laba, ROUND(v_amt)::bigint, 0),
      (v_journal, v_prabayar, 0, ROUND(v_amt)::bigint);

    UPDATE planner_prepaid_items
    SET remaining_value = GREATEST(0, remaining_value - v_amt), last_amortized_date = v_today
    WHERE id = r.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('amortized', v_count, 'date', v_today);
END;
$$;

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

REVOKE ALL ON FUNCTION public.planner_backfill_cost_journals() FROM PUBLIC;

SELECT public.planner_backfill_cost_journals();

CREATE OR REPLACE VIEW public.planner_v_party_debt
WITH (security_invoker = true) AS
SELECT party_id, project_id, SUM(amount_rupiah)::bigint AS debt_rupiah
FROM planner_journal_allocations
GROUP BY party_id, project_id;

CREATE OR REPLACE VIEW public.planner_v_project_cash
WITH (security_invoker = true) AS
SELECT w.org_id, w.project_id, w.id AS wallet_id, w.account_id, a.current_balance AS cash_rupiah
FROM planner_wallets w
JOIN planner_finance_accounts a ON a.id = w.account_id
WHERE w.project_id IS NOT NULL;

GRANT SELECT ON public.planner_v_party_debt TO authenticated;
GRANT SELECT ON public.planner_v_project_cash TO authenticated;
