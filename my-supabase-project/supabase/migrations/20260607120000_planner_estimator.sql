-- Monefyi Planner: Estimator module (penawaran / HPP / margin)
-- Tables use org_id → planner_organizations (not companies)

-- ---------------------------------------------------------------------------
-- Pricelist master
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS planner_pricelist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES planner_organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT CHECK (category IN ('material', 'upah', 'alat', 'jasa', 'other')),
  unit TEXT NOT NULL DEFAULT 'pcs',
  base_cost NUMERIC(15,2) NOT NULL DEFAULT 0,
  default_margin_pct NUMERIC(5,2) DEFAULT 20,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pricelist_org ON planner_pricelist_items(org_id, is_active);

-- ---------------------------------------------------------------------------
-- Estimation header
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS planner_estimations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES planner_organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  project_id UUID REFERENCES planner_projects(id) ON DELETE SET NULL,

  subtotal_hpp NUMERIC(15,2) NOT NULL DEFAULT 0,
  overhead_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  margin_pct NUMERIC(5,2) NOT NULL DEFAULT 20,
  discount_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  tax_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  total_selling_price NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_profit NUMERIC(15,2) NOT NULL DEFAULT 0,

  image_1_url TEXT,
  image_1_caption TEXT,
  image_2_url TEXT,
  image_2_caption TEXT,
  image_3_url TEXT,
  image_3_caption TEXT,

  pdf_primary_color TEXT,
  pdf_secondary_color TEXT,
  pdf_template TEXT NOT NULL DEFAULT 'modern'
    CHECK (pdf_template IN ('modern', 'classic', 'minimal', 'bold')),

  notes TEXT,
  terms_conditions TEXT,
  validity_days INT NOT NULL DEFAULT 14,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'converted')),

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT planner_estimations_org_code_unique UNIQUE (org_id, code)
);

