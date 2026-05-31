-- Monefyi Planner — seed / repair email+password auth users (GoTrue).
-- Fixes common 400 on /token when auth.users exists without auth.identities (email).
--
-- After apply: use "Masuk cepat" in the app (planner-bypass@monefyi.app) or
-- hanif.rullyant@gmail.com / 88888888 — then rotate passwords in Dashboard.
--
-- Requires: pgcrypto (enabled by default on Supabase).

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
SET search_path = public, extensions, auth;

DO $planner_seed_auth$
DECLARE
  demo_uid   uuid := 'a1111111-2222-4333-8444-555555555501'::uuid;
  hanif_uid  uuid := 'a1111111-2222-4333-8444-555555555502'::uuid;
BEGIN
  -- Demo account (matches planner/js/config.js bypassEmail / bypassPassword)
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE lower(email::text) = lower('planner-bypass@monefyi.app')) THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      demo_uid,
      'authenticated',
      'authenticated',
      'planner-bypass@monefyi.app',
      crypt('PlannerBypass2026!', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Demo Planner"}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
  ELSE
    UPDATE auth.users SET
      encrypted_password = crypt('PlannerBypass2026!', gen_salt('bf')),
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      updated_at = now()
    WHERE lower(email::text) = lower('planner-bypass@monefyi.app');
  END IF;

  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  SELECT
    gen_random_uuid(),
    u.id,
    u.id::text,
    jsonb_build_object('sub', u.id::text, 'email', u.email),
    'email',
    now(),
    now(),
    now()
  FROM auth.users u
  WHERE lower(u.email::text) = lower('planner-bypass@monefyi.app')
    AND NOT EXISTS (
      SELECT 1 FROM auth.identities i
      WHERE i.user_id = u.id AND i.provider = 'email'
    );

  -- Admin / primary account (requested initial password; rotate after login)
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE lower(email::text) = lower('hanif.rullyant@gmail.com')) THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      hanif_uid,
      'authenticated',
      'authenticated',
      'hanif.rullyant@gmail.com',
      crypt('88888888', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Hanif Admin","org_name":"Intero"}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
  ELSE
    UPDATE auth.users SET
      encrypted_password = crypt('88888888', gen_salt('bf')),
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      updated_at = now()
    WHERE lower(email::text) = lower('hanif.rullyant@gmail.com');
  END IF;

  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  SELECT
    gen_random_uuid(),
    u.id,
    u.id::text,
    jsonb_build_object('sub', u.id::text, 'email', u.email),
    'email',
    now(),
    now(),
    now()
  FROM auth.users u
  WHERE lower(u.email::text) = lower('hanif.rullyant@gmail.com')
    AND NOT EXISTS (
      SELECT 1 FROM auth.identities i
      WHERE i.user_id = u.id AND i.provider = 'email'
    );
END $planner_seed_auth$;
