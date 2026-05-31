-- Ensure platform super admins (profiles.role = admin) have planner org membership
-- so they can use the full Planner app (HR, projects, finance, etc.).

SET search_path = public, auth;

DO $super_admin_org$
DECLARE
  admin_uid uuid;
  v_org_id uuid;
  v_slug text;
BEGIN
  FOR admin_uid IN
    SELECT id FROM profiles WHERE lower(role) = 'admin'
  LOOP
    IF EXISTS (
      SELECT 1 FROM planner_org_members
      WHERE user_id = admin_uid AND status = 'active'
    ) THEN
      CONTINUE;
    END IF;

    v_org_id := gen_random_uuid();
    v_slug := 'platform-admin-' || replace(substr(admin_uid::text, 1, 8), '-', '');

    INSERT INTO planner_organizations (
      id, name, slug, owner_id, industry, team_size, timezone,
      onboarding_completed, brand_color, is_public_discoverable, allow_join_request
    ) VALUES (
      v_org_id,
      'Platform Admin Workspace',
      v_slug,
      admin_uid,
      'service',
      '1-10',
      'Asia/Jakarta',
      true,
      '#6366f1',
      false,
      false
    );

    INSERT INTO planner_org_members (org_id, user_id, role, status, accepted_at)
    VALUES (v_org_id, admin_uid, 'owner', 'active', now())
    ON CONFLICT (org_id, user_id) DO UPDATE SET
      role = 'owner',
      status = 'active',
      accepted_at = coalesce(planner_org_members.accepted_at, now());

    UPDATE profiles
    SET onboarding_completed = true, updated_at = now()
    WHERE id = admin_uid;
  END LOOP;
END $super_admin_org$;
