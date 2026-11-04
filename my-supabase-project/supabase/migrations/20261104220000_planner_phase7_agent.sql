-- Fase 7: run agen, antrean, laporan pagi, kuota.
-- Pembatalan: supabase/rollbacks/20261104220000_planner_phase7_agent.sql

CREATE TABLE IF NOT EXISTS public.planner_agent_settings (
  org_id uuid PRIMARY KEY REFERENCES public.planner_organizations(id) ON DELETE CASCADE,
  kill_switch boolean NOT NULL DEFAULT false,
  autonomy text NOT NULL DEFAULT 'L1' CHECK (autonomy IN ('L0', 'L1', 'L2', 'L3')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.planner_agent_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.planner_organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sop_id text,
  tier text NOT NULL,
  autonomy text NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'done', 'blocked')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.planner_agent_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.planner_agent_runs(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.planner_organizations(id) ON DELETE CASCADE,
  tool_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('draft', 'approved', 'rejected', 'executed')),
  impact jsonb NOT NULL DEFAULT '{}',
  sop_step text NOT NULL,
  policy_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.planner_agent_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.planner_organizations(id) ON DELETE CASCADE,
  report_date date NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, report_date)
);

CREATE TABLE IF NOT EXISTS public.planner_agent_usage (
  org_id uuid NOT NULL REFERENCES public.planner_organizations(id) ON DELETE CASCADE,
  usage_date date NOT NULL,
  runs integer NOT NULL DEFAULT 0,
  tokens integer NOT NULL DEFAULT 0,
  PRIMARY KEY (org_id, usage_date)
);

ALTER TABLE public.planner_agent_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planner_agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planner_agent_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planner_agent_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planner_agent_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS planner_agent_settings_select ON public.planner_agent_settings;
CREATE POLICY planner_agent_settings_select ON public.planner_agent_settings
  FOR SELECT TO authenticated USING (public.is_org_member(org_id, 'worker'));
DROP POLICY IF EXISTS planner_agent_settings_write ON public.planner_agent_settings;
CREATE POLICY planner_agent_settings_write ON public.planner_agent_settings
  FOR ALL TO authenticated
  USING (public.is_org_member(org_id, 'owner'))
  WITH CHECK (public.is_org_member(org_id, 'owner'));

DROP POLICY IF EXISTS planner_agent_runs_select ON public.planner_agent_runs;
CREATE POLICY planner_agent_runs_select ON public.planner_agent_runs
  FOR SELECT TO authenticated USING (public.is_org_member(org_id, 'worker'));
DROP POLICY IF EXISTS planner_agent_runs_insert ON public.planner_agent_runs;
CREATE POLICY planner_agent_runs_insert ON public.planner_agent_runs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_org_member(org_id, 'worker'));

DROP POLICY IF EXISTS planner_agent_actions_select ON public.planner_agent_actions;
CREATE POLICY planner_agent_actions_select ON public.planner_agent_actions
  FOR SELECT TO authenticated USING (public.is_org_member(org_id, 'worker'));
DROP POLICY IF EXISTS planner_agent_actions_insert ON public.planner_agent_actions;
CREATE POLICY planner_agent_actions_insert ON public.planner_agent_actions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id, 'worker'));
DROP POLICY IF EXISTS planner_agent_actions_update ON public.planner_agent_actions;
CREATE POLICY planner_agent_actions_update ON public.planner_agent_actions
  FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id, 'manager'))
  WITH CHECK (public.is_org_member(org_id, 'manager'));

DROP POLICY IF EXISTS planner_agent_reports_select ON public.planner_agent_reports;
CREATE POLICY planner_agent_reports_select ON public.planner_agent_reports
  FOR SELECT TO authenticated USING (public.is_org_member(org_id, 'worker'));
