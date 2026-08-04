-- Enable Supabase Realtime for STAY operational tables (OS notifications + live sync)

DO $$
DECLARE
  tbl TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    RETURN;
  END IF;

  FOREACH tbl IN ARRAY ARRAY[
    'stay_notifications',
    'stay_bookings',
    'stay_payments',
    'stay_rooms',
    'stay_housekeeping_tasks'
  ]
  LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END LOOP;
END $$;
