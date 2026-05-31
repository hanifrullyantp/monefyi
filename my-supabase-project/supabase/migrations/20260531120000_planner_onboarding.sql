-- ============================================================
-- Monefyi Planner — Multi-Role Onboarding Schema
-- ============================================================

-- Profiles (used by profileService)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  avatar_url TEXT,
  settings JSONB DEFAULT '{}',
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Align legacy profiles table (may exist from older migrations)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_self_read ON profiles;
CREATE POLICY profiles_self_read ON profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS profiles_self_write ON profiles;
CREATE POLICY profiles_self_write ON profiles FOR ALL TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Extend planner_organizations
ALTER TABLE planner_organizations
  ADD COLUMN IF NOT EXISTS industry TEXT,
  ADD COLUMN IF NOT EXISTS team_size TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS brand_color TEXT DEFAULT '#6366f1',
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Asia/Jakarta',
  ADD COLUMN IF NOT EXISTS allow_email_domain_signup BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS allowed_email_domains TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS default_role_for_domain TEXT DEFAULT 'worker',
  ADD COLUMN IF NOT EXISTS allow_join_request BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_public_discoverable BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Migrate existing orgs as onboarded
UPDATE planner_organizations SET onboarding_completed = true WHERE onboarding_completed = false;

-- Extend planner_org_members — drop old role check, migrate roles, add columns
ALTER TABLE planner_org_members DROP CONSTRAINT IF EXISTS planner_org_members_role_check;

UPDATE planner_org_members SET role = 'owner' WHERE role = 'admin';
UPDATE planner_org_members SET role = 'manager' WHERE role = 'member';
UPDATE planner_org_members SET role = 'worker' WHERE role = 'viewer';

ALTER TABLE planner_org_members
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS position TEXT,
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS invitation_id UUID,
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS removed_at TIMESTAMPTZ;

UPDATE planner_org_members SET status = 'active' WHERE status IS NULL;

ALTER TABLE planner_org_members
  ADD CONSTRAINT planner_org_members_role_check
  CHECK (role IN ('owner', 'manager', 'worker'));

ALTER TABLE planner_org_members
  ADD CONSTRAINT planner_org_members_status_check
  CHECK (status IN ('active', 'pending', 'suspended', 'removed'));

-- Extend planner_notifications
ALTER TABLE planner_notifications
  ADD COLUMN IF NOT EXISTS action_url TEXT;

-- Invitations
CREATE TABLE IF NOT EXISTS planner_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES planner_organizations(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  code TEXT UNIQUE,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'worker' CHECK (role IN ('owner', 'manager', 'worker')),
  type TEXT NOT NULL CHECK (type IN ('link', 'email', 'code')),
  personal_message TEXT,
  max_uses INT DEFAULT 1,
  used_count INT DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_planner_invitations_token ON planner_invitations(token);
CREATE INDEX IF NOT EXISTS idx_planner_invitations_code ON planner_invitations(code);
CREATE INDEX IF NOT EXISTS idx_planner_invitations_org ON planner_invitations(org_id);

ALTER TABLE planner_org_members
  DROP CONSTRAINT IF EXISTS planner_org_members_invitation_fk;
ALTER TABLE planner_org_members
  ADD CONSTRAINT planner_org_members_invitation_fk
  FOREIGN KEY (invitation_id) REFERENCES planner_invitations(id) ON DELETE SET NULL;

-- Join requests
CREATE TABLE IF NOT EXISTS planner_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES planner_organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_role TEXT DEFAULT 'worker' CHECK (requested_role IN ('owner', 'manager', 'worker')),
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  reject_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_planner_join_requests_org ON planner_join_requests(org_id, status);

-- Audit logs
CREATE TABLE IF NOT EXISTS planner_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES planner_organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  target_user_id UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_planner_audit_logs_org ON planner_audit_logs(org_id, created_at DESC);

-- Rate limits
CREATE TABLE IF NOT EXISTS planner_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  count INT DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, action, window_start)
);

-- Project member assignments (worker scoped access)
CREATE TABLE IF NOT EXISTS planner_project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES planner_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'worker' CHECK (role IN ('manager', 'worker')),
  assigned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_planner_project_members_user ON planner_project_members(user_id);

-- ============================================================
-- RLS Overhaul
-- ============================================================

ALTER TABLE planner_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_project_members ENABLE ROW LEVEL SECURITY;

-- Drop insecure self-insert policy
DROP POLICY IF EXISTS planner_members_self_insert ON planner_org_members;

