-- Monefyi Planner — Onboarding seed (1 owner + 2 managers + 5 workers)
-- Password for all test users: TestOnboard2026!
-- Requires: 20260531120000_planner_onboarding.sql applied

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
SET search_path = public, extensions, auth;

DO $onboard_seed$
DECLARE
  v_org_id uuid := 'b2222222-3333-4444-8555-666666666601'::uuid;
  v_owner_id uuid := 'b2222222-3333-4444-8555-666666666602'::uuid;
  mgr1_id uuid := 'b2222222-3333-4444-8555-666666666603'::uuid;
  mgr2_id uuid := 'b2222222-3333-4444-8555-666666666604'::uuid;
  w_ids uuid[] := ARRAY[
    'b2222222-3333-4444-8555-666666666605'::uuid,
    'b2222222-3333-4444-8555-666666666606'::uuid,
    'b2222222-3333-4444-8555-666666666607'::uuid,
    'b2222222-3333-4444-8555-666666666608'::uuid,
    'b2222222-3333-4444-8555-666666666609'::uuid
  ];
  emails text[] := ARRAY[
    'owner-onboard@test.monefyi.app',
    'mgr1-onboard@test.monefyi.app',
    'mgr2-onboard@test.monefyi.app',
    'worker1-onboard@test.monefyi.app',
    'worker2-onboard@test.monefyi.app',
    'worker3-onboard@test.monefyi.app',
    'worker4-onboard@test.monefyi.app',
    'worker5-onboard@test.monefyi.app'
  ];
  names text[] := ARRAY[
    'Owner Test', 'Manager Satu', 'Manager Dua',
    'Worker Satu', 'Worker Dua', 'Worker Tiga', 'Worker Empat', 'Worker Lima'
  ];
  roles text[] := ARRAY['owner','manager','manager','worker','worker','worker','worker','worker'];
  uids uuid[] := ARRAY[v_owner_id, mgr1_id, mgr2_id, w_ids[1], w_ids[2], w_ids[3], w_ids[4], w_ids[5]];
  i int;
  uid uuid;
BEGIN
  FOR i IN 1..8 LOOP
    uid := uids[i];
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = uid) THEN
      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
      ) VALUES (
        '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
        emails[i], crypt('TestOnboard2026!', gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('name', names[i]),
        now(), now(), '', '', '', ''
      );
    END IF;

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    SELECT gen_random_uuid(), uid, uid::text,
      jsonb_build_object('sub', uid::text, 'email', emails[i]),
      'email', now(), now(), now()
    WHERE NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = uid AND provider = 'email');

    INSERT INTO profiles (id, name, onboarding_completed)
    VALUES (uid, names[i], true)
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, onboarding_completed = true;
  END LOOP;

  INSERT INTO planner_organizations (
    id, name, slug, owner_id, industry, team_size, timezone,
    onboarding_completed, brand_color, is_public_discoverable, allow_join_request
  ) VALUES (
    v_org_id, 'PT Buana Onboard Test', 'buana-onboard-test', v_owner_id,
    'construction', '11-50', 'Asia/Jakarta', true, '#6366f1', true, true
  ) ON CONFLICT (id) DO NOTHING;

  FOR i IN 1..8 LOOP
    INSERT INTO planner_org_members (org_id, user_id, role, status, accepted_at)
    VALUES (v_org_id, uids[i], roles[i], 'active', now())
    ON CONFLICT (org_id, user_id) DO UPDATE SET role = EXCLUDED.role, status = 'active';
  END LOOP;
END;
$onboard_seed$;
