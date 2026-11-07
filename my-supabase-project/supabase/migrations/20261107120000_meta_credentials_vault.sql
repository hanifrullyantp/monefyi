-- Tambah kolom kredensial Meta Marketing API & OpenRouter di winning_engine_config
-- agar tersimpan permanen di cloud database Supabase (Multi-Device sync)
ALTER TABLE public.winning_engine_config
ADD COLUMN IF NOT EXISTS meta_access_token text,
ADD COLUMN IF NOT EXISTS meta_capi_token text,
ADD COLUMN IF NOT EXISTS meta_pixel_id text DEFAULT '1530674178146899',
ADD COLUMN IF NOT EXISTS openrouter_api_key text,
ADD COLUMN IF NOT EXISTS openrouter_processor_model text DEFAULT 'openai/gpt-5.6-luna';

-- Buat policy agar bisa dibaca dan diupdate oleh authenticated admin maupun anon API (melalui server router)
DROP POLICY IF EXISTS "Allow winning_engine_config access" ON public.winning_engine_config;
CREATE POLICY "Allow winning_engine_config access"
ON public.winning_engine_config
FOR ALL
USING (true)
WITH CHECK (true);

-- Insert row default jika belum ada
INSERT INTO public.winning_engine_config (id, ad_account_id, meta_pixel_id)
VALUES ('default', 'act_5763154810473541', '1530674178146899')
ON CONFLICT (id) DO NOTHING;
