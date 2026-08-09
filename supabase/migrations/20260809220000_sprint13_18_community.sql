-- Growth Sprint 13-18: Benchmark snapshots, achievements, referral/buddy, community
BEGIN;

CREATE TABLE IF NOT EXISTS public.user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_type text NOT NULL,
  title text,
  message text,
  metadata jsonb NOT NULL DEFAULT '{}',
  xp smallint NOT NULL DEFAULT 0,
  shown_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_type)
);

CREATE TABLE IF NOT EXISTS public.user_benchmark_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month text NOT NULL,
  income_bracket text NOT NULL,
  age_bracket text,
  location_tier text,
  saving_rate smallint NOT NULL DEFAULT 0,
  category_distribution_json jsonb NOT NULL DEFAULT '{}',
  debt_ratio numeric(6, 3) DEFAULT 0,
  emergency_fund_months numeric(6, 2) DEFAULT 0,
  financial_health_score smallint DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, month)
);

CREATE TABLE IF NOT EXISTS public.referral_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  link text NOT NULL,
  credits_total numeric(14, 2) NOT NULL DEFAULT 0,
  referral_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.referral_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_label text NOT NULL DEFAULT 'Anonymous',
  product_tier text NOT NULL DEFAULT 'basic',
  credit_amount numeric(14, 2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.buddy_pairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  buddy_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  buddy_label text NOT NULL,
  goal text NOT NULL DEFAULT 'emergency_fund',
  on_track_pct smallint NOT NULL DEFAULT 50,
  matched_at timestamptz NOT NULL DEFAULT now(),
  active boolean NOT NULL DEFAULT true,
  UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS public.buddy_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pair_id uuid NOT NULL REFERENCES public.buddy_pairs(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) <= 240),
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.community_challenge_participation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id text NOT NULL,
  title text NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  streak_days integer NOT NULL DEFAULT 0,
  last_checkin timestamptz,
  success_rate smallint NOT NULL DEFAULT 100,
  UNIQUE (user_id, challenge_id)
);

CREATE TABLE IF NOT EXISTS public.community_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL CHECK (char_length(title) <= 200),
  body text CHECK (char_length(body) <= 1000),
  is_anonymous boolean NOT NULL DEFAULT true,
  answer_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.community_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.community_questions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  body text NOT NULL CHECK (char_length(body) <= 800),
  is_expert boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON public.user_achievements (user_id, shown_at DESC);
CREATE INDEX IF NOT EXISTS idx_benchmark_snapshots_bracket ON public.user_benchmark_snapshots (income_bracket, month);
CREATE INDEX IF NOT EXISTS idx_referral_events_referrer ON public.referral_events (referrer_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_buddy_messages_pair ON public.buddy_messages (pair_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_questions_recent ON public.community_questions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_answers_question ON public.community_answers (question_id, created_at ASC);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_benchmark_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buddy_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buddy_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_challenge_participation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_achievements_self ON public.user_achievements;
CREATE POLICY user_achievements_self ON public.user_achievements
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS benchmark_snapshots_self ON public.user_benchmark_snapshots;
CREATE POLICY benchmark_snapshots_self ON public.user_benchmark_snapshots
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS referral_profiles_self ON public.referral_profiles;
CREATE POLICY referral_profiles_self ON public.referral_profiles
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS referral_events_self ON public.referral_events;
CREATE POLICY referral_events_self ON public.referral_events
  FOR ALL TO authenticated USING (referrer_user_id = auth.uid()) WITH CHECK (referrer_user_id = auth.uid());

DROP POLICY IF EXISTS buddy_pairs_self ON public.buddy_pairs;
CREATE POLICY buddy_pairs_self ON public.buddy_pairs
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS buddy_messages_pair ON public.buddy_messages;
CREATE POLICY buddy_messages_pair ON public.buddy_messages
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.buddy_pairs bp
      WHERE bp.id = pair_id AND bp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    sender_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.buddy_pairs bp
      WHERE bp.id = pair_id AND bp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS community_challenge_self ON public.community_challenge_participation;
CREATE POLICY community_challenge_self ON public.community_challenge_participation
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS community_questions_read ON public.community_questions;
CREATE POLICY community_questions_read ON public.community_questions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS community_questions_write ON public.community_questions;
CREATE POLICY community_questions_write ON public.community_questions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

DROP POLICY IF EXISTS community_answers_read ON public.community_answers;
CREATE POLICY community_answers_read ON public.community_answers
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS community_answers_write ON public.community_answers;
CREATE POLICY community_answers_write ON public.community_answers
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

COMMIT;
