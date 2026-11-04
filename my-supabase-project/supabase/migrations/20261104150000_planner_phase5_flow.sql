-- Fase 5: status run SOP. Bisa dilanjutkan. Tidak menyimpan nominal.
-- Pembatalan: supabase/rollbacks/20261104150000_planner_phase5_flow.sql

CREATE TABLE IF NOT EXISTS public.planner_flow_runs (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.planner_organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sop_id text NOT NULL,
  sop_version integer NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'done', 'expired')),
  current_step text NOT NULL,
  state jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS planner_flow_runs_user_status_idx
  ON public.planner_flow_runs (user_id, status);

ALTER TABLE public.planner_flow_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS planner_flow_runs_select ON public.planner_flow_runs;
CREATE POLICY planner_flow_runs_select
  ON public.planner_flow_runs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() AND public.is_org_member(org_id, 'worker'));

DROP POLICY IF EXISTS planner_flow_runs_insert ON public.planner_flow_runs;
CREATE POLICY planner_flow_runs_insert
  ON public.planner_flow_runs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_org_member(org_id, 'worker'));

DROP POLICY IF EXISTS planner_flow_runs_update ON public.planner_flow_runs;
CREATE POLICY planner_flow_runs_update
  ON public.planner_flow_runs
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND public.is_org_member(org_id, 'worker'))
  WITH CHECK (user_id = auth.uid() AND public.is_org_member(org_id, 'worker'));

GRANT SELECT, INSERT, UPDATE ON public.planner_flow_runs TO authenticated;
