-- Pembatalan kanal Telegram. Pesan, identitas, dan kode tautan ikut terhapus.
-- Jurnal dan profil perusahaan tidak diubah.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'planner-channel-dispatch') THEN
    PERFORM cron.unschedule('planner-channel-dispatch');
  END IF;
END $$;

DROP FUNCTION IF EXISTS public.planner_channel_ping_dispatch();
DROP FUNCTION IF EXISTS public.planner_channel_redeem(text, text, text);
DROP FUNCTION IF EXISTS public.planner_channel_status(uuid);
DROP FUNCTION IF EXISTS public.planner_issue_channel_link(uuid, text);

DROP POLICY IF EXISTS planner_field_media_select ON storage.objects;
DELETE FROM storage.objects WHERE bucket_id = 'planner-field-media';
DELETE FROM storage.buckets WHERE id = 'planner-field-media';

DROP TABLE IF EXISTS public.planner_channel_questions;
DROP TABLE IF EXISTS public.planner_channel_inbox;
DROP TABLE IF EXISTS public.planner_channel_messages;
DROP TABLE IF EXISTS public.planner_channel_link_codes;
DROP TABLE IF EXISTS public.planner_channel_identities;
DROP TABLE IF EXISTS public.planner_channel_secrets;
DROP TABLE IF EXISTS public.planner_channel_config;
