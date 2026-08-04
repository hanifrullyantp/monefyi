-- STAY leads capture + onboarding state

ALTER TABLE stay_users
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_status TEXT DEFAULT 'pending'
    CHECK (onboarding_status IN ('pending', 'started', 'completed', 'skipped')),
  ADD COLUMN IF NOT EXISTS marketing_opt_in BOOLEAN DEFAULT false;

ALTER TABLE stay_tenants
  ADD COLUMN IF NOT EXISTS property_type TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS operating_status TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS setup_completed BOOLEAN DEFAULT false;

CREATE TABLE IF NOT EXISTS stay_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_source TEXT NOT NULL CHECK (lead_source IN ('landing_page_cta', 'direct_register', 'login_link')),
  email TEXT NOT NULL,
  phone TEXT,
  full_name TEXT,
  property_name TEXT,
  property_type TEXT,
  city TEXT,
  address TEXT,
  room_count INT,
  operating_status TEXT,
  referral_source TEXT,
  marketing_opt_in BOOLEAN DEFAULT false,
  user_id UUID REFERENCES stay_users(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES stay_tenants(id) ON DELETE SET NULL,
  onboarding_status TEXT DEFAULT 'started'
    CHECK (onboarding_status IN ('started', 'completed', 'skipped')),
  raw_payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stay_leads_email ON stay_leads(email);
CREATE INDEX IF NOT EXISTS idx_stay_leads_created ON stay_leads(created_at DESC);

ALTER TABLE stay_leads ENABLE ROW LEVEL SECURITY;

-- Service role / edge functions insert leads; owners read own tenant leads
CREATE POLICY stay_leads_tenant_read ON stay_leads FOR SELECT
  USING (tenant_id = stay_current_tenant_id());
