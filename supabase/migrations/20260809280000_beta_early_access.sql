-- Beta early_access flag on profiles (launch checklist §7)
BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS early_access boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS early_access_at timestamptz,
  ADD COLUMN IF NOT EXISTS early_access_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_early_access ON public.profiles (early_access) WHERE early_access = true;

COMMIT;
