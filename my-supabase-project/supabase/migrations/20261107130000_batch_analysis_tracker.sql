-- ============================================================================
-- MONEFYI WINNING ENGINE: BATCH ANALYSIS TRACKER
-- Mendukung pemrosesan asinkron Sonnet 5.5 Batch & status real-time multi-device
-- ============================================================================

ALTER TABLE public.winning_engine_config
ADD COLUMN IF NOT EXISTS batch_job_id text,
ADD COLUMN IF NOT EXISTS batch_status text NOT NULL DEFAULT 'idle',
ADD COLUMN IF NOT EXISTS batch_model text,
ADD COLUMN IF NOT EXISTS batch_started_at timestamptz,
ADD COLUMN IF NOT EXISTS batch_completed_at timestamptz,
ADD COLUMN IF NOT EXISTS batch_diagnostics_snapshot jsonb,
ADD COLUMN IF NOT EXISTS last_executive_brief text,
ADD COLUMN IF NOT EXISTS last_pillars jsonb,
ADD COLUMN IF NOT EXISTS last_plans jsonb;

-- Update row default agar memiliki status awal idle jika belum ada
UPDATE public.winning_engine_config
SET batch_status = COALESCE(batch_status, 'idle')
WHERE id = 'default';