-- Invitations: owner/manager read own org (no client INSERT — edge functions only)
DROP POLICY IF EXISTS planner_invitations_read ON planner_invitations;
CREATE POLICY planner_invitations_read ON planner_invitations FOR SELECT TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM planner_org_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager') AND status = 'active'
    )
  );

-- Join requests
DROP POLICY IF EXISTS planner_join_requests_own ON planner_join_requests;
CREATE POLICY planner_join_requests_own ON planner_join_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS planner_join_requests_insert ON planner_join_requests;
CREATE POLICY planner_join_requests_insert ON planner_join_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS planner_join_requests_org_read ON planner_join_requests;
CREATE POLICY planner_join_requests_org_read ON planner_join_requests FOR SELECT TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM planner_org_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager') AND status = 'active'
    )
  );

DROP POLICY IF EXISTS planner_join_requests_org_update ON planner_join_requests;
CREATE POLICY planner_join_requests_org_update ON planner_join_requests FOR UPDATE TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM planner_org_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager') AND status = 'active'
    )
  );

-- Audit logs: owner only
DROP POLICY IF EXISTS planner_audit_logs_owner ON planner_audit_logs;
CREATE POLICY planner_audit_logs_owner ON planner_audit_logs FOR SELECT TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM planner_org_members
      WHERE user_id = auth.uid() AND role = 'owner' AND status = 'active'
    )
  );

-- Rate limits: service role only (no client policies)

-- Project members
DROP POLICY IF EXISTS planner_project_members_read ON planner_project_members;
CREATE POLICY planner_project_members_read ON planner_project_members FOR SELECT TO authenticated
  USING (
    project_id IN (
      SELECT id FROM planner_projects WHERE org_id IN (
        SELECT org_id FROM planner_org_members WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

DROP POLICY IF EXISTS planner_project_members_manage ON planner_project_members;
CREATE POLICY planner_project_members_manage ON planner_project_members FOR ALL TO authenticated
  USING (
    project_id IN (
      SELECT p.id FROM planner_projects p
      JOIN planner_org_members m ON m.org_id = p.org_id
      WHERE m.user_id = auth.uid() AND m.role IN ('owner', 'manager') AND m.status = 'active'
    )
  );

-- Update org members manage policy for new roles
DROP POLICY IF EXISTS planner_members_manage ON planner_org_members;
CREATE POLICY planner_members_manage ON planner_org_members FOR ALL TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM planner_org_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager') AND status = 'active'
    )
  );

-- Org update: owner only
DROP POLICY IF EXISTS planner_orgs_owner ON planner_organizations;
CREATE POLICY planner_orgs_owner ON planner_organizations FOR ALL TO authenticated
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS planner_orgs_owner_update ON planner_organizations;
CREATE POLICY planner_orgs_owner_update ON planner_organizations FOR UPDATE TO authenticated
  USING (
    id IN (
      SELECT org_id FROM planner_org_members
      WHERE user_id = auth.uid() AND role = 'owner' AND status = 'active'
    )
  );

-- Worker project read: assigned only OR owner/manager see all
DROP POLICY IF EXISTS planner_projects_read ON planner_projects;
CREATE POLICY planner_projects_read ON planner_projects FOR SELECT TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM planner_org_members
      WHERE user_id = auth.uid() AND status = 'active'
      AND role IN ('owner', 'manager')
    )
    OR id IN (
      SELECT project_id FROM planner_project_members WHERE user_id = auth.uid()
    )
    OR (
      org_id IN (
        SELECT org_id FROM planner_org_members
        WHERE user_id = auth.uid() AND role = 'worker' AND status = 'active'
      )
      AND NOT EXISTS (
        SELECT 1 FROM planner_project_members pm
        WHERE pm.project_id = planner_projects.id
      )
    )
  );

-- Update project write policies for simplified roles
DROP POLICY IF EXISTS planner_projects_write ON planner_projects;
CREATE POLICY planner_projects_write ON planner_projects FOR INSERT TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM planner_org_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager') AND status = 'active'
    )
  );

DROP POLICY IF EXISTS planner_projects_update ON planner_projects;
CREATE POLICY planner_projects_update ON planner_projects FOR UPDATE TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM planner_org_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager') AND status = 'active'
    )
  );

DROP POLICY IF EXISTS planner_projects_delete ON planner_projects;
CREATE POLICY planner_projects_delete ON planner_projects FOR DELETE TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM planner_org_members
      WHERE user_id = auth.uid() AND role = 'owner' AND status = 'active'
    )
  );

-- Realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE planner_join_requests;
