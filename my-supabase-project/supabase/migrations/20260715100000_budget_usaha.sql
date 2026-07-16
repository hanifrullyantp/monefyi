-- Budget Usaha: annual budget documents + templates

CREATE TABLE IF NOT EXISTS planner_budget_usaha (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES planner_organizations(id) ON DELETE CASCADE,
  year int NOT NULL,
  document_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  analysis_json jsonb DEFAULT '{}'::jsonb,
  is_draft boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, year)
);

CREATE INDEX IF NOT EXISTS idx_budget_usaha_org_year
  ON planner_budget_usaha(org_id, year DESC);

CREATE TABLE IF NOT EXISTS planner_budget_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES planner_organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  icon text NOT NULL DEFAULT 'file-text',
  is_system boolean NOT NULL DEFAULT false,
  categories_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  used_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_budget_templates_org
  ON planner_budget_templates(org_id, is_system);

ALTER TABLE planner_budget_usaha ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_budget_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS planner_budget_usaha_all ON planner_budget_usaha;
CREATE POLICY planner_budget_usaha_all ON planner_budget_usaha
  FOR ALL TO authenticated
  USING (org_id IN (SELECT public.planner_auth_org_ids()))
  WITH CHECK (org_id IN (SELECT public.planner_auth_org_ids()));

DROP POLICY IF EXISTS planner_budget_templates_all ON planner_budget_templates;
CREATE POLICY planner_budget_templates_all ON planner_budget_templates
  FOR ALL TO authenticated
  USING (
    is_system = true
    OR org_id IN (SELECT public.planner_auth_org_ids())
  )
  WITH CHECK (
    is_system = false
    AND org_id IN (SELECT public.planner_auth_org_ids())
  );
