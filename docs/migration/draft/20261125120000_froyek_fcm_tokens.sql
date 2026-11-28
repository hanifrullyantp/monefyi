-- Draft migration tabel token FCM native untuk APK Android Capacitor (com.froyek.app).
-- DITARUH DI DRAFT: jangan dipindahkan ke supabase/migrations atau dijalankan otomatis.
-- Nama tabel tidak memakai awalan planner_* agar tidak bentrok dengan tabel planner yang ada.

CREATE TABLE IF NOT EXISTS public.froyek_fcm_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  token text NOT NULL,
  platform text NOT NULL DEFAULT 'android',
  app_version text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT froyek_fcm_tokens_user_device_unique UNIQUE (user_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_froyek_fcm_tokens_user_id ON public.froyek_fcm_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_froyek_fcm_tokens_token ON public.froyek_fcm_tokens(token);

ALTER TABLE public.froyek_fcm_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own fcm tokens" ON public.froyek_fcm_tokens;
CREATE POLICY "Users can manage own fcm tokens"
  ON public.froyek_fcm_tokens
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

