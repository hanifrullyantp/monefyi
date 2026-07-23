BEGIN;

-- User feedback / feature requests / bugs / complaints
CREATE TABLE IF NOT EXISTS public.user_feedback (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  type            text NOT NULL CHECK (type IN ('bug', 'feature', 'complaint', 'general')),
  title           text NOT NULL,
  body            text NOT NULL,
  status          text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  admin_notes     text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_feedback_status
  ON public.user_feedback (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_feedback_user
  ON public.user_feedback (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_feedback_type
  ON public.user_feedback (type, status);

ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users insert own feedback" ON public.user_feedback;
DROP POLICY IF EXISTS "Users read own feedback" ON public.user_feedback;
DROP POLICY IF EXISTS "Admin manage feedback" ON public.user_feedback;

CREATE POLICY "Users insert own feedback" ON public.user_feedback
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own feedback" ON public.user_feedback
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admin manage feedback" ON public.user_feedback
  FOR ALL
  USING (
    auth.role() = 'service_role' OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    auth.role() = 'service_role' OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

COMMIT;
