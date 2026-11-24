-- Fase G0-2: Migrasi RPC Atomik & Backfill ke Akun F1 (BLOCKED remote — jangan push ke produksi)
-- Memindahkan planner_create_project_income_atomic, planner_create_cost_realization_atomic,
-- dan planner_backfill_cost_journals dari akun penampung F0 ke akun buku besar F1
-- (uang_muka_klien, piutang_retensi, piutang, pendapatan_proyek, hpp_*, hutang_dagang, kas)
-- serta menjaga paritas 100% dengan packages/domain/src/journal.ts.

-- 1. Perluas CHECK constraint status agar mendukung akrual/tagihan pada RPC F1
ALTER TABLE planner_project_incomes DROP CONSTRAINT IF EXISTS planner_project_incomes_status_check;
ALTER TABLE planner_project_incomes ADD CONSTRAINT planner_project_incomes_status_check
  CHECK (status IN ('received', 'pending', 'invoiced', 'accrued', 'cancelled'));

ALTER TABLE planner_cost_realizations DROP CONSTRAINT IF EXISTS planner_cost_realizations_status_check;
ALTER TABLE planner_cost_realizations ADD CONSTRAINT planner_cost_realizations_status_check
  CHECK (status IS NULL OR status IN ('recorded', 'verified', 'disputed', 'accrued', 'unpaid', 'cancelled', 'dividend'));

