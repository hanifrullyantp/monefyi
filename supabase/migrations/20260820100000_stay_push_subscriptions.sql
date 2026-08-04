-- STAY Web Push subscriptions (VAPID phase 2)

CREATE TABLE IF NOT EXISTS stay_push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES stay_tenants(id) ON DELETE CASCADE,
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (auth_user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_stay_push_subs_tenant ON stay_push_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stay_push_subs_user ON stay_push_subscriptions(auth_user_id);

ALTER TABLE stay_push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY stay_push_subs_select ON stay_push_subscriptions
  FOR SELECT USING (
    auth_user_id = auth.uid()
    AND tenant_id = stay_current_tenant_id()
  );

CREATE POLICY stay_push_subs_insert ON stay_push_subscriptions
  FOR INSERT WITH CHECK (
    auth_user_id = auth.uid()
    AND tenant_id = stay_current_tenant_id()
  );

CREATE POLICY stay_push_subs_update ON stay_push_subscriptions
  FOR UPDATE USING (
    auth_user_id = auth.uid()
    AND tenant_id = stay_current_tenant_id()
  );

CREATE POLICY stay_push_subs_delete ON stay_push_subscriptions
  FOR DELETE USING (
    auth_user_id = auth.uid()
    AND tenant_id = stay_current_tenant_id()
  );

COMMENT ON TABLE stay_push_subscriptions IS 'Web Push endpoints per STAY staff user (VAPID)';
