-- Fix HR/member queries: PostgREST embed profiles + coworker name visibility.
-- Frontend uses planner_org_members.select('*, profiles(...)') and order by accepted_at.

-- Ensure profile rows exist for all org members / join requesters before FK.
INSERT INTO profiles (id, name)
SELECT u.id, coalesce(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1))
FROM auth.users u
WHERE (
  EXISTS (SELECT 1 FROM planner_org_members m WHERE m.user_id = u.id)
  OR EXISTS (SELECT 1 FROM planner_join_requests j WHERE j.user_id = u.id)
)
AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = u.id);

CREATE OR REPLACE FUNCTION public.planner_auth_coworker_user_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET row_security = off
SET search_path = public
AS $$
  SELECT DISTINCT m2.user_id
  FROM planner_org_members m1
  JOIN planner_org_members m2
    ON m2.org_id = m1.org_id
   AND m2.status = 'active'
  WHERE m1.user_id = auth.uid()
    AND m1.status = 'active';
$$;

REVOKE ALL ON FUNCTION public.planner_auth_coworker_user_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.planner_auth_coworker_user_ids() TO authenticated;

-- PostgREST relationship hints (user_id -> profiles.id)
ALTER TABLE planner_org_members
  DROP CONSTRAINT IF EXISTS planner_org_members_profile_fk;

ALTER TABLE planner_org_members
  ADD CONSTRAINT planner_org_members_profile_fk
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE planner_join_requests
  DROP CONSTRAINT IF EXISTS planner_join_requests_profile_fk;

ALTER TABLE planner_join_requests
  ADD CONSTRAINT planner_join_requests_profile_fk
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

DROP POLICY IF EXISTS profiles_coworkers_read ON profiles;
CREATE POLICY profiles_coworkers_read ON profiles
  FOR SELECT TO authenticated
  USING (id IN (SELECT public.planner_auth_coworker_user_ids()));
