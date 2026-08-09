-- Refund manual gate: user can submit only after super_admin enables post-email confirmation.
-- Automatic Lynk refund remains disabled at app layer.
BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS refund_request_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS refund_enabled_at timestamptz,
  ADD COLUMN IF NOT EXISTS refund_enabled_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

DROP POLICY IF EXISTS refund_requests_insert ON public.refund_requests;
CREATE POLICY refund_requests_insert ON public.refund_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.refund_request_enabled = true
    )
  );

CREATE OR REPLACE FUNCTION public.grant_refund_request_access(
  p_user_id uuid,
  p_enabled boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE public.profiles
  SET
    refund_request_enabled = COALESCE(p_enabled, true),
    refund_enabled_at = CASE WHEN COALESCE(p_enabled, true) THEN now() ELSE NULL END,
    refund_enabled_by = CASE WHEN COALESCE(p_enabled, true) THEN auth.uid() ELSE NULL END
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_refund_request_access(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grant_refund_request_access(uuid, boolean) TO authenticated;

COMMIT;
