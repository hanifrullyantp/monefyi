-- planner_command_memory: org-shared learning memory for the Monefyi Assistant.
-- Every user/AI correction is stored as a normalized signature -> intent + param template,
-- so future similar commands are parsed deterministically (no AI needed) and improve over time.

CREATE TABLE IF NOT EXISTS planner_command_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES planner_organizations(id) ON DELETE CASCADE,
  signature TEXT NOT NULL,           -- normalized template, e.g. "beli {text0} {n0} sak {n1}"
  raw_sample TEXT,                   -- an example of the original raw input
  intent TEXT NOT NULL,
  params_template JSONB NOT NULL DEFAULT '{}',  -- slot mapping, e.g. {"item":"{text0}","qty":"{n0}","unit_price":"{n1}"}
  source TEXT NOT NULL DEFAULT 'user' CHECK (source IN ('user', 'ai')),
  hit_count INT NOT NULL DEFAULT 1,
  accuracy_score NUMERIC(5,4) NOT NULL DEFAULT 1.0,
  created_by UUID REFERENCES auth.users(id),
  last_used_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT planner_command_memory_unique UNIQUE (org_id, signature)
);

CREATE INDEX IF NOT EXISTS idx_command_memory_lookup ON planner_command_memory(org_id, signature);
CREATE INDEX IF NOT EXISTS idx_command_memory_examples ON planner_command_memory(org_id, intent, hit_count DESC);

ALTER TABLE planner_command_memory ENABLE ROW LEVEL SECURITY;

-- Any active org member can read and contribute corrections (team learns together).
DROP POLICY IF EXISTS planner_command_memory_all ON planner_command_memory;
CREATE POLICY planner_command_memory_all ON planner_command_memory
  FOR ALL TO authenticated
  USING (org_id IN (SELECT public.planner_auth_org_ids()))
  WITH CHECK (org_id IN (SELECT public.planner_auth_org_ids()));

COMMENT ON TABLE planner_command_memory IS
  'Org-shared learned corrections for the Monefyi Assistant command parser.';
COMMENT ON COLUMN planner_command_memory.signature IS
  'Normalized command template with numeric ({n0}) and subject ({text0}) slots.';
COMMENT ON COLUMN planner_command_memory.params_template IS
  'Maps intent params to signature slots so values are re-extracted on replay.';
