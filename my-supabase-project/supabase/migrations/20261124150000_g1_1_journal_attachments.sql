-- Fase G1-1: Lampiran Bukti Nota/Struk/Invoice Terikat ke Jurnal (BLOCKED remote — jangan push ke produksi)
-- 1) Membuat tabel planner_journal_attachments untuk menyimpan bukti transaksi (OCR + hash SHA-256 + skor keyakinan).
-- 2) Mengikat journal_entry_id dengan ON DELETE RESTRICT (nullable saat masih draf, diikat saat commit_entry).
-- 3) Indeks pada (org_id, sha256_hash) untuk deteksi duplikat & (journal_entry_id) untuk lookup cepat.
-- 4) RLS berbasis is_org_member + trigger penjaga agar lampiran yang sudah terikat jurnal tidak dapat dihapus/diubah.

CREATE TABLE IF NOT EXISTS planner_journal_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES planner_organizations(id) ON DELETE CASCADE,
  journal_entry_id uuid REFERENCES planner_journal_entries(id) ON DELETE RESTRICT,
  prepare_token text,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  file_size_bytes bigint,
  sha256_hash text NOT NULL,
  ocr_raw_text text,
  extracted_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence_score numeric(4,3),
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_planner_journal_attachments_org_hash
  ON planner_journal_attachments(org_id, sha256_hash);

CREATE INDEX IF NOT EXISTS idx_planner_journal_attachments_journal_id
  ON planner_journal_attachments(journal_entry_id);

ALTER TABLE planner_journal_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS planner_journal_attachments_select ON planner_journal_attachments;
DROP POLICY IF EXISTS planner_journal_attachments_insert ON planner_journal_attachments;
DROP POLICY IF EXISTS planner_journal_attachments_update_bind ON planner_journal_attachments;
DROP POLICY IF EXISTS planner_journal_attachments_delete_draft ON planner_journal_attachments;

-- Worker ke atas dapat membaca lampiran organisasi
CREATE POLICY planner_journal_attachments_select ON planner_journal_attachments
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, 'worker'));

-- Manager ke atas dapat mengunggah draf lampiran baru
CREATE POLICY planner_journal_attachments_insert ON planner_journal_attachments
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id, 'manager'));

-- Manager ke atas hanya dapat mengikat journal_entry_id dari NULL -> UUID (sekali ikat, tidak bisa diubah lagi)
CREATE POLICY planner_journal_attachments_update_bind ON planner_journal_attachments
  FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id, 'manager') AND journal_entry_id IS NULL)
  WITH CHECK (public.is_org_member(org_id, 'manager') AND journal_entry_id IS NOT NULL);

-- Lampiran yang sudah terikat jurnal tidak boleh dihapus; hanya draf (journal_entry_id IS NULL) yang dapat dibersihkan
CREATE POLICY planner_journal_attachments_delete_draft ON planner_journal_attachments
  FOR DELETE TO authenticated
  USING (public.is_org_member(org_id, 'manager') AND journal_entry_id IS NULL);

-- Penjaga level DB: tolak UPDATE/DELETE pada lampiran yang sudah terikat jurnal
CREATE OR REPLACE FUNCTION public.planner_guard_journal_attachment_binding()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.journal_entry_id IS NOT NULL THEN
      RAISE EXCEPTION 'lampiran_terikat_jurnal_tidak_boleh_dihapus'
        USING ERRCODE = '55000',
              HINT = 'Lampiran bukti yang sudah terikat ke jurnal bersifat permanen.';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.journal_entry_id IS NOT NULL THEN
      RAISE EXCEPTION 'lampiran_terikat_jurnal_tidak_boleh_diubah'
        USING ERRCODE = '55000',
              HINT = 'Lampiran bukti yang sudah terikat ke jurnal tidak dapat dimodifikasi atau dipindah.';
    END IF;
    IF NEW.org_id IS DISTINCT FROM OLD.org_id OR NEW.sha256_hash IS DISTINCT FROM OLD.sha256_hash THEN
      RAISE EXCEPTION 'identitas_lampiran_tidak_boleh_diubah'
        USING ERRCODE = '55000';
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS planner_journal_attachments_binding_guard ON planner_journal_attachments;
CREATE TRIGGER planner_journal_attachments_binding_guard
  BEFORE UPDATE OR DELETE ON planner_journal_attachments
  FOR EACH ROW EXECUTE FUNCTION public.planner_guard_journal_attachment_binding();
