-- Membatalkan fase 3. Jurnal yang sudah terbentuk dari backfill tidak dihapus.

DROP VIEW IF EXISTS public.planner_v_project_cash;
DROP VIEW IF EXISTS public.planner_v_party_debt;

DROP TRIGGER IF EXISTS planner_accounts_ensure_wallet ON planner_finance_accounts;
DROP TRIGGER IF EXISTS planner_lines_apply_balance ON planner_journal_lines;
DROP TRIGGER IF EXISTS planner_accounts_balance_guard ON planner_finance_accounts;
DROP TRIGGER IF EXISTS planner_journal_lines_no_mutation ON planner_journal_lines;
DROP TRIGGER IF EXISTS planner_journal_entries_no_mutation ON planner_journal_entries;

DROP FUNCTION IF EXISTS public.planner_backfill_cost_journals();
DROP FUNCTION IF EXISTS public.planner_post_journal(uuid, date, text, text, uuid, jsonb, uuid);
DROP FUNCTION IF EXISTS public.planner_ensure_wallet();
DROP FUNCTION IF EXISTS public.planner_apply_line_balance();
DROP FUNCTION IF EXISTS public.planner_reject_balance_write();
DROP FUNCTION IF EXISTS public.planner_reject_journal_mutation();

DROP TABLE IF EXISTS planner_journal_allocations;
DROP TABLE IF EXISTS planner_wallets;
DROP TABLE IF EXISTS planner_parties;

ALTER TABLE planner_journal_lines DROP CONSTRAINT IF EXISTS planner_journal_lines_debit_xor_credit;
ALTER TABLE planner_journal_lines
  ALTER COLUMN debit TYPE numeric(15,2) USING debit::numeric,
  ALTER COLUMN credit TYPE numeric(15,2) USING credit::numeric;
ALTER TABLE planner_journal_lines
  ADD CONSTRAINT planner_journal_lines_debit_xor_credit CHECK (NOT (debit > 0 AND credit > 0));
ALTER TABLE planner_journal_entries
  ALTER COLUMN total_amount TYPE numeric(15,2) USING total_amount::numeric;
ALTER TABLE planner_finance_accounts
  ALTER COLUMN current_balance TYPE numeric(15,2) USING current_balance::numeric;

DROP POLICY IF EXISTS planner_journal_entries_insert ON planner_journal_entries;
DROP POLICY IF EXISTS planner_journal_lines_insert ON planner_journal_lines;
CREATE POLICY planner_journal_entries_write ON planner_journal_entries
  FOR ALL TO authenticated
  USING (public.is_org_member(org_id, 'manager'))
  WITH CHECK (public.is_org_member(org_id, 'manager'));
CREATE POLICY planner_journal_lines_write ON planner_journal_lines
  FOR ALL TO authenticated
  USING (
    journal_id IN (
      SELECT e.id FROM planner_journal_entries e
      WHERE public.is_org_member(e.org_id, 'manager')
    )
  )
  WITH CHECK (
    journal_id IN (
      SELECT e.id FROM planner_journal_entries e
      WHERE public.is_org_member(e.org_id, 'manager')
    )
  );