DROP POLICY IF EXISTS planner_agent_usage_select ON public.planner_agent_usage;
CREATE POLICY planner_agent_usage_select ON public.planner_agent_usage
  FOR SELECT TO authenticated USING (public.is_org_member(org_id, 'worker'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.planner_agent_settings TO authenticated;
GRANT SELECT, INSERT ON public.planner_agent_runs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.planner_agent_actions TO authenticated;
GRANT SELECT ON public.planner_agent_reports TO authenticated;
GRANT SELECT ON public.planner_agent_usage TO authenticated;

CREATE OR REPLACE FUNCTION public.planner_agent_consume_quota(p_org_id uuid, p_tokens integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan text;
  v_tz text;
  v_kill boolean;
  v_runs integer;
  v_tokens integer;
  v_limit_runs integer;
  v_limit_tokens integer;
  v_date date;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_org_member(p_org_id, 'worker') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'di_luar_wewenang');
  END IF;
  IF p_tokens IS NULL OR p_tokens < 0 OR p_tokens > 4000 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'batas_token');
  END IF;
  SELECT COALESCE(plan_type, 'free'), COALESCE(NULLIF(timezone, ''), 'Asia/Jakarta')
    INTO v_plan, v_tz
    FROM planner_organizations WHERE id = p_org_id;
  v_date := (now() AT TIME ZONE v_tz)::date;
  SELECT kill_switch INTO v_kill FROM planner_agent_settings WHERE org_id = p_org_id;
  IF COALESCE(v_kill, false) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'kill_switch');
  END IF;
  v_limit_runs := CASE COALESCE(v_plan, 'free')
    WHEN 'starter' THEN 30
    WHEN 'pro' THEN 100
    WHEN 'pro_plus' THEN 200
    WHEN 'enterprise' THEN 1000
    ELSE 10
  END;
  v_limit_tokens := CASE COALESCE(v_plan, 'free')
    WHEN 'starter' THEN 80000
    WHEN 'pro' THEN 300000
    WHEN 'pro_plus' THEN 600000
    WHEN 'enterprise' THEN 2000000
    ELSE 20000
  END;
  INSERT INTO planner_agent_usage (org_id, usage_date, runs, tokens)
  VALUES (p_org_id, v_date, 0, 0)
  ON CONFLICT (org_id, usage_date) DO NOTHING;
  SELECT runs, tokens INTO v_runs, v_tokens
  FROM planner_agent_usage WHERE org_id = p_org_id AND usage_date = v_date
  FOR UPDATE;
  IF v_runs >= v_limit_runs THEN
    RETURN jsonb_build_object('ok', false, 'code', 'kuota_run_habis');
  END IF;
  IF v_tokens >= v_limit_tokens THEN
    RETURN jsonb_build_object('ok', false, 'code', 'kuota_token_habis');
  END IF;
  UPDATE planner_agent_usage
  SET runs = runs + 1, tokens = tokens + p_tokens
  WHERE org_id = p_org_id AND usage_date = v_date;
  RETURN jsonb_build_object('ok', true, 'code', 'ok');
END;
$$;

REVOKE ALL ON FUNCTION public.planner_agent_consume_quota(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.planner_agent_consume_quota(uuid, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.planner_agent_dispatch_morning(p_now timestamptz DEFAULT now())
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  WITH due AS (
    SELECT o.id,
      COALESCE(NULLIF(o.timezone, ''), 'Asia/Jakarta') AS tz
    FROM planner_organizations o
    WHERE EXTRACT(HOUR FROM (p_now AT TIME ZONE COALESCE(NULLIF(o.timezone, ''), 'Asia/Jakarta'))) = 7
  ),
  inserted AS (
    INSERT INTO planner_agent_reports (org_id, report_date, body)
    SELECT d.id,
      (p_now AT TIME ZONE d.tz)::date,
      'Laporan pagi: antrean persetujuan dan proyek aktif.'
    FROM due d
    ON CONFLICT (org_id, report_date) DO NOTHING
    RETURNING org_id, report_date
  ),
  noted AS (
    INSERT INTO planner_notifications (user_id, org_id, type, title, message, data)
    SELECT m.user_id, i.org_id, 'agent_report', 'Laporan pagi',
      'Ringkasan agen untuk hari ini siap.',
      jsonb_build_object('report_date', i.report_date)
    FROM inserted i
    JOIN planner_org_members m
      ON m.org_id = i.org_id AND m.role = 'owner' AND m.status = 'active'
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM noted;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.planner_agent_dispatch_morning(timestamptz) FROM PUBLIC;
