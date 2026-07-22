-- Migrate email import addresses from import.monefyi.com → support.monefyi.com
-- (same Resend domain used for auth confirmation / transactional from-address)

BEGIN;

CREATE OR REPLACE FUNCTION public.generate_import_address(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_short_id text;
  v_address text;
  v_caller uuid;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL OR v_caller <> p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  v_short_id := substr(replace(p_user_id::text, '-', ''), 1, 8);
  v_address := 'tx-' || v_short_id || '@support.monefyi.com';

  INSERT INTO public.email_import_config (user_id, import_address, is_active, updated_at)
  VALUES (p_user_id, v_address, true, now())
  ON CONFLICT (user_id) DO UPDATE
    SET updated_at = now(),
        is_active = true,
        import_address = EXCLUDED.import_address
  RETURNING import_address INTO v_address;

  RETURN v_address;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_import_address(uuid) TO authenticated;

-- Rewrite any already-provisioned import.* addresses
UPDATE public.email_import_config
SET
  import_address = replace(import_address, '@import.monefyi.com', '@support.monefyi.com'),
  updated_at = now()
WHERE import_address ILIKE '%@import.monefyi.com';

COMMIT;
