-- planner_command_aliases: org-shared custom tags (#proyekA, #pakBudi, #semen) that map
-- a short alias to a concrete entity. Used by the Monefyi Assistant to boost parsing
-- accuracy: when a tag resolves to an entity, the assistant passes it as a structured hint.

CREATE TABLE IF NOT EXISTS planner_command_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES planner_organizations(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,                 -- normalized tag key, e.g. "proyeka" (without '#')
  label TEXT NOT NULL,                 -- display text, e.g. "Proyek A"
  entity_type TEXT NOT NULL CHECK (entity_type IN ('project', 'worker', 'rap', 'other')),
  entity_id UUID,                      -- optional FK-like reference (project/member/rap id)
  entity_name TEXT,                    -- resolved name for replay
  hit_count INT NOT NULL DEFAULT 1,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT planner_command_aliases_unique UNIQUE (org_id, alias, entity_type)
);

CREATE INDEX IF NOT EXISTS idx_command_aliases_org ON planner_command_aliases(org_id, alias);

ALTER TABLE planner_command_aliases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS planner_command_aliases_all ON planner_command_aliases;
CREATE POLICY planner_command_aliases_all ON planner_command_aliases
  FOR ALL TO authenticated
  USING (org_id IN (SELECT public.planner_auth_org_ids()))
  WITH CHECK (org_id IN (SELECT public.planner_auth_org_ids()));

COMMENT ON TABLE planner_command_aliases IS
  'Org-shared command tags mapping a short alias to a project/worker/rap entity.';
