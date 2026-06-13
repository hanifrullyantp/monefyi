-- Pro+ tier, custom domains, finance_report_month per proyek

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
-- 1. Perluas plan_type organisasi
ALTER TABLE planner_organizations DROP CONSTRAINT IF EXISTS planner_organizations_plan_type_check;
ALTER TABLE planner_organizations ADD CONSTRAINT planner_organizations_plan_type_check
  CHECK (plan_type IN ('free', 'starter', 'pro', 'pro_plus', 'enterprise'));

-- Platform admin kelola semua org
DROP POLICY IF EXISTS planner_orgs_platform_admin ON planner_organizations;
CREATE POLICY planner_orgs_platform_admin ON planner_organizations
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- 2. Capabilities di katalog harga
ALTER TABLE planner_pricing_plans
  ADD COLUMN IF NOT EXISTS capabilities JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE planner_pricing_plans SET capabilities = '{"customDomain":false}'::jsonb WHERE slug IN ('free', 'starter', 'pro');

INSERT INTO planner_pricing_plans (
  slug, label, description, price_monthly_idr, projects_per_month,
  sort_order, is_active, is_default, features, capabilities
)
VALUES (
  'pro_plus',
  'Pro+',
  'Paket tertinggi — custom domain & white-label login.',
  499000,
  NULL,
  3,
  true,
  false,
  '["Proyek tanpa batas","Custom domain","HR & absensi","Prioritas dukungan"]'::jsonb,
  '{"customDomain":true}'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  price_monthly_idr = EXCLUDED.price_monthly_idr,
  capabilities = EXCLUDED.capabilities,
  features = EXCLUDED.features,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

-- 3. Custom domains per organisasi
CREATE TABLE IF NOT EXISTS planner_org_custom_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES planner_organizations(id) ON DELETE CASCADE,
  hostname TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'verified', 'failed', 'disabled')),
  verification_token TEXT NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', ''),
  verified_at TIMESTAMPTZ,
  ssl_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (ssl_status IN ('pending', 'active', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (hostname)
);

CREATE INDEX IF NOT EXISTS idx_planner_org_custom_domains_org
  ON planner_org_custom_domains (org_id);

CREATE INDEX IF NOT EXISTS idx_planner_org_custom_domains_verified
  ON planner_org_custom_domains (hostname)
  WHERE status = 'verified';

ALTER TABLE planner_org_custom_domains ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS planner_org_custom_domains_member ON planner_org_custom_domains;
CREATE POLICY planner_org_custom_domains_member ON planner_org_custom_domains
  FOR ALL TO authenticated
  USING (
    public.is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM planner_org_members m
      WHERE m.org_id = planner_org_custom_domains.org_id
        AND m.user_id = auth.uid()
        AND m.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    public.is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM planner_org_members m
      WHERE m.org_id = planner_org_custom_domains.org_id
        AND m.user_id = auth.uid()
        AND m.role IN ('owner', 'admin')
    )
  );

-- 4. Bulan laporan keuangan per proyek
ALTER TABLE planner_projects
  ADD COLUMN IF NOT EXISTS finance_report_month DATE,
  ADD COLUMN IF NOT EXISTS finance_report_month_manual BOOLEAN NOT NULL DEFAULT false;

UPDATE planner_projects
SET finance_report_month = date_trunc('month', created_at)::date
WHERE finance_report_month IS NULL;

-- 5. Hanif → Pro+
UPDATE planner_organizations o
SET plan_type = 'pro_plus', updated_at = now()
FROM planner_org_members m
JOIN auth.users u ON u.id = m.user_id
WHERE m.org_id = o.id
  AND lower(u.email) = lower('hanif.rullyant@gmail.com')
  AND m.role IN ('owner', 'admin');
