-- Fase G7: Sistem Umpan Balik Terpadu & Observabilitas Lintas Aplikasi (BLOCKED remote — jangan push ke produksi)
-- 1) Membuat tabel planner_feedback_events untuk antrean sinyal terpadu teranonimisasi dengan fingerprint penggabungan laporan serupa dan priority_score.
-- 2) Membuat tabel planner_org_telemetry_settings untuk pengaturan opt-out telemetri perilaku per organisasi.
-- 3) Mengaktifkan RLS ketat berbasis is_org_member(org_id, ...) tanpa menyentuh atau memutasi tabel jurnal buku besar.

CREATE TABLE IF NOT EXISTS planner_feedback_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES planner_organizations(id) ON DELETE CASCADE,
  module text NOT NULL CHECK (module IN ('keuangan', 'proyek', 'sdm', 'ui', 'agent')),
  category text NOT NULL CHECK (
    category IN (
      'user_bug_report',
      'agent_rating',
      'ui_confused',
      'runtime_error',
      'behavior_friction',
      'silent_correction',
      'data_invariant_failure',
      'agent_unanswered_or_tool_fail'
    )
  ),
  severity text NOT NULL CHECK (severity IN ('kritis', 'sedang', 'ringan')),
  fingerprint text NOT NULL,
  title text NOT NULL,
  anonymized_context_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  app_version text,
  device_info text,
  model text,
  prompt_version text,
  reporter_count integer NOT NULL DEFAULT 1 CHECK (reporter_count >= 1),
  priority_score integer NOT NULL DEFAULT 0 CHECK (priority_score >= 0),
  status text NOT NULL DEFAULT 'open' CHECK (
    status IN ('open', 'triaged', 'pr_linked', 'resolved', 'wont_fix')
  ),
  notify_reporters_on_resolve boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_planner_feedback_events_org_fingerprint
  ON planner_feedback_events(org_id, fingerprint);

CREATE INDEX IF NOT EXISTS idx_planner_feedback_events_status_priority
  ON planner_feedback_events(status, priority_score DESC);

ALTER TABLE planner_feedback_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS planner_feedback_events_select ON planner_feedback_events;
DROP POLICY IF EXISTS planner_feedback_events_insert ON planner_feedback_events;
DROP POLICY IF EXISTS planner_feedback_events_update ON planner_feedback_events;

CREATE POLICY planner_feedback_events_select ON planner_feedback_events
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, 'worker'));

CREATE POLICY planner_feedback_events_insert ON planner_feedback_events
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id, 'worker'));

CREATE POLICY planner_feedback_events_update ON planner_feedback_events
  FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id, 'manager'))
  WITH CHECK (public.is_org_member(org_id, 'manager'));

CREATE TABLE IF NOT EXISTS planner_org_telemetry_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL UNIQUE REFERENCES planner_organizations(id) ON DELETE CASCADE,
  behavior_telemetry_opt_out boolean NOT NULL DEFAULT false,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_planner_org_telemetry_settings_org
  ON planner_org_telemetry_settings(org_id);

ALTER TABLE planner_org_telemetry_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS planner_org_telemetry_settings_select ON planner_org_telemetry_settings;
DROP POLICY IF EXISTS planner_org_telemetry_settings_insert ON planner_org_telemetry_settings;
DROP POLICY IF EXISTS planner_org_telemetry_settings_update ON planner_org_telemetry_settings;

CREATE POLICY planner_org_telemetry_settings_select ON planner_org_telemetry_settings
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, 'worker'));

CREATE POLICY planner_org_telemetry_settings_insert ON planner_org_telemetry_settings
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id, 'owner'));

CREATE POLICY planner_org_telemetry_settings_update ON planner_org_telemetry_settings
  FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id, 'owner'))
  WITH CHECK (public.is_org_member(org_id, 'owner'));
