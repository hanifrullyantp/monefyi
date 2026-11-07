-- ============================================================================
-- MONEFYI HOLISTIC WINNING ENGINE (5 PILAR + MODE CUAN & MODE ADVANCE + PG_CRON)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 1. Konfigurasi Mode & Guardrail Winning Engine
CREATE TABLE IF NOT EXISTS public.winning_engine_config (
  id text PRIMARY KEY DEFAULT 'default',
  mode text NOT NULL DEFAULT 'cuan' CHECK (mode IN ('cuan', 'advance')),
  ad_account_id text,
  min_daily_budget numeric NOT NULL DEFAULT 100000,
  max_daily_budget numeric NOT NULL DEFAULT 1000000,
  approved_daily_ceiling numeric NOT NULL DEFAULT 1000000,
  monthly_spend_cap numeric NOT NULL DEFAULT 30000000,
  approved_monthly_ceiling numeric NOT NULL DEFAULT 30000000,
  target_cpa numeric NOT NULL DEFAULT 45000,
  target_roas numeric NOT NULL DEFAULT 3.0,
  max_scale_pct numeric NOT NULL DEFAULT 20,
  scale_cooldown_hours int NOT NULL DEFAULT 48,
  kill_switch boolean NOT NULL DEFAULT false,
  advance_master_plan_approved boolean NOT NULL DEFAULT false,
  strategist_provider text NOT NULL DEFAULT 'claude',
  strategist_model text NOT NULL DEFAULT 'claude-3-7-sonnet-latest',
  technical_provider text NOT NULL DEFAULT 'gemini',
  technical_model text NOT NULL DEFAULT 'gemini-2.5-flash',
  whatsapp_admin_phone text,
  telegram_chat_id text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Rencana Strategis 5 Pilar (Menunggu Persetujuan di Mode Cuan / Auto-Eksekusi di Mode Advance)
CREATE TABLE IF NOT EXISTS public.winning_engine_plans (
  id text PRIMARY KEY,
  mode text NOT NULL CHECK (mode IN ('cuan', 'advance')),
  pillar text NOT NULL CHECK (pillar IN ('offer', 'landing_page', 'checkout', 'ads_testing', 'tracking')),
  priority text NOT NULL DEFAULT 'high' CHECK (priority IN ('critical', 'high', 'medium')),
  title text NOT NULL,
  what_to_do text NOT NULL,
  why_evidence text NOT NULL,
  expected_impact text NOT NULL,
  action_type text NOT NULL,
  action_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  requires_ceiling_reapproval boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'executed', 'rejected', 'blocked_guardrail')),
  confidence int NOT NULL DEFAULT 85,
  decided_by text,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Log Audit Eksekusi (Manusia, AI Strategist, & Server Guardrail)
CREATE TABLE IF NOT EXISTS public.winning_engine_logs (
  id bigserial PRIMARY KEY,
  plan_id text,
  pillar text NOT NULL,
  actor text NOT NULL,
  action_type text NOT NULL,
  summary text NOT NULL,
  before_state jsonb,
  after_state jsonb,
  guardrail_note text,
  ok boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Memori Pembelajaran AI (Winning Hook, Offer, Demografi, & Copywriting)
CREATE TABLE IF NOT EXISTS public.winning_engine_learnings (
  id bigserial PRIMARY KEY,
  pillar text NOT NULL,
  category text NOT NULL,
  finding text NOT NULL,
  evidence_metric text NOT NULL,
  confidence int NOT NULL DEFAULT 80,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Aktifkan RLS (Diakses via Service Role / Admin Server)
ALTER TABLE public.winning_engine_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.winning_engine_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.winning_engine_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.winning_engine_learnings ENABLE ROW LEVEL SECURITY;

-- 5. Jadwal Otomatis Supabase pg_cron (Setiap 30 Menit)
-- Memanggil fungsi database / webhook ke /api/engine/tick apabila app_url telah diset di pengaturan database
CREATE OR REPLACE FUNCTION public.trigger_monefyi_winning_engine_tick()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_url text;
  cron_secret text;
BEGIN
  target_url := current_setting('app.settings.winning_engine_tick_url', true);
  cron_secret := current_setting('app.settings.winning_engine_cron_secret', true);

  IF target_url IS NOT NULL AND target_url <> '' THEN
    PERFORM net.http_post(
      url := target_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-engine-cron-secret', COALESCE(cron_secret, 'monefyi-cron')
      ),
      body := jsonb_build_object('source', 'supabase_pg_cron', 'timestamp', now())
    );
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('monefyi-winning-engine-30m')
    WHERE EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'monefyi-winning-engine-30m'
    );

    PERFORM cron.schedule(
      'monefyi-winning-engine-30m',
      '*/30 * * * *',
      'SELECT public.trigger_monefyi_winning_engine_tick();'
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Abaikan bila dijalankan di environment lokal tanpa superuser pg_cron
  NULL;
END $$;

