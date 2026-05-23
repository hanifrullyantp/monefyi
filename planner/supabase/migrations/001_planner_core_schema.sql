-- ============================================================
-- Monefyi Planner — Core Database Schema
-- ============================================================

-- Organizations
CREATE TABLE IF NOT EXISTS planner_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  settings JSONB DEFAULT '{}',
  plan_type TEXT DEFAULT 'free' CHECK (plan_type IN ('free','pro','enterprise')),
  plan_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS planner_org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES planner_organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','manager','member','viewer')),
  invited_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(org_id, user_id)
);

-- Projects
CREATE TABLE IF NOT EXISTS planner_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES planner_organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  client_name TEXT,
  client_contact JSONB DEFAULT '{}',
  location TEXT,
  planned_start DATE NOT NULL,
  planned_end DATE NOT NULL,
  actual_start DATE,
  actual_end DATE,
  status TEXT DEFAULT 'planning' CHECK (status IN ('planning','active','paused','completed','cancelled')),
  progress_pct NUMERIC(5,2) DEFAULT 0,
  total_budget NUMERIC(15,2) DEFAULT 0,
  total_spent NUMERIC(15,2) DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_planner_projects_org ON planner_projects(org_id);
CREATE INDEX IF NOT EXISTS idx_planner_projects_status ON planner_projects(status);

-- RAP Items
CREATE TABLE IF NOT EXISTS planner_rap_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES planner_projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('material','labor','equipment','overhead','other')),
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT NOT NULL,
  quantity NUMERIC(12,3) NOT NULL DEFAULT 0,
  unit_price NUMERIC(15,2) NOT NULL DEFAULT 0,
  supplier TEXT,
  notes TEXT,
  is_critical BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rap_items_project ON planner_rap_items(project_id);

