-- ============================================================
-- OCR Self-Learning System
-- Date: 2025-01-20
-- Purpose: Crowdsourced receipt template learning
-- Idempotent: yes (DROP POLICY IF EXISTS / CREATE TABLE IF NOT EXISTS)
-- ============================================================

BEGIN;

-- ============================================================
-- 1. receipt_templates (Personal + Community)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.receipt_templates (
  id                  uuid         PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership (NULL = community-owned)
  user_id             uuid         REFERENCES auth.users(id) ON DELETE CASCADE,
  is_community        boolean      NOT NULL DEFAULT false,
  promoted_at         timestamptz,

  -- Pattern recognition
  template_signature  text         NOT NULL,
  merchant_name       text,
  merchant_category   text,

  -- Layout fingerprint (spatial features as jsonb)
  layout_features     jsonb        NOT NULL,

  -- Field extraction rules
  field_rules         jsonb        NOT NULL,

  -- Performance metrics
  use_count           int          NOT NULL DEFAULT 0,
  success_count       int          NOT NULL DEFAULT 0,
  edit_count          int          NOT NULL DEFAULT 0,

  -- Accuracy scoring
  accuracy_score      numeric(4,3) NOT NULL DEFAULT 0.500,
  community_score     numeric(4,3) NOT NULL DEFAULT 0.000,

  -- Versioning
  version             int          NOT NULL DEFAULT 1,
  parent_template_id  uuid         REFERENCES public.receipt_templates(id),

  -- Temporal
  created_at          timestamptz  NOT NULL DEFAULT now(),
  updated_at          timestamptz  NOT NULL DEFAULT now(),
  last_used_at        timestamptz,

  -- Constraints
  CONSTRAINT unique_user_signature        UNIQUE (user_id, template_signature),
  CONSTRAINT valid_accuracy               CHECK (accuracy_score BETWEEN 0 AND 1),
  CONSTRAINT valid_community_score        CHECK (community_score BETWEEN 0 AND 1),
  CONSTRAINT community_no_owner           CHECK (
    (is_community = true  AND user_id IS NULL) OR
    (is_community = false AND user_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_templates_user_use
  ON public.receipt_templates (user_id, use_count DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_templates_community_score
  ON public.receipt_templates (community_score DESC, use_count DESC)
  WHERE is_community = true;

CREATE INDEX IF NOT EXISTS idx_templates_signature
  ON public.receipt_templates USING hash (template_signature);

CREATE INDEX IF NOT EXISTS idx_templates_merchant
  ON public.receipt_templates (merchant_name, accuracy_score DESC)
  WHERE merchant_name IS NOT NULL;

-- ============================================================
-- 2. receipt_template_votes (Quality Control)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.receipt_template_votes (
  id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id     uuid         NOT NULL REFERENCES public.receipt_templates(id) ON DELETE CASCADE,
  user_id         uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  vote_type       text         NOT NULL CHECK (vote_type IN ('confirm', 'edit', 'reject')),
  edited_fields   text[],
  confidence_user numeric(4,3) CHECK (confidence_user BETWEEN 0 AND 1),

  created_at      timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT unique_template_user_vote UNIQUE (template_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_votes_template
  ON public.receipt_template_votes (template_id, created_at DESC);

-- ============================================================
-- 3. receipt_scans (Activity Log - no images stored)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.receipt_scans (
  id                  uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Image identity (hash only, never the actual image)
  image_hash          text         NOT NULL,
  image_size_bytes    int,

  -- OCR result
  raw_text            text,
  ocr_confidence      numeric(4,3),

  -- Template used
  template_id         uuid         REFERENCES public.receipt_templates(id) ON DELETE SET NULL,
  template_match_type text         CHECK (template_match_type IN (
    'user_memory', 'community', 'generic', 'manual', 'error'
  )),

  -- Result
  parsed_json         jsonb        NOT NULL,
  final_json          jsonb,                    -- NULL if user cancelled
  edited_fields       text[],

  -- Performance
  ocr_latency_ms      int,
  parse_latency_ms    int,

  created_at          timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scans_user_time
  ON public.receipt_scans (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_scans_template
  ON public.receipt_scans (template_id, created_at DESC)
  WHERE template_id IS NOT NULL;

-- ============================================================
-- 4. Row Level Security
-- ============================================================
ALTER TABLE public.receipt_templates       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_template_votes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_scans           ENABLE ROW LEVEL SECURITY;

-- receipt_templates: users own theirs + everyone reads community
DROP POLICY IF EXISTS "Users manage own templates"              ON public.receipt_templates;
CREATE POLICY "Users manage own templates"
  ON public.receipt_templates FOR ALL
  USING   (auth.uid() = user_id OR is_community = true)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "All authenticated can read community"   ON public.receipt_templates;
CREATE POLICY "All authenticated can read community"
  ON public.receipt_templates FOR SELECT
  USING (is_community = true OR auth.uid() = user_id);

-- receipt_template_votes: users manage own votes
DROP POLICY IF EXISTS "Users vote on templates"                ON public.receipt_template_votes;
CREATE POLICY "Users vote on templates"
  ON public.receipt_template_votes FOR ALL
  USING   (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- receipt_scans: users see only their own scans
DROP POLICY IF EXISTS "Users see own scans"                    ON public.receipt_scans;
CREATE POLICY "Users see own scans"
  ON public.receipt_scans FOR ALL
  USING   (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 5. Helper Functions
-- ============================================================

-- Increment success counter (called after user confirms without edits)
CREATE OR REPLACE FUNCTION public.increment_template_success(p_template_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.receipt_templates
  SET
    success_count  = success_count + 1,
    use_count      = use_count + 1,
    accuracy_score = LEAST(1.0, accuracy_score + 0.01),
    last_used_at   = now(),
    updated_at     = now()
  WHERE id = p_template_id;
END;
$$;

-- Increment edit counter (called when user corrects parsed fields)
CREATE OR REPLACE FUNCTION public.increment_template_edit(p_template_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.receipt_templates
  SET
    edit_count     = edit_count + 1,
    use_count      = use_count + 1,
    accuracy_score = GREATEST(0.0, accuracy_score - 0.02),
    last_used_at   = now(),
    updated_at     = now()
  WHERE id = p_template_id;
END;
$$;

-- Promote personal template to community after 10+ successes (≥90% accuracy, <10% edit rate)
CREATE OR REPLACE FUNCTION public.promote_template_to_community(p_template_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_eligible          boolean;
  v_user_id           uuid;
  v_signature         text;
  v_existing_community uuid;
BEGIN
  SELECT user_id, template_signature
  INTO   v_user_id, v_signature
  FROM   public.receipt_templates
  WHERE  id = p_template_id;

  SELECT (
    success_count >= 10
    AND accuracy_score >= 0.90
    AND is_community = false
    AND (edit_count::float / NULLIF(use_count, 0)) < 0.10
  ) INTO v_eligible
  FROM public.receipt_templates
  WHERE id = p_template_id;

  IF NOT v_eligible THEN
    RETURN false;
  END IF;

  -- Avoid duplicates: link to existing community template instead of cloning
  SELECT id INTO v_existing_community
  FROM   public.receipt_templates
  WHERE  template_signature = v_signature
    AND  is_community = true
  LIMIT  1;

  IF v_existing_community IS NOT NULL THEN
    UPDATE public.receipt_templates
    SET    parent_template_id = v_existing_community
    WHERE  id = p_template_id;
    RETURN false;
  END IF;

  INSERT INTO public.receipt_templates (
    user_id, is_community, template_signature, merchant_name,
    merchant_category, layout_features, field_rules,
    use_count, success_count, edit_count,
    accuracy_score, community_score, version, parent_template_id,
    promoted_at
  )
  SELECT
    NULL, true, template_signature, merchant_name,
    merchant_category, layout_features, field_rules,
    use_count, success_count, edit_count,
    accuracy_score, accuracy_score, version, id,
    now()
  FROM public.receipt_templates
  WHERE id = p_template_id;

  RETURN true;
END;
$$;

-- Recalculate community score from votes
CREATE OR REPLACE FUNCTION public.recalc_community_score(p_template_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_confirms int;
  v_edits    int;
  v_total    int;
  v_score    numeric(4,3);
BEGIN
  SELECT
    COUNT(*) FILTER (WHERE vote_type = 'confirm'),
    COUNT(*) FILTER (WHERE vote_type = 'edit'),
    COUNT(*)
  INTO v_confirms, v_edits, v_total
  FROM public.receipt_template_votes
  WHERE template_id = p_template_id;

  IF v_total = 0 THEN
    RETURN;
  END IF;

  v_score := LEAST(1.0,
    (v_confirms::numeric / v_total) - (v_edits::numeric * 0.05 / v_total)
  );

  UPDATE public.receipt_templates
  SET community_score = GREATEST(0.0, v_score)
  WHERE id = p_template_id;
END;
$$;

-- ============================================================
-- 6. Verification
-- ============================================================
DO $$
DECLARE
  v_tables_count    int;
  v_functions_count int;
BEGIN
  SELECT COUNT(*) INTO v_tables_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'receipt_templates',
      'receipt_template_votes',
      'receipt_scans'
    );

  SELECT COUNT(*) INTO v_functions_count
  FROM pg_proc
  WHERE proname IN (
    'increment_template_success',
    'increment_template_edit',
    'promote_template_to_community',
    'recalc_community_score'
  );

  IF v_tables_count != 3 THEN
    RAISE EXCEPTION '[20250120_ocr_templates] FAILED: expected 3 tables, got %', v_tables_count;
  END IF;

  IF v_functions_count != 4 THEN
    RAISE EXCEPTION '[20250120_ocr_templates] FAILED: expected 4 functions, got %', v_functions_count;
  END IF;

  RAISE NOTICE '✅ OCR Templates migration completed successfully';
  RAISE NOTICE '   Tables:    3 (receipt_templates, receipt_template_votes, receipt_scans)';
  RAISE NOTICE '   Functions: 4 (increment_success, increment_edit, promote, recalc_score)';
  RAISE NOTICE '   RLS:       enabled on all 3 tables';
END $$;

COMMIT;
