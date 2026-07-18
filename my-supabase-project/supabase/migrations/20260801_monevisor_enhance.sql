-- ============================================================
-- Monevisor Enhancement Migration
-- ============================================================

BEGIN;

-- Chat message persistence
CREATE TABLE IF NOT EXISTS public.monevisor_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  thread_id       text NOT NULL,
  role            text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content         text NOT NULL,
  metadata        jsonb DEFAULT '{}',
  tokens_used     int DEFAULT 0,
  model           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_monevisor_msg_user_thread
  ON public.monevisor_messages (user_id, thread_id, created_at DESC);

-- User personalization for Monevisor
CREATE TABLE IF NOT EXISTS public.monevisor_prefs (
  user_id             uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Goals & priorities
  primary_goal        text, -- 'save_more' | 'reduce_debt' | 'invest' | 'learn' | 'stable'
  target_savings_pct  int,  -- 15, 20, 30
  monthly_saving_goal numeric,

  -- Preferences
  tone                text DEFAULT 'friendly', -- 'formal' | 'friendly' | 'casual'
  language            text DEFAULT 'id',
  notification_style  text DEFAULT 'gentle', -- 'aggressive' | 'gentle' | 'minimal'

  -- Learned context
  learned_facts       jsonb DEFAULT '[]', -- ["User punya cicilan KPR", ...]
  personality_notes   text,

  -- Feature toggles
  proactive_enabled   boolean DEFAULT true,
  voice_enabled       boolean DEFAULT false,
  narrative_style     text DEFAULT 'balanced', -- 'brief' | 'balanced' | 'detailed'

  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

-- Applied actions log (audit + learning)
CREATE TABLE IF NOT EXISTS public.monevisor_actions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type     text NOT NULL, -- 'reallocate' | 'increase_budget' | 'create_budget' | 'set_goal'
  action_payload  jsonb NOT NULL,
  source          text, -- 'insight' | 'chat' | 'notification'
  message_id      uuid REFERENCES public.monevisor_messages(id),
  applied         boolean DEFAULT false,
  applied_at      timestamptz,
  dismissed       boolean DEFAULT false,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_monevisor_actions_user
  ON public.monevisor_actions (user_id, applied, created_at DESC);

-- RLS
ALTER TABLE public.monevisor_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monevisor_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monevisor_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own messages" ON public.monevisor_messages;
CREATE POLICY "Users manage own messages" ON public.monevisor_messages
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own prefs" ON public.monevisor_prefs;
CREATE POLICY "Users manage own prefs" ON public.monevisor_prefs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own actions" ON public.monevisor_actions;
CREATE POLICY "Users manage own actions" ON public.monevisor_actions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

COMMIT;