-- 2. Helper pemetaan tipe RAP -> tipe akun HPP F1 (identik dengan hppRoleForRapType di journal.ts)
CREATE OR REPLACE FUNCTION public.planner_hpp_account_type_for_rap(p_rap_type text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE lower(btrim(COALESCE(p_rap_type, '')))
    WHEN 'material' THEN 'hpp_material'
    WHEN 'labor' THEN 'hpp_labor'
    WHEN 'tenaga' THEN 'hpp_labor'
    WHEN 'tukang' THEN 'hpp_labor'
    WHEN 'equipment' THEN 'hpp_equipment'
    WHEN 'alat' THEN 'hpp_equipment'
    WHEN 'overhead' THEN 'hpp_overhead'
    WHEN 'other' THEN 'hpp_other'
    WHEN 'lain' THEN 'hpp_other'
    WHEN 'lainnya' THEN 'hpp_other'
    ELSE 'hpp_uncategorized'
  END;
$$;

REVOKE ALL ON FUNCTION public.planner_hpp_account_type_for_rap(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.planner_hpp_account_type_for_rap(text) TO authenticated;

-- 3. Perbarui planner_create_project_income_atomic untuk akun F1 (+ p_party_id DEFAULT NULL)
DROP FUNCTION IF EXISTS public.planner_create_project_income_atomic(uuid, date, bigint, text, text, text, text, text, text, uuid);

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
  p_recorded_by uuid DEFAULT NULL,
  p_party_id uuid DEFAULT NULL
)
RETURNS planner_project_incomes
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_proj_name text;
  v_category text;
  v_status text;
  v_entry_date date;
  v_debit_type text := NULL;
  v_credit_type text := NULL;
  v_debit_id uuid;
  v_credit_id uuid;
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

  v_category := COALESCE(NULLIF(lower(btrim(p_category)), ''), 'other');
  v_status := COALESCE(NULLIF(lower(btrim(p_status)), ''), 'received');
  v_entry_date := COALESCE(p_date, CURRENT_DATE);

  INSERT INTO planner_project_incomes (
    project_id, date, amount, category, description, payment_method, client_ref, invoice_ref, status, recorded_by
  ) VALUES (
    p_project_id, v_entry_date, p_amount, v_category,
    COALESCE(p_description, ''), p_payment_method, p_client_ref, p_invoice_ref,
    v_status, v_actor
  ) RETURNING * INTO v_row;

  IF v_category = 'dp' AND v_status = 'received' THEN
    v_debit_type := 'kas';
    v_credit_type := 'uang_muka_klien';
  ELSIF v_category = 'retensi' AND v_status IN ('pending', 'invoiced', 'accrued') THEN
    v_debit_type := 'piutang_retensi';
    v_credit_type := 'pendapatan_proyek';
  ELSIF v_category = 'retensi' AND v_status = 'received' THEN
    v_debit_type := 'kas';
    v_credit_type := 'piutang_retensi';
  ELSIF v_category IN ('termin', 'pelunasan', 'other') AND v_status = 'received' THEN
    v_debit_type := 'kas';
    v_credit_type := 'pendapatan_proyek';
  ELSIF v_category IN ('termin', 'pelunasan', 'other') AND v_status IN ('invoiced', 'accrued') THEN
    v_debit_type := 'piutang';
    v_credit_type := 'pendapatan_proyek';
  END IF;

  IF v_debit_type IS NOT NULL AND v_credit_type IS NOT NULL THEN
    PERFORM public.seed_default_chart_of_accounts(v_org_id);

    IF v_debit_type = 'kas' THEN
      SELECT id INTO v_debit_id
      FROM planner_finance_accounts
      WHERE org_id = v_org_id AND type = 'kas' AND project_id = p_project_id AND is_active = true
      LIMIT 1;
      IF v_debit_id IS NULL THEN
        INSERT INTO planner_finance_accounts (org_id, type, category, name, project_id, is_system)
        VALUES (v_org_id, 'kas', 'aktiva', 'Kas ' || v_proj_name, p_project_id, false)
        RETURNING id INTO v_debit_id;
      END IF;
    ELSE
      SELECT id INTO v_debit_id
      FROM planner_finance_accounts
      WHERE org_id = v_org_id AND type = v_debit_type AND is_system = true AND project_id IS NULL
      LIMIT 1;
    END IF;

    IF v_debit_id IS NULL THEN
      RAISE EXCEPTION 'akun_debit_f1_tidak_ditemukan: %', v_debit_type;
    END IF;

    SELECT id INTO v_credit_id
    FROM planner_finance_accounts
    WHERE org_id = v_org_id AND type = v_credit_type AND is_system = true AND project_id IS NULL
    LIMIT 1;

    IF v_credit_id IS NULL THEN
      RAISE EXCEPTION 'akun_kredit_f1_tidak_ditemukan: %', v_credit_type;
    END IF;

    v_journal_id := public.planner_post_journal(
      v_org_id,
      v_entry_date,
      'Pemasukan proyek: ' || COALESCE(NULLIF(p_description, ''), v_category),
      'project_income',
      v_row.id,
      jsonb_build_array(
        jsonb_build_object(
          'account_id', v_debit_id,
          'debit', p_amount,
          'credit', 0,
          'project_id', p_project_id,
          'party_id', p_party_id
        ),
        jsonb_build_object(
          'account_id', v_credit_id,
          'debit', 0,
          'credit', p_amount,
          'project_id', p_project_id,
          'party_id', p_party_id
        )
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

REVOKE ALL ON FUNCTION public.planner_create_project_income_atomic(uuid, date, bigint, text, text, text, text, text, text, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.planner_create_project_income_atomic(uuid, date, bigint, text, text, text, text, text, text, uuid, uuid) TO authenticated;

-- 4. Perbarui planner_create_cost_realization_atomic untuk akun HPP F1 & akrual hutang_dagang (+ p_party_id DEFAULT NULL)
DROP FUNCTION IF EXISTS public.planner_create_cost_realization_atomic(uuid, uuid, date, text, numeric, numeric, bigint, text, text, text, uuid);

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
  p_recorded_by uuid DEFAULT NULL,
  p_party_id uuid DEFAULT NULL
)
RETURNS planner_cost_realizations
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_proj_name text;
  v_status text;
  v_entry_date date;
  v_amount bigint;
  v_rap_type text := NULL;
  v_hpp_type text;
  v_needs_review boolean;
  v_is_accrual boolean;
  v_hpp_id uuid;
  v_credit_id uuid;
  v_journal_id uuid;
  v_row planner_cost_realizations;
  v_actor uuid := COALESCE(p_recorded_by, auth.uid());
BEGIN
  SELECT org_id, name INTO v_org_id, v_proj_name
  FROM planner_projects WHERE id = p_project_id;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'proyek_tidak_ditemukan';
  END IF;

  v_status := COALESCE(NULLIF(lower(btrim(p_status)), ''), 'recorded');
  v_entry_date := COALESCE(p_date, CURRENT_DATE);
  v_amount := COALESCE(p_total_amount, 0);

  INSERT INTO planner_cost_realizations (
    project_id, rap_item_id, date, description, quantity, unit_price, total_amount,
    payment_method, supplier, status, recorded_by
  ) VALUES (
    p_project_id, p_rap_item_id, v_entry_date, COALESCE(p_description, ''),
    p_quantity, p_unit_price, v_amount,
    p_payment_method, p_supplier, v_status, v_actor
  ) RETURNING * INTO v_row;

  IF v_amount > 0 AND v_status NOT IN ('dividend', 'cancelled') THEN
    IF p_rap_item_id IS NOT NULL THEN
      SELECT r.type INTO v_rap_type
      FROM planner_rap_items r
      WHERE r.id = p_rap_item_id
      LIMIT 1;
    END IF;

    v_hpp_type := public.planner_hpp_account_type_for_rap(v_rap_type);
    v_needs_review := (v_hpp_type = 'hpp_uncategorized');

    v_is_accrual := (
      lower(btrim(COALESCE(p_payment_method, ''))) IN ('credit', 'hutang', 'tempo')
      OR lower(btrim(COALESCE(p_status, ''))) IN ('accrued', 'unpaid')
    );

    PERFORM public.seed_default_chart_of_accounts(v_org_id);

    SELECT id INTO v_hpp_id
    FROM planner_finance_accounts
    WHERE org_id = v_org_id AND type = v_hpp_type AND is_system = true AND project_id IS NULL
    LIMIT 1;
    IF v_hpp_id IS NULL THEN
      RAISE EXCEPTION 'akun_hpp_f1_tidak_ditemukan: %', v_hpp_type;
    END IF;

    IF v_is_accrual THEN
      SELECT id INTO v_credit_id
      FROM planner_finance_accounts
      WHERE org_id = v_org_id AND type = 'hutang_dagang' AND is_system = true AND project_id IS NULL
      LIMIT 1;
      IF v_credit_id IS NULL THEN
        RAISE EXCEPTION 'akun_hutang_dagang_tidak_ditemukan';
      END IF;
    ELSE
      SELECT id INTO v_credit_id
      FROM planner_finance_accounts
      WHERE org_id = v_org_id AND type = 'kas' AND project_id = p_project_id AND is_active = true
      LIMIT 1;
      IF v_credit_id IS NULL THEN
        INSERT INTO planner_finance_accounts (org_id, type, category, name, project_id, is_system)
        VALUES (v_org_id, 'kas', 'aktiva', 'Kas ' || v_proj_name, p_project_id, false)
        RETURNING id INTO v_credit_id;
      END IF;
    END IF;

    v_journal_id := public.planner_post_journal(
      v_org_id,
      v_entry_date,
      'Biaya proyek: ' || COALESCE(p_description, ''),
      'project_expense',
      v_row.id,
      jsonb_build_array(
        jsonb_build_object(
          'account_id', v_hpp_id,
          'debit', v_amount,
          'credit', 0,
          'project_id', p_project_id,
          'needs_review', v_needs_review
        ),
        jsonb_build_object(
          'account_id', v_credit_id,
          'debit', 0,
          'credit', v_amount,
          'project_id', p_project_id,
          'party_id', CASE WHEN v_is_accrual THEN p_party_id ELSE NULL END
        )
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

REVOKE ALL ON FUNCTION public.planner_create_cost_realization_atomic(uuid, uuid, date, text, numeric, numeric, bigint, text, text, text, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.planner_create_cost_realization_atomic(uuid, uuid, date, text, numeric, numeric, bigint, text, text, text, uuid, uuid) TO authenticated;

-- 5. Perbarui planner_backfill_cost_journals agar memakai planner_hpp_account_type_for_rap + project_id + needs_review
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
  v_hpp_id uuid;
  v_hpp_type text;
  v_needs_review boolean;
  v_journal uuid;
  v_amount bigint;
  v_count integer := 0;
BEGIN
  FOR r IN
    SELECT
      c.id,
      c.project_id,
      c.rap_item_id,
      c.date,
      c.description,
      c.total_amount,
      p.org_id,
      p.name AS project_name,
      rap.type AS rap_type
    FROM planner_cost_realizations c
    JOIN planner_projects p ON p.id = c.project_id
    LEFT JOIN planner_rap_items rap ON rap.id = c.rap_item_id
    WHERE c.journal_entry_id IS NULL
      AND COALESCE(c.total_amount, 0) > 0
      AND COALESCE(c.status, 'recorded') NOT IN ('dividend', 'cancelled')
      AND c.deleted_at IS NULL
  LOOP
    v_amount := ROUND(r.total_amount)::bigint;
    IF v_amount <= 0 THEN CONTINUE; END IF;
    v_org := r.org_id;

    PERFORM public.seed_default_chart_of_accounts(v_org);

    v_hpp_type := public.planner_hpp_account_type_for_rap(r.rap_type);
    v_needs_review := (v_hpp_type = 'hpp_uncategorized');

    SELECT id INTO v_hpp_id
    FROM planner_finance_accounts
    WHERE org_id = v_org AND type = v_hpp_type AND is_system = true AND project_id IS NULL
    LIMIT 1;
    IF v_hpp_id IS NULL THEN CONTINUE; END IF;

    SELECT id INTO v_kas
    FROM planner_finance_accounts
    WHERE org_id = v_org AND type = 'kas' AND project_id = r.project_id AND is_active = true
    LIMIT 1;
    IF v_kas IS NULL THEN
      INSERT INTO planner_finance_accounts (org_id, type, category, name, project_id, is_system)
      VALUES (v_org, 'kas', 'aktiva', 'Kas ' || r.project_name, r.project_id, false)
      RETURNING id INTO v_kas;
    END IF;

    IF EXISTS (
      SELECT 1 FROM planner_journal_entries e
      WHERE e.org_id = v_org AND e.reference_type = 'project_expense' AND e.reference_id = r.id
        AND NOT EXISTS (
          SELECT 1 FROM planner_journal_entries rev
          WHERE rev.org_id = v_org AND rev.reference_type = 'reversal' AND rev.reference_id = e.id
        )
    ) THEN
      UPDATE planner_cost_realizations
      SET journal_entry_id = (
        SELECT e.id FROM planner_journal_entries e
        WHERE e.org_id = v_org AND e.reference_type = 'project_expense' AND e.reference_id = r.id
          AND NOT EXISTS (
            SELECT 1 FROM planner_journal_entries rev
            WHERE rev.org_id = v_org AND rev.reference_type = 'reversal' AND rev.reference_id = e.id
          )
        LIMIT 1
      ), synced_at = now()
      WHERE id = r.id AND journal_entry_id IS NULL;
      CONTINUE;
    END IF;

    INSERT INTO planner_journal_entries (
      org_id, entry_date, description, reference_type, reference_id, total_amount, source
    ) VALUES (
      v_org, r.date, 'Biaya: ' || COALESCE(r.description, ''), 'project_expense', r.id, v_amount, 'system'
    ) RETURNING id INTO v_journal;

    INSERT INTO planner_journal_lines (journal_id, account_id, debit, credit, project_id, needs_review) VALUES
      (v_journal, v_hpp_id, v_amount, 0, r.project_id, v_needs_review),
      (v_journal, v_kas, 0, v_amount, r.project_id, false);

    UPDATE planner_cost_realizations
    SET journal_entry_id = v_journal, synced_at = now()
    WHERE id = r.id;

    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.planner_backfill_cost_journals() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.planner_backfill_cost_journals() TO authenticated;

