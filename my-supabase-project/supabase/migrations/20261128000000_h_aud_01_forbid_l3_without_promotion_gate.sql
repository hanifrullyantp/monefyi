-- Migration: 20261128000000_h_aud_01_forbid_l3_without_promotion_gate.sql
-- BLOCKED remote — jangan push ke produksi tanpa tinjauan pemilik.
-- H-AUD-01: Melarang level otonomi 'L3' di planner_agent_settings sampai syarat promosi berbasis bukti (D-G5-01) terpenuhi.

UPDATE public.planner_agent_settings
SET autonomy = 'L1'
WHERE autonomy = 'L3';

ALTER TABLE public.planner_agent_settings
  DROP CONSTRAINT IF EXISTS planner_agent_settings_autonomy_check;

ALTER TABLE public.planner_agent_settings
  ADD CONSTRAINT planner_agent_settings_autonomy_check
  CHECK (autonomy IN ('L0', 'L1', 'L2'));

