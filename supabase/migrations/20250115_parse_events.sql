-- ============================================================
-- Migration: parse_events table
-- Purpose:   Track all parse attempts for metrics & L1 learning
-- Created:   2025-01-15
-- Idempotent: yes (CREATE ... IF NOT EXISTS throughout)
-- ============================================================

BEGIN;

-- ============================================================
-- 1. TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS parse_events (
  id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  user_id         uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id      text,

  -- Input
  raw_input       text         NOT NULL,
  input_channel   text         NOT NULL DEFAULT 'text'
                               CHECK (input_channel IN ('text', 'voice', 'ocr', 'whatsapp', 'manual')),

  -- Processing
  parser_layer    text         NOT NULL
                               CHECK (parser_layer IN ('memory', 'rule', 'fuzzy', 'ai', 'manual', 'error')),
  confidence      numeric(4,3) CHECK (confidence BETWEEN 0 AND 1),

  -- Output
  parsed_json     jsonb        NOT NULL,          -- result from the winning parser layer
  final_json      jsonb,                          -- NULL if user cancelled without saving
  edited_fields   text[],                         -- field names the user changed before saving

  -- Performance
  latency_ms      int,
  ai_tokens       int          NOT NULL DEFAULT 0,

  -- Flags  (e.g. 'ambiguous_amount', 'fuzzy_match', 'fallback_legacy')
  flags           text[],

  -- Temporal
  created_at      timestamptz  NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. INDEXES
-- ============================================================

-- Primary analytics query: all events for a user over time
CREATE INDEX IF NOT EXISTS idx_parse_events_user_time
  ON parse_events (user_id, created_at DESC);

-- Layer distribution metrics
CREATE INDEX IF NOT EXISTS idx_parse_events_layer
  ON parse_events (parser_layer, created_at DESC);

-- Confidence histogram / low-confidence audit
CREATE INDEX IF NOT EXISTS idx_parse_events_confidence
  ON parse_events (confidence DESC NULLS LAST);

-- ============================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE parse_events ENABLE ROW LEVEL SECURITY;

-- Users may write their own events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'parse_events'
      AND policyname = 'Users can insert own events'
  ) THEN
    CREATE POLICY "Users can insert own events"
      ON parse_events
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Users may read their own events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'parse_events'
      AND policyname = 'Users can view own events'
  ) THEN
    CREATE POLICY "Users can view own events"
      ON parse_events
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Service role may read all events (analytics / admin dashboard)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'parse_events'
      AND policyname = 'Service role can view all'
  ) THEN
    CREATE POLICY "Service role can view all"
      ON parse_events
      FOR SELECT
      USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ============================================================
-- 4. CLEANUP FUNCTION  (90-day retention)
-- ============================================================

CREATE OR REPLACE FUNCTION cleanup_old_parse_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count int;
BEGIN
  DELETE FROM parse_events
  WHERE created_at < now() - interval '90 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RAISE NOTICE '[cleanup_old_parse_events] deleted % row(s) older than 90 days', deleted_count;
END;
$$;

-- To schedule via pg_cron (run once per day at 02:00 UTC):
-- SELECT cron.schedule(
--   'cleanup-parse-events',
--   '0 2 * * *',
--   'SELECT cleanup_old_parse_events()'
-- );

-- ============================================================
-- 5. VERIFICATION
-- ============================================================

DO $$
DECLARE
  tbl_exists   bool;
  idx_count    int;
  pol_count    int;
  fn_exists    bool;
BEGIN
  -- Check table
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name   = 'parse_events'
  ) INTO tbl_exists;

  -- Check indexes
  SELECT count(*) FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename  = 'parse_events'
    AND indexname IN (
      'idx_parse_events_user_time',
      'idx_parse_events_layer',
      'idx_parse_events_confidence'
    )
  INTO idx_count;

  -- Check RLS policies
  SELECT count(*) FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename  = 'parse_events'
    AND policyname IN (
      'Users can insert own events',
      'Users can view own events',
      'Service role can view all'
    )
  INTO pol_count;

  -- Check cleanup function
  SELECT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'cleanup_old_parse_events'
  ) INTO fn_exists;

  -- Fail fast if anything is missing
  IF NOT tbl_exists THEN
    RAISE EXCEPTION '[20250115_parse_events] FAILED: table parse_events not found';
  END IF;

  IF idx_count < 3 THEN
    RAISE EXCEPTION '[20250115_parse_events] FAILED: expected 3 indexes, found %', idx_count;
  END IF;

  IF pol_count < 3 THEN
    RAISE EXCEPTION '[20250115_parse_events] FAILED: expected 3 RLS policies, found %', pol_count;
  END IF;

  IF NOT fn_exists THEN
    RAISE EXCEPTION '[20250115_parse_events] FAILED: cleanup_old_parse_events() not found';
  END IF;

  RAISE NOTICE '[20250115_parse_events] OK — table, % indexes, % RLS policies, cleanup function all verified',
    idx_count, pol_count;
END $$;

COMMIT;
