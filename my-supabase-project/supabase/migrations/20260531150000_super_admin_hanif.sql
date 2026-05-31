-- Super admin: hanif.rullyant@gmail.com — password & full platform access
-- Jalankan di Supabase SQL Editor setelah migrasi onboarding/platform_admin.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $hanif_admin$
DECLARE
  uid uuid;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE lower(email) = lower('hanif.rullyant@gmail.com');

  IF uid IS NULL THEN
    uid := 'a1111111-2222-4333-8444-555555555502'::uuid;
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, last_sign_in_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
      'hanif.rullyant@gmail.com',
      crypt('@Rullyant93', gen_salt('bf')),
      now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Hanif Admin","signup_intent":"create_org"}'::jsonb,
      now(), now(), '', '', '', ''
    );
  ELSE
    UPDATE auth.users SET
      encrypted_password = crypt('@Rullyant93', gen_salt('bf')),
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      updated_at = now()
    WHERE id = uid;
  END IF;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  SELECT gen_random_uuid(), uid, uid::text,
    jsonb_build_object('sub', uid::text, 'email', 'hanif.rullyant@gmail.com'),
    'email', now(), now(), now()
  WHERE NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = uid AND provider = 'email');

  INSERT INTO profiles (id, name, role, status, onboarding_completed, plan_type, email_notifications, push_notifications)
  VALUES (uid, 'Hanif Admin', 'admin', 'active', true, 'lifetime', true, true)
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    role = 'admin',
    status = 'active',
    onboarding_completed = true,
    plan_type = 'lifetime',
    updated_at = now();

  INSERT INTO user_plans (user_id, plan_type, ai_daily_limit, expires_at, updated_at)
  VALUES (uid, 'lifetime', 999, null, now())
  ON CONFLICT (user_id) DO UPDATE SET
    plan_type = 'lifetime',
    ai_daily_limit = 999,
    expires_at = null,
    updated_at = now();
END $hanif_admin$;
