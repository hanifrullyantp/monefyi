-- Lifetime Estimator usage: deleting an estimation must never restore a free creation.
CREATE TABLE IF NOT EXISTS public.planner_estimation_usage (
  org_id UUID PRIMARY KEY REFERENCES public.planner_organizations(id) ON DELETE CASCADE,
  created_count INTEGER NOT NULL DEFAULT 0 CHECK (created_count >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.planner_estimation_usage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS planner_estimation_usage_select ON public.planner_estimation_usage;
CREATE POLICY planner_estimation_usage_select ON public.planner_estimation_usage
  FOR SELECT TO authenticated
  USING (org_id IN (SELECT public.planner_auth_org_ids()));

-- Backfill historical rows before enabling the insert counter.
INSERT INTO public.planner_estimation_usage (org_id, created_count)
SELECT org_id, count(*)::INTEGER
FROM public.planner_estimations
GROUP BY org_id
ON CONFLICT (org_id) DO UPDATE
SET created_count = GREATEST(planner_estimation_usage.created_count, EXCLUDED.created_count),
    updated_at = now();

CREATE OR REPLACE FUNCTION public.track_planner_estimation_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier TEXT;
  v_count INTEGER;
BEGIN
  SELECT tier INTO v_tier
  FROM public.planner_org_subscriptions
  WHERE org_id = NEW.org_id;
  v_tier := COALESCE(v_tier, 'free');

  INSERT INTO public.planner_estimation_usage (org_id, created_count)
  VALUES (NEW.org_id, 1)
  ON CONFLICT (org_id) DO UPDATE
    SET created_count = planner_estimation_usage.created_count + 1,
        updated_at = now()
  RETURNING created_count INTO v_count;

  IF v_tier = 'free' AND v_count > 3 THEN
    RAISE EXCEPTION 'Kuota gratis 3 estimasi telah habis. Upgrade untuk membuat estimasi baru.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_track_planner_estimation_creation ON public.planner_estimations;
CREATE TRIGGER trg_track_planner_estimation_creation
BEFORE INSERT ON public.planner_estimations
FOR EACH ROW EXECUTE FUNCTION public.track_planner_estimation_creation();
