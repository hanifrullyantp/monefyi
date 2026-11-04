-- Pembatalan jadwal laporan pagi. Laporan yang sudah terbuat tidak dihapus.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'planner-agent-morning') THEN
    PERFORM cron.unschedule('planner-agent-morning');
  END IF;
END $$;
