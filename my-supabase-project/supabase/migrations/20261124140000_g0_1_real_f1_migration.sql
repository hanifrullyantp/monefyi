-- Fase G0-1: Perbaikan Rekonsiliasi Migrasi F1 Nyata (BLOCKED remote — jangan push ke produksi)
-- Mengganti planner_migrate_f1_ledger agar:
--   1. Menggunakan jurnal reklasifikasi append-only (tanpa mutasi baris jurnal lama).
--   2. Menghitung ulang kas/piutang/hutang/uang_muka_klien/laba sesudah migrasi secara nyata dari buku besar.
--   3. Memakai subtransaksi rollback (SQLSTATE P0001) pada mode dry-run sambil tetap mengembalikan angka nyata.

-- 1. Tambah reference_type 'f1_migration' pada planner_journal_entries
ALTER TABLE planner_journal_entries DROP CONSTRAINT IF EXISTS planner_journal_entries_reference_type_check;
ALTER TABLE planner_journal_entries ADD CONSTRAINT planner_journal_entries_reference_type_check
  CHECK (reference_type IS NULL OR reference_type IN (
    'project_expense', 'project_income', 'opex', 'transfer', 'manual',
    'amortize', 'depreciation', 'opening',
    'project_close', 'payroll_disbursement', 'bon_disbursement', 'payroll_accrual', 'period_close',
    'reversal', 'payable_payment', 'receivable_receipt', 'dividend', 'f1_migration'
  ));

-- 2. Ganti RPC planner_migrate_f1_ledger dengan reklasifikasi append-only & rekonsiliasi nyata
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
  v_uang_muka_before bigint := 0;
  v_laba_before bigint := 0;

  v_kas_after bigint := 0;
  v_piutang_after bigint := 0;
  v_hutang_after bigint := 0;
  v_uang_muka_after bigint := 0;
  v_laba_after bigint := 0;

  v_dp_reclassified bigint := 0;
  v_uncategorized bigint := 0;
  v_reclassified_costs bigint := 0;
  v_reclassified_incomes bigint := 0;
  v_reconciled bigint := 0;
  v_matched boolean := false;

  v_laba_account_id uuid;
  v_pendapatan_account_id uuid;
  v_uang_muka_account_id uuid;
  v_target_account_id uuid;
  v_target_type text;
  v_journal_id uuid;
  v_amount bigint;
  v_needs_review boolean;

  v_cost record;
  v_income record;
  v_result jsonb;
