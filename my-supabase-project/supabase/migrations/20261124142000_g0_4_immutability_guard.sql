-- Fase G0-4: Jaminan Trigger Imutabilitas Jurnal & Policy RLS Append-Only (BLOCKED remote — jangan push ke produksi)
-- Memastikan seluruh tabel buku besar bersifat append-only secara idempoten:
--   1. Memperkuat fungsi public.planner_reject_journal_mutation() dengan ERRCODE = '55000'.
--   2. Memasang ulang trigger BEFORE UPDATE OR DELETE pada:
--      - planner_journal_entries (planner_journal_entries_no_mutation)
--      - planner_journal_lines (planner_journal_lines_no_mutation)
--      - planner_journal_allocations (planner_journal_allocations_no_mutation)
--   3. Memastikan RLS aktif dan tidak ada policy UPDATE / DELETE / ALL pada ketiga tabel jurnal.

-- 1. Fungsi penolak mutasi jurnal (idempoten, ERRCODE 55000 = object_not_in_prerequisite_state)
CREATE OR REPLACE FUNCTION public.planner_reject_journal_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'jurnal_tidak_boleh_diubah'
    USING ERRCODE = '55000',
          HINT = 'Buat jurnal pembalik. Baris yang sudah tercatat tidak diubah dan tidak dihapus.';
END;
$$;

-- 2. Pasang ulang trigger BEFORE UPDATE OR DELETE pada ketiga tabel jurnal
DROP TRIGGER IF EXISTS planner_journal_entries_no_mutation ON planner_journal_entries;
CREATE TRIGGER planner_journal_entries_no_mutation
  BEFORE UPDATE OR DELETE ON planner_journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.planner_reject_journal_mutation();

DROP TRIGGER IF EXISTS planner_journal_lines_no_mutation ON planner_journal_lines;
CREATE TRIGGER planner_journal_lines_no_mutation
  BEFORE UPDATE OR DELETE ON planner_journal_lines
  FOR EACH ROW EXECUTE FUNCTION public.planner_reject_journal_mutation();

DROP TRIGGER IF EXISTS planner_journal_allocations_no_mutation ON planner_journal_allocations;
CREATE TRIGGER planner_journal_allocations_no_mutation
  BEFORE UPDATE OR DELETE ON planner_journal_allocations
  FOR EACH ROW EXECUTE FUNCTION public.planner_reject_journal_mutation();

-- 3. Pastikan RLS aktif & hapus seluruh policy mutasi (UPDATE / DELETE / ALL) pada tabel jurnal
ALTER TABLE planner_journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_journal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_journal_allocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS planner_journal_entries_all ON planner_journal_entries;
DROP POLICY IF EXISTS planner_journal_entries_write ON planner_journal_entries;
DROP POLICY IF EXISTS planner_journal_entries_update ON planner_journal_entries;
DROP POLICY IF EXISTS planner_journal_entries_delete ON planner_journal_entries;

DROP POLICY IF EXISTS planner_journal_lines_all ON planner_journal_lines;
DROP POLICY IF EXISTS planner_journal_lines_write ON planner_journal_lines;
DROP POLICY IF EXISTS planner_journal_lines_update ON planner_journal_lines;
DROP POLICY IF EXISTS planner_journal_lines_delete ON planner_journal_lines;

DROP POLICY IF EXISTS planner_allocations_all ON planner_journal_allocations;
DROP POLICY IF EXISTS planner_allocations_write ON planner_journal_allocations;
DROP POLICY IF EXISTS planner_allocations_update ON planner_journal_allocations;
DROP POLICY IF EXISTS planner_allocations_delete ON planner_journal_allocations;
DROP POLICY IF EXISTS planner_journal_allocations_all ON planner_journal_allocations;
DROP POLICY IF EXISTS planner_journal_allocations_write ON planner_journal_allocations;
DROP POLICY IF EXISTS planner_journal_allocations_update ON planner_journal_allocations;
DROP POLICY IF EXISTS planner_journal_allocations_delete ON planner_journal_allocations;

-- Sapu bersih dinamis bila ada policy UPDATE / DELETE / ALL lain yang tersisa pada tabel jurnal
DO $$
DECLARE
  v_policy record;
BEGIN
  FOR v_policy IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'planner_journal_entries',
        'planner_journal_lines',
        'planner_journal_allocations'
      )
      AND cmd IN ('UPDATE', 'DELETE', 'ALL')
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      v_policy.policyname,
      v_policy.schemaname,
      v_policy.tablename
    );
  END LOOP;
END $$;
