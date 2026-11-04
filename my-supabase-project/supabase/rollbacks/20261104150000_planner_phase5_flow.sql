-- Pembatalan fase 5. Tidak menghapus jurnal atau biaya.

DROP POLICY IF EXISTS planner_flow_runs_update ON public.planner_flow_runs;
DROP POLICY IF EXISTS planner_flow_runs_insert ON public.planner_flow_runs;
DROP POLICY IF EXISTS planner_flow_runs_select ON public.planner_flow_runs;
DROP TABLE IF EXISTS public.planner_flow_runs;
