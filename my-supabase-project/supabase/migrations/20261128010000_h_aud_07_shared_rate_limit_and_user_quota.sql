-- Migration: 20261128010000_h_aud_07_shared_rate_limit_and_user_quota.sql
-- BLOCKED remote — jangan push ke produksi tanpa tinjauan pemilik.
-- H-AUD-07:
-- 1) Tabel planner_agent_rate_limits di database bersama untuk rate limiting lintas isolate (per org_id + user_id per menit).
-- 2) Tabel planner_agent_user_usage untuk kuota harian per pengguna di dalam organisasi (mencegah 1 worker menghabiskan seluruh kuota org).
-- 3) RPC atomik planner_agent_check_rate_limit dan pembaruan planner_agent_consume_quota dengan p_user_id & token aktual.

CREATE TABLE IF NOT EXISTS public.planner_agent_rate_limits (
  org_id uuid NOT NULL REFERENCES public.planner_organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  window_minute timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  PRIMARY KEY (org_id, user_id, window_minute)
);

ALTER TABLE public.planner_agent_rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS planner_agent_rate_limits_select ON public.planner_agent_rate_limits;
CREATE POLICY planner_agent_rate_limits_select ON public.planner_agent_rate_limits
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND public.is_org_member(org_id, 'worker'));

CREATE TABLE IF NOT EXISTS public.planner_agent_user_usage (
  org_id uuid NOT NULL REFERENCES public.planner_organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date date NOT NULL,
  runs integer NOT NULL DEFAULT 0 CHECK (runs >= 0),
  tokens integer NOT NULL DEFAULT 0 CHECK (tokens >= 0),
  PRIMARY KEY (org_id, user_id, usage_date)
);

ALTER TABLE public.planner_agent_user_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS planner_agent_user_usage_select ON public.planner_agent_user_usage;
CREATE POLICY planner_agent_user_usage_select ON public.planner_agent_user_usage
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, 'worker'));

GRANT SELECT ON public.planner_agent_rate_limits TO authenticated;
GRANT SELECT ON public.planner_agent_user_usage TO authenticated;

CREATE OR REPLACE FUNCTION public.planner_agent_check_rate_limit(
  p_org_id uuid,
  p_user_id uuid,
  p_max_per_minute integer DEFAULT 60
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window timestamptz;
  v_count integer;
  v_retry_after_ms integer;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id OR NOT public.is_org_member(p_org_id, 'worker') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'di_luar_wewenang', 'retry_after_ms', 60000);
  END IF;

  v_window := date_trunc('minute', now());

  INSERT INTO public.planner_agent_rate_limits (org_id, user_id, window_minute, request_count)
  VALUES (p_org_id, p_user_id, v_window, 0)
  ON CONFLICT (org_id, user_id, window_minute) DO NOTHING;

  SELECT request_count INTO v_count
  FROM public.planner_agent_rate_limits
  WHERE org_id = p_org_id AND user_id = p_user_id AND window_minute = v_window
  FOR UPDATE;

  IF v_count >= COALESCE(p_max_per_minute, 60) THEN
    v_retry_after_ms := GREATEST(1000, CAST(EXTRACT(EPOCH FROM (v_window + interval '1 minute' - now())) * 1000 AS integer));
    RETURN jsonb_build_object('ok', false, 'code', 'rate_limit_terlampaui', 'retry_after_ms', v_retry_after_ms);
  END IF;

  UPDATE public.planner_agent_rate_limits
  SET request_count = request_count + 1
  WHERE org_id = p_org_id AND user_id = p_user_id AND window_minute = v_window;

  RETURN jsonb_build_object('ok', true, 'code', 'ok', 'count', v_count + 1);
END;
$$;

REVOKE ALL ON FUNCTION public.planner_agent_check_rate_limit(uuid, uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.planner_agent_check_rate_limit(uuid, uuid, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.planner_agent_consume_quota(
  p_org_id uuid,
  p_tokens integer,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
  v_plan text;
  v_tz text;
  v_kill boolean;
  v_runs integer;
  v_tokens integer;
  v_user_runs integer;
  v_user_tokens integer;
  v_limit_runs integer;
  v_limit_tokens integer;
  v_user_limit_runs integer;
  v_user_limit_tokens integer;
  v_date date;
BEGIN
  v_user := COALESCE(p_user_id, auth.uid());
  IF auth.uid() IS NULL OR v_user IS NULL OR auth.uid() <> v_user OR NOT public.is_org_member(p_org_id, 'worker') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'di_luar_wewenang');
  END IF;
  IF p_tokens IS NULL OR p_tokens <= 0 OR p_tokens > 4000 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'batas_token');
  END IF;

  SELECT COALESCE(plan_type, 'free'), COALESCE(NULLIF(timezone, ''), 'Asia/Jakarta')
    INTO v_plan, v_tz
    FROM public.planner_organizations WHERE id = p_org_id;
  v_date := (now() AT TIME ZONE v_tz)::date;

  SELECT kill_switch INTO v_kill FROM public.planner_agent_settings WHERE org_id = p_org_id;
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

  -- Batas per pengguna = 50% dari kuota organisasi (minimal 5 run) untuk mencegah 1 user menghabiskan seluruh kuota org
  v_user_limit_runs := GREATEST(5, v_limit_runs / 2);
  v_user_limit_tokens := GREATEST(5000, v_limit_tokens / 2);

  INSERT INTO public.planner_agent_usage (org_id, usage_date, runs, tokens)
  VALUES (p_org_id, v_date, 0, 0)
  ON CONFLICT (org_id, usage_date) DO NOTHING;

  INSERT INTO public.planner_agent_user_usage (org_id, user_id, usage_date, runs, tokens)
  VALUES (p_org_id, v_user, v_date, 0, 0)
  ON CONFLICT (org_id, user_id, usage_date) DO NOTHING;

  SELECT runs, tokens INTO v_runs, v_tokens
  FROM public.planner_agent_usage WHERE org_id = p_org_id AND usage_date = v_date
  FOR UPDATE;

  SELECT runs, tokens INTO v_user_runs, v_user_tokens
  FROM public.planner_agent_user_usage WHERE org_id = p_org_id AND user_id = v_user AND usage_date = v_date
  FOR UPDATE;

  IF v_runs >= v_limit_runs OR v_user_runs >= v_user_limit_runs THEN
    RETURN jsonb_build_object('ok', false, 'code', 'kuota_run_habis');
  END IF;
  IF v_tokens + p_tokens > v_limit_tokens OR v_user_tokens + p_tokens > v_user_limit_tokens THEN
    RETURN jsonb_build_object('ok', false, 'code', 'kuota_token_habis');
  END IF;

  UPDATE public.planner_agent_usage
  SET runs = runs + 1, tokens = tokens + p_tokens
  WHERE org_id = p_org_id AND usage_date = v_date;

  UPDATE public.planner_agent_user_usage
  SET runs = runs + 1, tokens = tokens + p_tokens
  WHERE org_id = p_org_id AND user_id = v_user AND usage_date = v_date;

  RETURN jsonb_build_object('ok', true, 'code', 'ok', 'runs_used', v_runs + 1, 'tokens_used', v_tokens + p_tokens);
END;
$$;

REVOKE ALL ON FUNCTION public.planner_agent_consume_quota(uuid, integer, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.planner_agent_consume_quota(uuid, integer, uuid) TO authenticated;
