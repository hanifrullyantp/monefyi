-- Menutup akun demo "Masuk cepat". Tidak mengubah akun lain.
-- Kata sandi diganti nilai acak yang tidak disimpan di repo.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
SET search_path = public, extensions, auth;

UPDATE auth.users
SET
  encrypted_password = crypt(encode(extensions.gen_random_bytes(24), 'hex'), gen_salt('bf')),
  updated_at = now()
WHERE lower(email::text) = lower('planner-bypass@monefyi.app');
