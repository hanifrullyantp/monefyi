-- Household shared transactions visibility (Feature 1 extension)
BEGIN;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS household_id uuid REFERENCES public.households(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'personal'
    CHECK (visibility IN ('personal', 'shared'));

CREATE INDEX IF NOT EXISTS idx_transactions_household_visibility
  ON public.transactions (household_id, visibility)
  WHERE household_id IS NOT NULL;

COMMIT;
