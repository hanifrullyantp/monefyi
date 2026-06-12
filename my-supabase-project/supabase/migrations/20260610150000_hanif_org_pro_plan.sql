-- Set organisasi milik hanif.rullyant@gmail.com ke paket Pro (Planner)

UPDATE planner_organizations o
SET
  plan_type = 'pro',
  updated_at = now()
FROM planner_org_members m
JOIN auth.users u ON u.id = m.user_id
WHERE m.org_id = o.id
  AND lower(u.email) = lower('hanif.rullyant@gmail.com')
  AND m.role IN ('owner', 'admin');
