-- Jadwal laporan pagi. Fungsi sendiri yang menolak jam selain 07 waktu organisasi.
-- Pembatalan: supabase/rollbacks/20261104221000_planner_phase7_cron.sql

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'planner-agent-morning') THEN
    PERFORM cron.schedule(
      'planner-agent-morning',
      '0 * * * *',
      $cron$SELECT public.planner_agent_dispatch_morning(now());$cron$
    );
  END IF;
END $$;
