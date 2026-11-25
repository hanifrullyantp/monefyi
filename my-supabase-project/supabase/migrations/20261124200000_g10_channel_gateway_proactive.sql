-- Fase G10-2: Gateway Saluran & Mesin Proaktif Beranggaran Gangguan (BLOCKED remote — jangan push ke produksi)
-- 1) Membuat tabel planner_channel_gateway_identities untuk penautan (channel_type, external_handle) ke (org_id, member_id) secara unik lintas tenant (terpisah dari planner_channel_identities Telegram Fase 9).
-- 2) Membuat tabel append-only planner_outbound_message_logs sebagai jejak pesan keluar wajib per penerima dan question_keys.
-- 3) Membuat tabel planner_org_proactive_budgets untuk anggaran gangguan per organisasi (max_questions_per_person_per_day, quiet_start_hour, quiet_end_hour, kill_switch_enabled).
-- 4) Mengaktifkan RLS ketat berbasis is_org_member(org_id, ...) tanpa menyentuh atau memutasi tabel jurnal buku besar.

CREATE TABLE IF NOT EXISTS planner_channel_gateway_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES planner_organizations(id) ON DELETE CASCADE,
  member_id uuid NOT NULL,
  member_role text NOT NULL DEFAULT 'worker' CHECK (member_role IN ('worker', 'manager', 'owner')),
  channel_type text NOT NULL CHECK (
    channel_type IN ('telegram', 'web_pwa', 'whatsapp_unofficial', 'whatsapp_official')
  ),
  external_handle text NOT NULL,
  opted_out boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel_type, external_handle)
);

CREATE INDEX IF NOT EXISTS idx_planner_channel_gateway_identities_org_member
  ON planner_channel_gateway_identities(org_id, member_id);

ALTER TABLE planner_channel_gateway_identities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS planner_channel_gateway_identities_select ON planner_channel_gateway_identities;
DROP POLICY IF EXISTS planner_channel_gateway_identities_insert ON planner_channel_gateway_identities;
DROP POLICY IF EXISTS planner_channel_gateway_identities_update ON planner_channel_gateway_identities;

CREATE POLICY planner_channel_gateway_identities_select ON planner_channel_gateway_identities
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, 'worker'));

CREATE POLICY planner_channel_gateway_identities_insert ON planner_channel_gateway_identities
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id, 'manager'));

CREATE POLICY planner_channel_gateway_identities_update ON planner_channel_gateway_identities
  FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id, 'worker'))
  WITH CHECK (public.is_org_member(org_id, 'worker'));

CREATE TABLE IF NOT EXISTS planner_outbound_message_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES planner_organizations(id) ON DELETE CASCADE,
  recipient_member_id uuid NOT NULL,
  channel_type text NOT NULL CHECK (
    channel_type IN ('telegram', 'web_pwa', 'whatsapp_unofficial', 'whatsapp_official')
  ),
  question_keys text[] NOT NULL DEFAULT '{}'::text[],
  message_body text NOT NULL,
  outcome text NOT NULL CHECK (
    outcome IN (
      'sent',
      'escalated_to_supervisor',
      'deferred_quiet_hours',
      'already_answered_or_sent',
      'budget_exhausted',
      'blocked_opt_out',
      'blocked_org_kill_switch',
      'paused_after_ignored',
      'send_failed'
    )
  ),
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_planner_outbound_message_logs_org_recipient_sent
  ON planner_outbound_message_logs(org_id, recipient_member_id, sent_at DESC);

CREATE OR REPLACE FUNCTION public.planner_reject_outbound_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'log_pesan_keluar_tidak_boleh_diubah'
    USING ERRCODE = '55000',
          HINT = 'Tabel planner_outbound_message_logs bersifat append-only untuk audit pesan keluar.';
END;
$$;

DROP TRIGGER IF EXISTS planner_outbound_message_logs_no_mutation ON planner_outbound_message_logs;
CREATE TRIGGER planner_outbound_message_logs_no_mutation
  BEFORE UPDATE OR DELETE ON planner_outbound_message_logs
  FOR EACH ROW EXECUTE FUNCTION public.planner_reject_outbound_log_mutation();

ALTER TABLE planner_outbound_message_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS planner_outbound_message_logs_select ON planner_outbound_message_logs;
DROP POLICY IF EXISTS planner_outbound_message_logs_insert ON planner_outbound_message_logs;

CREATE POLICY planner_outbound_message_logs_select ON planner_outbound_message_logs
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, 'worker'));

CREATE POLICY planner_outbound_message_logs_insert ON planner_outbound_message_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id, 'manager'));

CREATE TABLE IF NOT EXISTS planner_org_proactive_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL UNIQUE REFERENCES planner_organizations(id) ON DELETE CASCADE,
  max_questions_per_person_per_day integer NOT NULL DEFAULT 3 CHECK (
    max_questions_per_person_per_day >= 0 AND max_questions_per_person_per_day <= 20
  ),
  quiet_start_hour integer NOT NULL DEFAULT 20 CHECK (
    quiet_start_hour >= 0 AND quiet_start_hour <= 23
  ),
  quiet_end_hour integer NOT NULL DEFAULT 7 CHECK (
    quiet_end_hour >= 0 AND quiet_end_hour <= 23
  ),
  kill_switch_enabled boolean NOT NULL DEFAULT false,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_planner_org_proactive_budgets_org
  ON planner_org_proactive_budgets(org_id);

ALTER TABLE planner_org_proactive_budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS planner_org_proactive_budgets_select ON planner_org_proactive_budgets;
DROP POLICY IF EXISTS planner_org_proactive_budgets_insert ON planner_org_proactive_budgets;
DROP POLICY IF EXISTS planner_org_proactive_budgets_update ON planner_org_proactive_budgets;

CREATE POLICY planner_org_proactive_budgets_select ON planner_org_proactive_budgets
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, 'worker'));

CREATE POLICY planner_org_proactive_budgets_insert ON planner_org_proactive_budgets
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id, 'owner'));

CREATE POLICY planner_org_proactive_budgets_update ON planner_org_proactive_budgets
  FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id, 'owner'))
  WITH CHECK (public.is_org_member(org_id, 'owner'));
