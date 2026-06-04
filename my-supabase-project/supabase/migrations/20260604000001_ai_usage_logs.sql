-- ai_usage_logs: per-call telemetry for multi-provider AI routing.
-- Supports cost tracking, provider health monitoring, and debugging.

CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  tenant_id         uuid        NULL,  -- org/tenant context when available
  command_session_id uuid       NULL,  -- optional client-side session grouping
  provider          text        NOT NULL, -- 'groq' | 'gemini' | 'openai' | 'anthropic'
  model             text        NOT NULL,
  success           boolean     NOT NULL,
  response_time_ms  int         NOT NULL,
  confidence        float       NULL,
  prompt_tokens     int         NULL,
  completion_tokens int         NULL,
  cost_usd          decimal(10,6) NULL,
  error_message     text        NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common query patterns.
CREATE INDEX ai_usage_logs_user_id_created_at ON ai_usage_logs (user_id, created_at DESC);
CREATE INDEX ai_usage_logs_provider_created_at ON ai_usage_logs (provider, created_at DESC);
CREATE INDEX ai_usage_logs_created_at ON ai_usage_logs (created_at DESC);

-- RLS: users can read only their own rows; service role reads all.
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_ai_logs"
  ON ai_usage_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Service role bypasses RLS for edge function inserts and admin queries.

COMMENT ON TABLE ai_usage_logs IS
  'Per-call telemetry for multi-provider AI routing (Groq → Gemini → GPT-3.5 → Claude).';
COMMENT ON COLUMN ai_usage_logs.cost_usd IS
  'Estimated cost; 0 for free-tier providers (Groq, Gemini free tier).';
COMMENT ON COLUMN ai_usage_logs.confidence IS
  'Parsed confidence score returned by the AI model (0–1).';
