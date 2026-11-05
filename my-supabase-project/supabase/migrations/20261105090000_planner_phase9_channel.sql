-- Fase 9: kanal Telegram. Token bot hanya tersimpan sebagai ciphertext.
-- Pembatalan: supabase/rollbacks/20261105090000_planner_phase9_channel.sql

CREATE TABLE IF NOT EXISTS public.planner_channel_secrets (
  org_id uuid PRIMARY KEY REFERENCES public.planner_organizations(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'telegram' CHECK (provider IN ('telegram', 'whatsapp_cloud')),
  ciphertext text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.planner_channel_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.planner_organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  telegram_user_id text NOT NULL UNIQUE,
  chat_id text NOT NULL,
  role text NOT NULL CHECK (role IN ('worker', 'manager', 'owner')),
  verified_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.planner_channel_link_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.planner_organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('worker', 'manager', 'owner')),
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz
);

CREATE INDEX IF NOT EXISTS planner_channel_link_codes_hash
  ON public.planner_channel_link_codes (code_hash)
  WHERE used_at IS NULL;

CREATE TABLE IF NOT EXISTS public.planner_channel_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.planner_organizations(id) ON DELETE CASCADE,
  telegram_user_id text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_type text NOT NULL CHECK (message_type IN ('text', 'button', 'photo', 'voice')),
  summary text NOT NULL,
  run_id uuid REFERENCES public.planner_agent_runs(id) ON DELETE SET NULL,
  status text NOT NULL CHECK (status IN ('ignored', 'received', 'rate_limited', 'linked', 'sent')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS planner_channel_messages_user_time
  ON public.planner_channel_messages (telegram_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.planner_channel_inbox (
  update_id bigint PRIMARY KEY,
  received_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.planner_channel_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.planner_organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.planner_projects(id) ON DELETE CASCADE,
  work_item_id uuid REFERENCES public.planner_work_items(id) ON DELETE SET NULL,
  project_label text NOT NULL,
  stage_label text NOT NULL,
  telegram_user_id text,
  chat_id text,
  asked_at timestamptz NOT NULL DEFAULT now(),
  asked_on date NOT NULL,
  reminded boolean NOT NULL DEFAULT false,
  status text NOT NULL CHECK (status IN (
    'siap_kirim', 'menunggu', 'perlu_foto', 'siap_konfirmasi', 'menunggu_persetujuan', 'diingatkan'
  )),
  answer text,
  note text NOT NULL DEFAULT '',
  photo_path text
);

CREATE UNIQUE INDEX IF NOT EXISTS planner_channel_questions_day
  ON public.planner_channel_questions (project_id, COALESCE(work_item_id, '00000000-0000-0000-0000-000000000000'::uuid), asked_on);

CREATE TABLE IF NOT EXISTS public.planner_channel_config (
  key text PRIMARY KEY,
  value text NOT NULL
);

INSERT INTO public.planner_channel_config (key, value)
VALUES (
  'dispatch_secret',
  replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.planner_channel_config (key, value)
VALUES (
  'functions_url',
  coalesce(
    current_setting('app.settings.supabase_functions_url', true),
    'https://zzwqfmdyncxbolestkqp.supabase.co/functions/v1'
  )
)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.planner_channel_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planner_channel_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planner_channel_link_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planner_channel_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planner_channel_inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planner_channel_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planner_channel_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS planner_channel_questions_select ON public.planner_channel_questions;
CREATE POLICY planner_channel_questions_select ON public.planner_channel_questions
  FOR SELECT TO authenticated USING (public.is_org_member(org_id, 'worker'));

DROP POLICY IF EXISTS planner_channel_messages_select ON public.planner_channel_messages;
CREATE POLICY planner_channel_messages_select ON public.planner_channel_messages
  FOR SELECT TO authenticated
  USING (org_id IS NOT NULL AND public.is_org_member(org_id, 'owner'));

GRANT SELECT ON public.planner_channel_questions TO authenticated;
GRANT SELECT ON public.planner_channel_messages TO authenticated;

CREATE OR REPLACE FUNCTION public.planner_issue_channel_link(p_org_id uuid, p_code_hash text)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_expires timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'tanpa_sesi' USING ERRCODE = '42501';
  END IF;
  SELECT role INTO v_role
  FROM planner_org_members
  WHERE org_id = p_org_id AND user_id = auth.uid() AND status = 'active';
  IF v_role IS NULL OR v_role NOT IN ('worker', 'manager', 'owner') THEN
    RAISE EXCEPTION 'bukan_anggota' USING ERRCODE = '42501';
  END IF;
  IF p_code_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'hash_tidak_valid' USING ERRCODE = '22023';
  END IF;
  v_expires := now() + interval '10 minutes';
  INSERT INTO planner_channel_link_codes (org_id, user_id, role, code_hash, expires_at)
  VALUES (p_org_id, auth.uid(), v_role, p_code_hash, v_expires);
  RETURN v_expires;
END;
$$;

CREATE OR REPLACE FUNCTION public.planner_channel_status(p_org_id uuid)
RETURNS TABLE (bot_configured boolean, links integer, kill_switch boolean, my_linked boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_org_member(p_org_id, 'worker') THEN
    RAISE EXCEPTION 'di_luar_wewenang' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT
    EXISTS (SELECT 1 FROM planner_channel_secrets s WHERE s.org_id = p_org_id),
    (SELECT COUNT(*)::integer FROM planner_channel_identities i WHERE i.org_id = p_org_id),
    COALESCE((SELECT a.kill_switch FROM planner_agent_settings a WHERE a.org_id = p_org_id), false),
    EXISTS (
      SELECT 1 FROM planner_channel_identities i
      WHERE i.org_id = p_org_id AND i.user_id = auth.uid()
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.planner_channel_redeem(
  p_hash text,
  p_telegram_user_id text,
  p_chat_id text
) RETURNS TABLE (org_id uuid, user_id uuid, role text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.planner_channel_link_codes%ROWTYPE;
BEGIN
  UPDATE public.planner_channel_link_codes
  SET used_at = now()
  WHERE code_hash = p_hash AND used_at IS NULL AND expires_at > now()
  RETURNING * INTO v_row;
  IF NOT FOUND THEN
    RETURN;
  END IF;
  INSERT INTO public.planner_channel_identities (org_id, user_id, telegram_user_id, chat_id, role, verified_at)
  VALUES (v_row.org_id, v_row.user_id, p_telegram_user_id, p_chat_id, v_row.role, now());
  org_id := v_row.org_id;
  user_id := v_row.user_id;
  role := v_row.role;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.planner_channel_ping_dispatch()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  fn_base text;
  dispatch_secret text;
BEGIN
  SELECT value INTO dispatch_secret FROM planner_channel_config WHERE key = 'dispatch_secret';
  SELECT value INTO fn_base FROM planner_channel_config WHERE key = 'functions_url';
  IF dispatch_secret IS NULL OR fn_base IS NULL THEN
    RETURN;
  END IF;
  PERFORM net.http_post(
    url := fn_base || '/tg-dispatch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-channel-dispatch-secret', dispatch_secret
    ),
    body := '{}'::jsonb
  );
EXCEPTION WHEN OTHERS THEN
  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.planner_issue_channel_link(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.planner_issue_channel_link(uuid, text) TO authenticated;

REVOKE ALL ON FUNCTION public.planner_channel_status(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.planner_channel_status(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.planner_channel_redeem(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.planner_channel_redeem(text, text, text) TO service_role;

REVOKE ALL ON FUNCTION public.planner_channel_ping_dispatch() FROM PUBLIC, anon, authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'planner-field-media',
  'planner-field-media',
  false,
  8388608,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'audio/ogg', 'audio/mpeg', 'audio/mp4']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS planner_field_media_select ON storage.objects;
CREATE POLICY planner_field_media_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'planner-field-media'
    AND (storage.foldername(name))[1] IN (
      SELECT m.org_id::text FROM planner_org_members m
      WHERE m.user_id = auth.uid() AND m.status = 'active'
    )
  );

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'planner-channel-dispatch') THEN
    PERFORM cron.schedule(
      'planner-channel-dispatch',
      '0 * * * *',
      $cron$SELECT public.planner_channel_ping_dispatch();$cron$
    );
  END IF;
END $$;
