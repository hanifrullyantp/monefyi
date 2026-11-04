-- Pembatalan fase 7. Tidak menghapus jurnal, biaya, atau profil.

DROP FUNCTION IF EXISTS public.planner_agent_dispatch_morning(timestamptz);
DROP FUNCTION IF EXISTS public.planner_agent_consume_quota(uuid, integer);
DROP TABLE IF EXISTS public.planner_agent_actions;
DROP TABLE IF EXISTS public.planner_agent_runs;
DROP TABLE IF EXISTS public.planner_agent_reports;
DROP TABLE IF EXISTS public.planner_agent_usage;
DROP TABLE IF EXISTS public.planner_agent_settings;
