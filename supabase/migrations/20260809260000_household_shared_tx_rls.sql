-- RLS: household members can read shared transactions from same household
BEGIN;

DO $pol$ BEGIN
  CREATE POLICY transactions_select_household_shared ON public.transactions
    FOR SELECT
    USING (
      visibility = 'shared'
      AND household_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.household_members hm
        WHERE hm.household_id = transactions.household_id
          AND hm.user_id = auth.uid()
          AND hm.status = 'active'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;

COMMIT;
