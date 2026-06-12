-- Paket langganan Planner — dikelola Super Admin, fallback di aplikasi jika kosong

CREATE TABLE IF NOT EXISTS planner_pricing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  price_monthly_idr INTEGER NOT NULL DEFAULT 0,
  projects_per_month INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_planner_pricing_plans_active
  ON planner_pricing_plans (sort_order)
  WHERE is_active = true;

INSERT INTO planner_pricing_plans (slug, label, description, price_monthly_idr, projects_per_month, sort_order, is_active, is_default, features)
VALUES
  (
    'free',
    'Gratis',
    'Cocok untuk mencoba — 2 proyek baru per bulan.',
    0,
    2,
    0,
    true,
    true,
    '["2 proyek/bulan","Estimator & RAP","1 organisasi"]'::jsonb
  ),
  (
    'starter',
    'Starter',
    'Untuk tim kecil yang butuh lebih banyak proyek.',
    99000,
    NULL,
    1,
    true,
    false,
    '["Proyek tanpa batas","Semua fitur Gratis","Dukungan email"]'::jsonb
  ),
  (
    'pro',
    'Pro',
    'Untuk perusahaan dengan banyak proyek & tim.',
    299000,
    NULL,
    2,
    true,
    false,
    '["Proyek tanpa batas","HR & absensi","Prioritas dukungan"]'::jsonb
  )
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE planner_pricing_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS planner_pricing_plans_read ON planner_pricing_plans;
CREATE POLICY planner_pricing_plans_read ON planner_pricing_plans
  FOR SELECT TO authenticated
  USING (is_active = true OR public.is_platform_admin());

DROP POLICY IF EXISTS planner_pricing_plans_admin ON planner_pricing_plans;
CREATE POLICY planner_pricing_plans_admin ON planner_pricing_plans
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());
