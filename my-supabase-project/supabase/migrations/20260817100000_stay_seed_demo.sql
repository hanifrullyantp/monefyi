-- STAY demo tenant, auth users, and sample inventory
-- Demo login: owner@stay.com / StayDemo2026!

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
SET search_path = public, extensions, auth;

DO $stay_seed$
DECLARE
  v_tenant_id uuid := 'b1111111-2222-4333-8444-555555555501'::uuid;
  demo_pwd  text := 'StayDemo2026!';
BEGIN
  INSERT INTO stay_tenants (id, name, slug, address, phone, email, tax_percent, service_charge_percent)
  VALUES (
    v_tenant_id,
    'Demo Villa STAY',
    'demo-villa-stay',
    'Jl. Contoh No. 1, Bandung',
    '081234567890',
    'owner@stay.com',
    10,
    5
  )
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email;

  -- owner@stay.com
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE lower(email::text) = 'owner@stay.com') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      'b1111111-2222-4333-8444-555555555502'::uuid,
      'authenticated', 'authenticated', 'owner@stay.com',
      crypt(demo_pwd, gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Owner Demo"}'::jsonb, now(), now(), '', '', '', ''
    );
  ELSE
    UPDATE auth.users SET encrypted_password = crypt(demo_pwd, gen_salt('bf')), email_confirmed_at = coalesce(email_confirmed_at, now()) WHERE lower(email::text) = 'owner@stay.com';
  END IF;

  -- manager@stay.com
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE lower(email::text) = 'manager@stay.com') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      'b1111111-2222-4333-8444-555555555503'::uuid,
      'authenticated', 'authenticated', 'manager@stay.com',
      crypt(demo_pwd, gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Manager Demo"}'::jsonb, now(), now(), '', '', '', ''
    );
  ELSE
    UPDATE auth.users SET encrypted_password = crypt(demo_pwd, gen_salt('bf')), email_confirmed_at = coalesce(email_confirmed_at, now()) WHERE lower(email::text) = 'manager@stay.com';
  END IF;

  -- receptionist@stay.com
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE lower(email::text) = 'receptionist@stay.com') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      'b1111111-2222-4333-8444-555555555504'::uuid,
      'authenticated', 'authenticated', 'receptionist@stay.com',
      crypt(demo_pwd, gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Resepsionis Demo"}'::jsonb, now(), now(), '', '', '', ''
    );
  ELSE
    UPDATE auth.users SET encrypted_password = crypt(demo_pwd, gen_salt('bf')), email_confirmed_at = coalesce(email_confirmed_at, now()) WHERE lower(email::text) = 'receptionist@stay.com';
  END IF;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  SELECT gen_random_uuid(), u.id, u.id::text,
    jsonb_build_object('sub', u.id::text, 'email', u.email),
    'email', now(), now(), now()
  FROM auth.users u
  WHERE lower(u.email::text) IN ('owner@stay.com', 'manager@stay.com', 'receptionist@stay.com')
    AND NOT EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id = u.id AND i.provider = 'email');

  INSERT INTO stay_users (id, auth_user_id, tenant_id, name, email, role, is_active)
  VALUES
    ('b1111111-2222-4333-8444-555555555521'::uuid, 'b1111111-2222-4333-8444-555555555502'::uuid, v_tenant_id, 'Owner Demo', 'owner@stay.com', 'owner', true),
    ('b1111111-2222-4333-8444-555555555522'::uuid, 'b1111111-2222-4333-8444-555555555503'::uuid, v_tenant_id, 'Manager Demo', 'manager@stay.com', 'manager', true),
    ('b1111111-2222-4333-8444-555555555523'::uuid, 'b1111111-2222-4333-8444-555555555504'::uuid, v_tenant_id, 'Resepsionis Demo', 'receptionist@stay.com', 'receptionist', true)
  ON CONFLICT (tenant_id, email) DO UPDATE SET
    auth_user_id = EXCLUDED.auth_user_id,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    is_active = true;

  INSERT INTO stay_room_types (id, tenant_id, name, description, base_price, capacity, bed_type, size, facilities)
  VALUES
    ('b1111111-2222-4333-8444-555555555511'::uuid, v_tenant_id, 'Standard', 'Kamar standar nyaman', 350000, 2, 'Queen', 24, '["AC","TV","WiFi"]'::jsonb),
    ('b1111111-2222-4333-8444-555555555512'::uuid, v_tenant_id, 'Deluxe', 'Kamar deluxe dengan balkon', 550000, 2, 'King', 32, '["AC","TV","WiFi","Bathtub"]'::jsonb)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO stay_rooms (id, tenant_id, room_type_id, number, floor, status, is_active)
  VALUES
    ('b1111111-2222-4333-8444-555555555531'::uuid, v_tenant_id, 'b1111111-2222-4333-8444-555555555511'::uuid, '101', 1, 'available', true),
    ('b1111111-2222-4333-8444-555555555532'::uuid, v_tenant_id, 'b1111111-2222-4333-8444-555555555511'::uuid, '102', 1, 'available', true),
    ('b1111111-2222-4333-8444-555555555533'::uuid, v_tenant_id, 'b1111111-2222-4333-8444-555555555512'::uuid, '201', 2, 'available', true),
    ('b1111111-2222-4333-8444-555555555534'::uuid, v_tenant_id, 'b1111111-2222-4333-8444-555555555512'::uuid, '202', 2, 'maintenance', true)
  ON CONFLICT (tenant_id, number) DO NOTHING;

  INSERT INTO stay_pricing_rules (id, tenant_id, name, rule_type, adjustment, is_active)
  VALUES
    ('b1111111-2222-4333-8444-555555555541'::uuid, v_tenant_id, 'Weekend Premium', 'weekend', 15, true),
    ('b1111111-2222-4333-8444-555555555542'::uuid, v_tenant_id, 'Early Bird', 'early_bird', -8, true)
  ON CONFLICT (id) DO NOTHING;
END;
$stay_seed$;