-- Work Items (WBS / Timeline)
CREATE TABLE IF NOT EXISTS planner_work_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES planner_projects(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES planner_work_items(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  planned_start DATE NOT NULL,
  planned_end DATE NOT NULL,
  actual_start DATE,
  actual_end DATE,
  weight NUMERIC(5,2) DEFAULT 0,
  progress_pct NUMERIC(5,2) DEFAULT 0,
  planned_workers INT DEFAULT 1,
  actual_workers INT,
  dependencies UUID[] DEFAULT '{}',
  dependency_type TEXT DEFAULT 'FS' CHECK (dependency_type IN ('FS','FF','SS','SF')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','delayed','blocked')),
  rap_item_ids UUID[] DEFAULT '{}',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_work_items_project ON planner_work_items(project_id);
CREATE INDEX IF NOT EXISTS idx_work_items_parent ON planner_work_items(parent_id);

-- Cost Realizations
CREATE TABLE IF NOT EXISTS planner_cost_realizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES planner_projects(id) ON DELETE CASCADE,
  rap_item_id UUID REFERENCES planner_rap_items(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  quantity NUMERIC(12,3),
  unit_price NUMERIC(15,2),
  total_amount NUMERIC(15,2) NOT NULL,
  payment_method TEXT,
  receipt_url TEXT,
  supplier TEXT,
  status TEXT DEFAULT 'recorded' CHECK (status IN ('recorded','verified','disputed')),
  verified_by UUID REFERENCES auth.users(id),
  recorded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cost_real_project ON planner_cost_realizations(project_id);
CREATE INDEX IF NOT EXISTS idx_cost_real_date ON planner_cost_realizations(date);

-- Daily Logs
CREATE TABLE IF NOT EXISTS planner_daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES planner_projects(id) ON DELETE CASCADE,
  work_item_id UUID REFERENCES planner_work_items(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  progress_increment NUMERIC(5,2) DEFAULT 0,
  workers_present INT,
  weather TEXT CHECK (weather IN ('sunny','cloudy','rainy','stormy')),
  photo_urls TEXT[] DEFAULT '{}',
  recorded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_logs_project_date ON planner_daily_logs(project_id, date);

-- Analysis Snapshots
CREATE TABLE IF NOT EXISTS planner_analysis_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES planner_projects(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  pv NUMERIC(15,2),
  ev NUMERIC(15,2),
  ac NUMERIC(15,2),
  sv NUMERIC(15,2),
  cv NUMERIC(15,2),
  spi NUMERIC(8,4),
  cpi NUMERIC(8,4),
  eac NUMERIC(15,2),
  etc NUMERIC(15,2),
  planned_progress NUMERIC(5,2),
  actual_progress NUMERIC(5,2),
  s_curve_data JSONB DEFAULT '{}',
  recommendations JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analysis_project ON planner_analysis_snapshots(project_id, snapshot_date);

-- Command Logs (Smart Button)
CREATE TABLE IF NOT EXISTS planner_command_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  org_id UUID REFERENCES planner_organizations(id),
  input_type TEXT NOT NULL CHECK (input_type IN ('voice','text')),
  raw_input TEXT NOT NULL,
  parsed_intent TEXT,
  parsed_params JSONB,
  confidence NUMERIC(5,4),
  execution_status TEXT DEFAULT 'pending' CHECK (execution_status IN ('pending','executed','failed','needs_review')),
  execution_result JSONB,
  error_message TEXT,
  was_corrected BOOLEAN DEFAULT false,
  correction_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_command_logs_user ON planner_command_logs(user_id, created_at DESC);

-- Parsing Rules (self-improving)
CREATE TABLE IF NOT EXISTS planner_parsing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES planner_organizations(id),
  intent TEXT NOT NULL,
  patterns JSONB NOT NULL,
  extraction_rules JSONB NOT NULL DEFAULT '{}',
  examples JSONB DEFAULT '[]',
  version INT DEFAULT 1,
  accuracy_score NUMERIC(5,4) DEFAULT 0,
  usage_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Notifications
CREATE TABLE IF NOT EXISTS planner_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  org_id UUID REFERENCES planner_organizations(id),
  project_id UUID REFERENCES planner_projects(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON planner_notifications(user_id, is_read, created_at DESC);

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE planner_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_rap_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_work_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_cost_realizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_analysis_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_command_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_parsing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_notifications ENABLE ROW LEVEL SECURITY;

-- Org: owner can manage
CREATE POLICY planner_orgs_owner ON planner_organizations FOR ALL TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY planner_orgs_member_read ON planner_organizations FOR SELECT TO authenticated
  USING (id IN (SELECT org_id FROM planner_org_members WHERE user_id = auth.uid()));

-- Org members
CREATE POLICY planner_members_read ON planner_org_members FOR SELECT TO authenticated
  USING (org_id IN (SELECT org_id FROM planner_org_members WHERE user_id = auth.uid()));

CREATE POLICY planner_members_manage ON planner_org_members FOR ALL TO authenticated
  USING (org_id IN (SELECT org_id FROM planner_org_members WHERE user_id = auth.uid() AND role IN ('owner','admin')));

CREATE POLICY planner_members_self_insert ON planner_org_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Projects: org members can read, managers+ can write
CREATE POLICY planner_projects_read ON planner_projects FOR SELECT TO authenticated
  USING (org_id IN (SELECT org_id FROM planner_org_members WHERE user_id = auth.uid()));

CREATE POLICY planner_projects_write ON planner_projects FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT org_id FROM planner_org_members WHERE user_id = auth.uid() AND role IN ('owner','admin','manager')));

CREATE POLICY planner_projects_update ON planner_projects FOR UPDATE TO authenticated
  USING (org_id IN (SELECT org_id FROM planner_org_members WHERE user_id = auth.uid() AND role IN ('owner','admin','manager')));

CREATE POLICY planner_projects_delete ON planner_projects FOR DELETE TO authenticated
  USING (org_id IN (SELECT org_id FROM planner_org_members WHERE user_id = auth.uid() AND role IN ('owner','admin')));

-- RAP items: via project org membership
CREATE POLICY planner_rap_all ON planner_rap_items FOR ALL TO authenticated
  USING (project_id IN (SELECT id FROM planner_projects WHERE org_id IN (SELECT org_id FROM planner_org_members WHERE user_id = auth.uid())));

-- Work items: via project org membership
CREATE POLICY planner_work_all ON planner_work_items FOR ALL TO authenticated
  USING (project_id IN (SELECT id FROM planner_projects WHERE org_id IN (SELECT org_id FROM planner_org_members WHERE user_id = auth.uid())));

-- Cost realizations: via project org membership
CREATE POLICY planner_cost_all ON planner_cost_realizations FOR ALL TO authenticated
  USING (project_id IN (SELECT id FROM planner_projects WHERE org_id IN (SELECT org_id FROM planner_org_members WHERE user_id = auth.uid())));

-- Daily logs: via project org membership
CREATE POLICY planner_logs_all ON planner_daily_logs FOR ALL TO authenticated
  USING (project_id IN (SELECT id FROM planner_projects WHERE org_id IN (SELECT org_id FROM planner_org_members WHERE user_id = auth.uid())));

-- Analysis snapshots: via project org membership
CREATE POLICY planner_analysis_all ON planner_analysis_snapshots FOR ALL TO authenticated
  USING (project_id IN (SELECT id FROM planner_projects WHERE org_id IN (SELECT org_id FROM planner_org_members WHERE user_id = auth.uid())));

-- Command logs: user's own
CREATE POLICY planner_commands_own ON planner_command_logs FOR ALL TO authenticated
  USING (user_id = auth.uid());

-- Parsing rules: global or org-specific
CREATE POLICY planner_rules_read ON planner_parsing_rules FOR SELECT TO authenticated
  USING (org_id IS NULL OR org_id IN (SELECT org_id FROM planner_org_members WHERE user_id = auth.uid()));

-- Notifications: user's own
CREATE POLICY planner_notif_own ON planner_notifications FOR ALL TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- Enable Realtime
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE planner_projects;
ALTER PUBLICATION supabase_realtime ADD TABLE planner_daily_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE planner_cost_realizations;
ALTER PUBLICATION supabase_realtime ADD TABLE planner_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE planner_work_items;
