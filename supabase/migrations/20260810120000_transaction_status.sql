-- Transaction lifecycle: draft / pending / confirmed / cancelled
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('draft', 'pending', 'confirmed', 'cancelled')),
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;

UPDATE transactions
SET status = 'confirmed',
    confirmed_at = COALESCE(confirmed_at, created_at, updated_at, now())
WHERE confirmed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_user_status
  ON transactions (user_id, status)
  WHERE status IN ('draft', 'pending');
