-- Fase G1-2: Impor Mutasi Bank, Pencocokan Otomatis, & Rekonsiliasi Kas (BLOCKED remote — jangan push ke produksi)
-- 1) Membuat tabel planner_bank_statement_rows dengan deduplikasi UNIQUE(org_id, wallet_account_id, row_hash)
--    serta FK matched_journal_id REFERENCES planner_journal_entries(id) ON DELETE RESTRICT.
-- 2) Membuat tabel planner_bank_reconciliations untuk snapshot rekonsiliasi saldo kas buku besar vs rekening koran bank.
-- 3) Mengaktifkan RLS berbasis is_org_member pada kedua tabel tanpa memutasi tabel jurnal.

CREATE TABLE IF NOT EXISTS planner_bank_statement_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES planner_organizations(id) ON DELETE CASCADE,
  wallet_account_id uuid NOT NULL REFERENCES planner_finance_accounts(id) ON DELETE RESTRICT,
  bank_format text NOT NULL CHECK (bank_format IN ('bca', 'mandiri', 'bri', 'bni', 'generic')),
  entry_date date NOT NULL,
  description text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('in', 'out')),
  amount_rupiah bigint NOT NULL CHECK (amount_rupiah > 0),
  running_balance bigint,
  row_hash text NOT NULL,
  match_status text NOT NULL DEFAULT 'unmatched'
    CHECK (match_status IN ('unmatched', 'matched', 'ambiguous', 'ignored')),
  matched_journal_id uuid REFERENCES planner_journal_entries(id) ON DELETE RESTRICT,
  matched_score numeric(5,4),
  raw_row_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  imported_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, wallet_account_id, row_hash)
);

CREATE INDEX IF NOT EXISTS idx_planner_bank_statement_rows_wallet_date
  ON planner_bank_statement_rows(org_id, wallet_account_id, entry_date);

CREATE INDEX IF NOT EXISTS idx_planner_bank_statement_rows_status
  ON planner_bank_statement_rows(org_id, match_status);

CREATE INDEX IF NOT EXISTS idx_planner_bank_statement_rows_journal
  ON planner_bank_statement_rows(matched_journal_id);

ALTER TABLE planner_bank_statement_rows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS planner_bank_statement_rows_select ON planner_bank_statement_rows;
DROP POLICY IF EXISTS planner_bank_statement_rows_insert ON planner_bank_statement_rows;
DROP POLICY IF EXISTS planner_bank_statement_rows_update ON planner_bank_statement_rows;
DROP POLICY IF EXISTS planner_bank_statement_rows_delete_unmatched ON planner_bank_statement_rows;

-- Worker ke atas dapat membaca mutasi bank organisasi
CREATE POLICY planner_bank_statement_rows_select ON planner_bank_statement_rows
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, 'worker'));

-- Manager ke atas dapat mengimpor baris mutasi bank baru
CREATE POLICY planner_bank_statement_rows_insert ON planner_bank_statement_rows
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id, 'manager'));

-- Manager ke atas dapat memperbarui status pencocokan (mis. meninjau baris ambigu/unmatched)
CREATE POLICY planner_bank_statement_rows_update ON planner_bank_statement_rows
  FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id, 'manager'))
  WITH CHECK (public.is_org_member(org_id, 'manager'));

-- Baris mutasi yang sudah terikat jurnal tidak boleh dihapus
CREATE POLICY planner_bank_statement_rows_delete_unmatched ON planner_bank_statement_rows
  FOR DELETE TO authenticated
  USING (public.is_org_member(org_id, 'manager') AND matched_journal_id IS NULL);

CREATE TABLE IF NOT EXISTS planner_bank_reconciliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES planner_organizations(id) ON DELETE CASCADE,
  wallet_account_id uuid NOT NULL REFERENCES planner_finance_accounts(id) ON DELETE RESTRICT,
  period_month date NOT NULL,
  book_balance_rupiah bigint NOT NULL,
  bank_balance_rupiah bigint NOT NULL,
  explained_diff_rupiah bigint NOT NULL,
  unexplained_diff_rupiah bigint NOT NULL,
  status text NOT NULL CHECK (status IN ('reconciled', 'needs_review')),
  summary_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_planner_bank_reconciliations_wallet_period
  ON planner_bank_reconciliations(org_id, wallet_account_id, period_month);

ALTER TABLE planner_bank_reconciliations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS planner_bank_reconciliations_select ON planner_bank_reconciliations;
DROP POLICY IF EXISTS planner_bank_reconciliations_insert ON planner_bank_reconciliations;

-- Worker ke atas dapat membaca hasil rekonsiliasi bank organisasi
CREATE POLICY planner_bank_reconciliations_select ON planner_bank_reconciliations
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, 'worker'));

-- Manager ke atas dapat menyimpan snapshot rekonsiliasi bank baru (append-only)
CREATE POLICY planner_bank_reconciliations_insert ON planner_bank_reconciliations
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id, 'manager'));