CREATE INDEX IF NOT EXISTS idx_estimations_org ON planner_estimations(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_estimations_project ON planner_estimations(project_id);
CREATE INDEX IF NOT EXISTS idx_estimations_status ON planner_estimations(org_id, status);

-- ---------------------------------------------------------------------------
-- Estimation line items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS planner_estimation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimation_id UUID NOT NULL REFERENCES planner_estimations(id) ON DELETE CASCADE,
  pricelist_item_id UUID REFERENCES planner_pricelist_items(id) ON DELETE SET NULL,

  name TEXT NOT NULL,
  category TEXT,
  unit TEXT NOT NULL DEFAULT 'pcs',
  qty NUMERIC(15,4) NOT NULL DEFAULT 1,
  hpp_per_unit NUMERIC(15,2) NOT NULL DEFAULT 0,
  margin_pct NUMERIC(5,2) NOT NULL DEFAULT 20,
  selling_price_per_unit NUMERIC(15,2) NOT NULL DEFAULT 0,

  total_hpp NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_selling NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_profit NUMERIC(15,2) NOT NULL DEFAULT 0,

  sort_order INT NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_estimation_items_est ON planner_estimation_items(estimation_id, sort_order);

-- ---------------------------------------------------------------------------
-- Company PDF branding defaults
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS planner_pdf_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL UNIQUE REFERENCES planner_organizations(id) ON DELETE CASCADE,
  logo_url TEXT,
  company_name TEXT,
  company_tagline TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  bank_name TEXT,
  bank_account TEXT,
  bank_account_name TEXT,
  signature_url TEXT,
  signature_name TEXT,
  signature_title TEXT,
  primary_color TEXT DEFAULT '#4f46e5',
  secondary_color TEXT DEFAULT '#1e293b',
  accent_color TEXT DEFAULT '#10b981',
  default_pdf_template TEXT DEFAULT 'modern'
    CHECK (default_pdf_template IN ('modern', 'classic', 'minimal', 'bold')),
  footer_text TEXT DEFAULT 'Terima kasih atas kepercayaan Anda',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- WhatsApp / quotation message templates
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS planner_quotation_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES planner_organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'whatsapp',
  template TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quotation_templates_org ON planner_quotation_templates(org_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE planner_pricelist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_estimations ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_estimation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_pdf_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_quotation_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS planner_pricelist_items_all ON planner_pricelist_items;
CREATE POLICY planner_pricelist_items_all ON planner_pricelist_items
  FOR ALL TO authenticated
  USING (org_id IN (SELECT public.planner_auth_org_ids()))
  WITH CHECK (org_id IN (SELECT public.planner_auth_org_ids()));

DROP POLICY IF EXISTS planner_estimations_all ON planner_estimations;
CREATE POLICY planner_estimations_all ON planner_estimations
  FOR ALL TO authenticated
  USING (org_id IN (SELECT public.planner_auth_org_ids()))
  WITH CHECK (org_id IN (SELECT public.planner_auth_org_ids()));

DROP POLICY IF EXISTS planner_estimation_items_all ON planner_estimation_items;
CREATE POLICY planner_estimation_items_all ON planner_estimation_items
  FOR ALL TO authenticated
  USING (
    estimation_id IN (
      SELECT id FROM planner_estimations
      WHERE org_id IN (SELECT public.planner_auth_org_ids())
    )
  )
  WITH CHECK (
    estimation_id IN (
      SELECT id FROM planner_estimations
      WHERE org_id IN (SELECT public.planner_auth_org_ids())
    )
  );

DROP POLICY IF EXISTS planner_pdf_settings_all ON planner_pdf_settings;
CREATE POLICY planner_pdf_settings_all ON planner_pdf_settings
  FOR ALL TO authenticated
  USING (org_id IN (SELECT public.planner_auth_org_ids()))
  WITH CHECK (org_id IN (SELECT public.planner_auth_org_ids()));

DROP POLICY IF EXISTS planner_quotation_templates_all ON planner_quotation_templates;
CREATE POLICY planner_quotation_templates_all ON planner_quotation_templates
  FOR ALL TO authenticated
  USING (org_id IN (SELECT public.planner_auth_org_ids()))
  WITH CHECK (org_id IN (SELECT public.planner_auth_org_ids()));

-- ---------------------------------------------------------------------------
-- Storage buckets (estimation images + company assets)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'estimation-images',
  'estimation-images',
  false,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public)
VALUES ('company-assets', 'company-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: org members can manage files under their org_id prefix
DROP POLICY IF EXISTS estimation_images_select ON storage.objects;
CREATE POLICY estimation_images_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'estimation-images'
    AND (storage.foldername(name))[1] IN (
      SELECT org_id::text FROM planner_org_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

DROP POLICY IF EXISTS estimation_images_insert ON storage.objects;
CREATE POLICY estimation_images_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'estimation-images'
    AND (storage.foldername(name))[1] IN (
      SELECT org_id::text FROM planner_org_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

DROP POLICY IF EXISTS estimation_images_update ON storage.objects;
CREATE POLICY estimation_images_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'estimation-images'
    AND (storage.foldername(name))[1] IN (
      SELECT org_id::text FROM planner_org_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

DROP POLICY IF EXISTS estimation_images_delete ON storage.objects;
CREATE POLICY estimation_images_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'estimation-images'
    AND (storage.foldername(name))[1] IN (
      SELECT org_id::text FROM planner_org_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

DROP POLICY IF EXISTS company_assets_select ON storage.objects;
CREATE POLICY company_assets_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'company-assets');

DROP POLICY IF EXISTS company_assets_insert ON storage.objects;
CREATE POLICY company_assets_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'company-assets'
    AND (storage.foldername(name))[1] IN (
      SELECT org_id::text FROM planner_org_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

DROP POLICY IF EXISTS company_assets_update ON storage.objects;
CREATE POLICY company_assets_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'company-assets'
    AND (storage.foldername(name))[1] IN (
      SELECT org_id::text FROM planner_org_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

DROP POLICY IF EXISTS company_assets_delete ON storage.objects;
CREATE POLICY company_assets_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'company-assets'
    AND (storage.foldername(name))[1] IN (
      SELECT org_id::text FROM planner_org_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );
