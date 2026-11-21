-- Allow authenticated organization members to insert audit logs for their active organization.
-- Existing SELECT policy (planner_audit_logs_owner) remains owner-only.
-- Note: public.planner_audit_logs uses user_id (not actor_id) per 20260531120000_planner_onboarding.sql.

DROP POLICY IF EXISTS planner_audit_logs_insert ON public.planner_audit_logs;
CREATE POLICY planner_audit_logs_insert ON public.planner_audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    org_id IN (SELECT public.planner_auth_org_ids())
    AND (user_id IS NULL OR user_id = auth.uid())
  );
