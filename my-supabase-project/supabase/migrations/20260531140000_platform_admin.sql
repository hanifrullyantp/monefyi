-- Platform super-admin: extended profiles, company types, AI quota

-- Extend profiles (platform-level, not org role)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS gemini_key TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_notifications BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('user', 'admin'));

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_status_check;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_status_check
  CHECK (status IN ('active', 'suspended', 'pending'));

-- user_plans: AI daily limit
ALTER TABLE user_plans
  ADD COLUMN IF NOT EXISTS ai_daily_limit INTEGER;

-- AI usage per user per day (planner parse + platform fallback)
CREATE TABLE IF NOT EXISTS ai_usage (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL,
  requests_count INTEGER NOT NULL DEFAULT 0,
  platform_fallback_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, usage_date)
);

ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_usage_select_own ON ai_usage;
CREATE POLICY ai_usage_select_own ON ai_usage
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Company / industry types (admin-managed)
CREATE TABLE IF NOT EXISTS company_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE company_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS company_types_read ON company_types;
CREATE POLICY company_types_read ON company_types
  FOR SELECT TO authenticated
  USING (is_active = true);

-- Platform settings on app_config
ALTER TABLE app_config
  ADD COLUMN IF NOT EXISTS platform_settings JSONB DEFAULT '{}'::jsonb;

-- Seed default company types
INSERT INTO company_types (slug, label, sort_order) VALUES
  ('construction', 'Konstruksi', 10),
  ('manufacturing', 'Manufaktur', 20),
  ('it', 'IT & Software', 30),
  ('event', 'Event', 40),
  ('service', 'Jasa', 50),
  ('retail', 'Retail', 60),
  ('other', 'Lainnya', 99)
ON CONFLICT (slug) DO NOTHING;

-- Default platform settings
UPDATE app_config
SET platform_settings = COALESCE(platform_settings, '{}'::jsonb) || jsonb_build_object(
  'platform_gemini_daily_fallback', 10,
  'default_ai_daily_limit', 20
)
WHERE id = 'global';

-- Grant first admin by email (adjust if needed)
UPDATE profiles p
SET role = 'admin'
FROM auth.users u
WHERE p.id = u.id
  AND u.email IN ('hanif.rullyant@gmail.com', 'admin@asfin.app');
