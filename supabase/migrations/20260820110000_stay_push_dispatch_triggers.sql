-- STAY system config (internal) + DB triggers for server-side Web Push

CREATE TABLE IF NOT EXISTS stay_system_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE stay_system_config ENABLE ROW LEVEL SECURITY;
-- No policies: only service role / postgres bypass RLS

INSERT INTO stay_system_config (key, value)
VALUES (
  'push_dispatch_secret',
  replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
)
ON CONFLICT (key) DO NOTHING;

INSERT INTO stay_system_config (key, value)
VALUES (
  'supabase_functions_url',
  coalesce(
    current_setting('app.settings.supabase_functions_url', true),
    'https://zzwqfmdyncxbolestkqp.supabase.co/functions/v1'
  )
)
ON CONFLICT (key) DO NOTHING;

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION stay_trigger_push_dispatch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  fn_base text;
  push_secret text;
  request_id bigint;
BEGIN
  SELECT value INTO push_secret FROM stay_system_config WHERE key = 'push_dispatch_secret';
  SELECT value INTO fn_base FROM stay_system_config WHERE key = 'supabase_functions_url';

  IF push_secret IS NULL OR fn_base IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT net.http_post(
    url := fn_base || '/stay-push-dispatch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-stay-push-secret', push_secret
    ),
    body := jsonb_build_object(
      'table', TG_TABLE_NAME,
      'record', to_jsonb(NEW)
    )
  ) INTO request_id;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block operational inserts
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS stay_bookings_push_dispatch ON stay_bookings;
CREATE TRIGGER stay_bookings_push_dispatch
  AFTER INSERT ON stay_bookings
  FOR EACH ROW
  EXECUTE FUNCTION stay_trigger_push_dispatch();

DROP TRIGGER IF EXISTS stay_housekeeping_push_dispatch ON stay_housekeeping_tasks;
CREATE TRIGGER stay_housekeeping_push_dispatch
  AFTER INSERT ON stay_housekeeping_tasks
  FOR EACH ROW
  EXECUTE FUNCTION stay_trigger_push_dispatch();

DROP TRIGGER IF EXISTS stay_payments_push_dispatch ON stay_payments;
CREATE TRIGGER stay_payments_push_dispatch
  AFTER INSERT ON stay_payments
  FOR EACH ROW
  EXECUTE FUNCTION stay_trigger_push_dispatch();

CREATE OR REPLACE FUNCTION stay_trigger_payment_paid_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  fn_base text;
  push_secret text;
  request_id bigint;
BEGIN
  IF NEW.status NOT IN ('paid', 'completed') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status IN ('paid', 'completed') THEN
    RETURN NEW;
  END IF;

  SELECT value INTO push_secret FROM stay_system_config WHERE key = 'push_dispatch_secret';
  SELECT value INTO fn_base FROM stay_system_config WHERE key = 'supabase_functions_url';

  IF push_secret IS NULL OR fn_base IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT net.http_post(
    url := fn_base || '/stay-push-dispatch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-stay-push-secret', push_secret
    ),
    body := jsonb_build_object(
      'table', TG_TABLE_NAME,
      'record', to_jsonb(NEW)
    )
  ) INTO request_id;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS stay_payments_paid_update_push ON stay_payments;
CREATE TRIGGER stay_payments_paid_update_push
  AFTER UPDATE OF status ON stay_payments
  FOR EACH ROW
  EXECUTE FUNCTION stay_trigger_payment_paid_update();

COMMENT ON FUNCTION stay_trigger_push_dispatch IS 'Fire-and-forget Web Push dispatch via pg_net → stay-push-dispatch';
