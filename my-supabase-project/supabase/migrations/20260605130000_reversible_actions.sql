-- Reversible actions for owner/manager undo

CREATE TABLE IF NOT EXISTS planner_reversible_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES planner_organizations(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  before_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  after_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'undone', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  undone_at TIMESTAMPTZ,
  undone_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reversible_actions_org ON planner_reversible_actions(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reversible_actions_entity ON planner_reversible_actions(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_reversible_actions_active ON planner_reversible_actions(org_id, status)
  WHERE status = 'active';

ALTER TABLE planner_reversible_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reversible_actions_insert ON planner_reversible_actions;
CREATE POLICY reversible_actions_insert ON planner_reversible_actions
  FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid() AND org_id IN (SELECT public.planner_auth_admin_org_ids()));

DROP POLICY IF EXISTS reversible_actions_select ON planner_reversible_actions;
CREATE POLICY reversible_actions_select ON planner_reversible_actions
  FOR SELECT TO authenticated
  USING (org_id IN (SELECT public.planner_auth_admin_org_ids()));

DROP POLICY IF EXISTS reversible_actions_update ON planner_reversible_actions;
CREATE POLICY reversible_actions_update ON planner_reversible_actions
  FOR UPDATE TO authenticated
  USING (org_id IN (SELECT public.planner_auth_admin_org_ids()))
  WITH CHECK (org_id IN (SELECT public.planner_auth_admin_org_ids()));