BEGIN
  IF p_org_id IS NULL THEN
    RAISE EXCEPTION 'org_id required';
  END IF;

  IF auth.uid() IS NOT NULL AND NOT public.is_org_member(p_org_id, 'manager') THEN
    RAISE EXCEPTION 'bukan_pengelola' USING ERRCODE = '42501';
  END IF;

  -- Hitung saldo buku besar SEBELUM migrasi secara nyata
  SELECT
    COALESCE(SUM(CASE WHEN type = 'kas' THEN current_balance ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type IN ('piutang', 'piutang_retensi') THEN current_balance ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type LIKE 'hutang%' THEN current_balance ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'uang_muka_klien' THEN current_balance ELSE 0 END), 0),
    COALESCE(SUM(CASE
      WHEN type IN ('pendapatan_proyek', 'laba') THEN current_balance
      WHEN type LIKE 'hpp_%' OR type IN ('beban_opex', 'beban_penyusutan') THEN -current_balance
      ELSE 0
    END), 0)
  INTO v_kas_before, v_piutang_before, v_hutang_before, v_uang_muka_before, v_laba_before
  FROM planner_finance_accounts
  WHERE org_id = p_org_id;

  -- Jalankan reklasifikasi di dalam subtransaksi agar mode dry-run di-rollback bersih
  BEGIN
    PERFORM public.seed_default_chart_of_accounts(p_org_id);

    SELECT id INTO v_laba_account_id
    FROM planner_finance_accounts
    WHERE org_id = p_org_id AND type = 'laba' AND is_system = true AND project_id IS NULL
    LIMIT 1;

    SELECT id INTO v_pendapatan_account_id
    FROM planner_finance_accounts
    WHERE org_id = p_org_id AND type = 'pendapatan_proyek' AND is_system = true AND project_id IS NULL
    LIMIT 1;

    SELECT id INTO v_uang_muka_account_id
    FROM planner_finance_accounts
    WHERE org_id = p_org_id AND type = 'uang_muka_klien' AND is_system = true AND project_id IS NULL
    LIMIT 1;

    IF v_laba_account_id IS NULL OR v_pendapatan_account_id IS NULL OR v_uang_muka_account_id IS NULL THEN
      RAISE EXCEPTION 'akun_coa_f1_tidak_lengkap';
    END IF;

    -- 1. Reklasifikasi biaya proyek lama (Dr hpp_<rap_type> / Cr laba) secara append-only
    FOR v_cost IN
      SELECT
        c.id,
        c.project_id,
        c.rap_item_id,
        c.date,
        c.description,
        ROUND(c.total_amount)::bigint AS amount_rupiah,
        r.type AS rap_type
      FROM planner_cost_realizations c
      JOIN planner_projects p ON p.id = c.project_id
      LEFT JOIN planner_rap_items r ON r.id = c.rap_item_id
      WHERE p.org_id = p_org_id
        AND COALESCE(c.status, 'recorded') NOT IN ('dividend', 'cancelled')
        AND c.deleted_at IS NULL
        AND ROUND(c.total_amount)::bigint > 0
        AND EXISTS (
          SELECT 1
          FROM planner_journal_entries e
          JOIN planner_journal_lines l ON l.journal_id = e.id
          JOIN planner_finance_accounts a ON a.id = l.account_id
          WHERE e.org_id = p_org_id
            AND e.reference_type = 'project_expense'
            AND e.reference_id = c.id
            AND a.type = 'laba'
            AND l.debit > 0
            AND NOT EXISTS (
              SELECT 1 FROM planner_journal_entries rev
              WHERE rev.org_id = p_org_id
                AND rev.reference_type = 'reversal'
                AND rev.reference_id = e.id
            )
        )
        AND NOT EXISTS (
          SELECT 1 FROM planner_journal_entries m
          WHERE m.org_id = p_org_id
            AND m.reference_type = 'f1_migration'
            AND m.reference_id = c.id
        )
    LOOP
      v_amount := v_cost.amount_rupiah;
      v_target_type := CASE lower(COALESCE(v_cost.rap_type, ''))
        WHEN 'material' THEN 'hpp_material'
        WHEN 'labor' THEN 'hpp_labor'
        WHEN 'equipment' THEN 'hpp_equipment'
        WHEN 'overhead' THEN 'hpp_overhead'
        WHEN 'other' THEN 'hpp_other'
        ELSE 'hpp_uncategorized'
      END;
      v_needs_review := (v_cost.rap_item_id IS NULL OR v_target_type = 'hpp_uncategorized');

      SELECT id INTO v_target_account_id
      FROM planner_finance_accounts
      WHERE org_id = p_org_id AND type = v_target_type AND is_system = true AND project_id IS NULL
      LIMIT 1;

      IF v_target_account_id IS NULL THEN
        RAISE EXCEPTION 'akun_hpp_f1_tidak_ditemukan: %', v_target_type;
      END IF;

      INSERT INTO planner_journal_entries (
        org_id, entry_date, description, reference_type, reference_id, total_amount, source, created_by
      ) VALUES (
        p_org_id,
        COALESCE(v_cost.date, CURRENT_DATE),
        'Reklasifikasi F1 biaya: ' || COALESCE(NULLIF(btrim(v_cost.description), ''), v_cost.id::text),
        'f1_migration',
        v_cost.id,
        v_amount,
        'system',
        auth.uid()
      ) RETURNING id INTO v_journal_id;

      INSERT INTO planner_journal_lines (journal_id, account_id, debit, credit, notes, project_id, needs_review)
      VALUES
        (
          v_journal_id,
          v_target_account_id,
          v_amount,
          0,
          CASE WHEN v_needs_review THEN 'Biaya tanpa item RAP — perlu tinjauan pemilik' ELSE 'Reklasifikasi HPP F1' END,
          v_cost.project_id,
          v_needs_review
        ),
        (
          v_journal_id,
          v_laba_account_id,
          0,
          v_amount,
          'Penyesuaian saldo penampung laba lama (F1)',
          v_cost.project_id,
          false
        );

      v_reclassified_costs := v_reclassified_costs + 1;
      IF v_needs_review THEN
        v_uncategorized := v_uncategorized + 1;
      END IF;
    END LOOP;

    -- 2. Reklasifikasi pemasukan proyek lama (Dr laba / Cr pendapatan_proyek atau uang_muka_klien)
    FOR v_income IN
      SELECT
        i.id,
        i.project_id,
        i.date,
        i.category,
        i.description,
        ROUND(i.amount)::bigint AS amount_rupiah
      FROM planner_project_incomes i
      JOIN planner_projects p ON p.id = i.project_id
      WHERE p.org_id = p_org_id
        AND i.status = 'received'
        AND i.deleted_at IS NULL
        AND ROUND(i.amount)::bigint > 0
        AND EXISTS (
          SELECT 1
          FROM planner_journal_entries e
          JOIN planner_journal_lines l ON l.journal_id = e.id
          JOIN planner_finance_accounts a ON a.id = l.account_id
          WHERE e.org_id = p_org_id
            AND e.reference_type = 'project_income'
            AND e.reference_id = i.id
            AND a.type = 'laba'
            AND l.credit > 0
            AND NOT EXISTS (
              SELECT 1 FROM planner_journal_entries rev
              WHERE rev.org_id = p_org_id
                AND rev.reference_type = 'reversal'
                AND rev.reference_id = e.id
            )
        )
        AND NOT EXISTS (
          SELECT 1 FROM planner_journal_entries m
          WHERE m.org_id = p_org_id
            AND m.reference_type = 'f1_migration'
            AND m.reference_id = i.id
        )
    LOOP
      v_amount := v_income.amount_rupiah;
      IF v_income.category = 'dp' THEN
        v_target_account_id := v_uang_muka_account_id;
        v_dp_reclassified := v_dp_reclassified + v_amount;
      ELSE
        v_target_account_id := v_pendapatan_account_id;
      END IF;

      INSERT INTO planner_journal_entries (
        org_id, entry_date, description, reference_type, reference_id, total_amount, source, created_by
      ) VALUES (
        p_org_id,
        COALESCE(v_income.date, CURRENT_DATE),
        'Reklasifikasi F1 pemasukan (' || COALESCE(v_income.category, 'other') || '): ' || COALESCE(NULLIF(btrim(v_income.description), ''), v_income.id::text),
        'f1_migration',
        v_income.id,
        v_amount,
        'system',
        auth.uid()
      ) RETURNING id INTO v_journal_id;

      INSERT INTO planner_journal_lines (journal_id, account_id, debit, credit, notes, project_id, needs_review)
      VALUES
        (
          v_journal_id,
          v_laba_account_id,
          v_amount,
          0,
          'Penyesuaian saldo penampung laba lama (F1)',
          v_income.project_id,
          false
        ),
        (
          v_journal_id,
          v_target_account_id,
          0,
          v_amount,
          CASE WHEN v_income.category = 'dp' THEN 'Reklasifikasi DP ke uang muka klien' ELSE 'Reklasifikasi pendapatan proyek F1' END,
          v_income.project_id,
          false
        );

      v_reclassified_incomes := v_reclassified_incomes + 1;
    END LOOP;

    -- 3. Hitung ulang saldo buku besar SESUDAH migrasi secara nyata
    SELECT
      COALESCE(SUM(CASE WHEN type = 'kas' THEN current_balance ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN type IN ('piutang', 'piutang_retensi') THEN current_balance ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN type LIKE 'hutang%' THEN current_balance ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN type = 'uang_muka_klien' THEN current_balance ELSE 0 END), 0),
      COALESCE(SUM(CASE
        WHEN type IN ('pendapatan_proyek', 'laba') THEN current_balance
        WHEN type LIKE 'hpp_%' OR type IN ('beban_opex', 'beban_penyusutan') THEN -current_balance
        ELSE 0
      END), 0)
    INTO v_kas_after, v_piutang_after, v_hutang_after, v_uang_muka_after, v_laba_after
    FROM planner_finance_accounts
    WHERE org_id = p_org_id;

    SELECT COUNT(*) INTO v_reconciled
    FROM planner_journal_lines l
    JOIN planner_journal_entries e ON e.id = l.journal_id
    WHERE e.org_id = p_org_id;

    v_matched := (
      v_kas_before = v_kas_after
      AND v_piutang_before = v_piutang_after
      AND v_hutang_before = v_hutang_after
      AND (v_laba_after + v_dp_reclassified) = v_laba_before
      AND (v_uang_muka_after - v_uang_muka_before) = v_dp_reclassified
    );

    v_result := jsonb_build_object(
      'dry_run', p_dry_run,
      'kas_before', v_kas_before,
      'kas_after', v_kas_after,
      'piutang_before', v_piutang_before,
      'piutang_after', v_piutang_after,
      'hutang_before', v_hutang_before,
      'hutang_after', v_hutang_after,
      'uang_muka_before', v_uang_muka_before,
      'uang_muka_after', v_uang_muka_after,
      'laba_before', v_laba_before,
      'laba_after', v_laba_after,
      'dp_reclassified', v_dp_reclassified,
      'reclassified_costs', v_reclassified_costs,
      'reclassified_incomes', v_reclassified_incomes,
      'uncategorized_count', v_uncategorized,
      'reconciled_lines', v_reconciled,
      'matched', v_matched
    );

    IF p_dry_run THEN
      RAISE EXCEPTION 'f1_dry_run_rollback' USING ERRCODE = 'P0001';
    END IF;

    IF NOT v_matched THEN
      RAISE EXCEPTION 'migrasi_f1_tidak_cocok' USING ERRCODE = 'P0002';
    END IF;
  EXCEPTION
    WHEN SQLSTATE 'P0001' THEN
      IF SQLERRM <> 'f1_dry_run_rollback' THEN
        RAISE;
      END IF;
  END;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.planner_migrate_f1_ledger(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.planner_migrate_f1_ledger(uuid, boolean) TO authenticated;
