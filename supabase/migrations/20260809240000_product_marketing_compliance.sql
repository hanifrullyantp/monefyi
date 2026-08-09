-- Product-Marketing Sync — account deletion + refund requests (Features 6 & 7)
BEGIN;

CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'cancelled', 'completed')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  scheduled_hard_delete_at timestamptz NOT NULL,
  cancelled_at timestamptz,
  completed_at timestamptz,
  reason text CHECK (char_length(reason) <= 500),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_account_deletion_scheduled
  ON public.account_deletion_requests (scheduled_hard_delete_at)
  WHERE status = 'pending';

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS account_deletion_self ON public.account_deletion_requests;
CREATE POLICY account_deletion_self ON public.account_deletion_requests
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.refund_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type text NOT NULL,
  purchase_reference text,
  purchase_date timestamptz,
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 10 AND 1000),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  admin_notes text CHECK (char_length(admin_notes) <= 1000),
  processed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refund_requests_status
  ON public.refund_requests (status, created_at DESC);

ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS refund_requests_self ON public.refund_requests;
CREATE POLICY refund_requests_self ON public.refund_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS refund_requests_insert ON public.refund_requests;
CREATE POLICY refund_requests_insert ON public.refund_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS refund_requests_admin ON public.refund_requests;
CREATE POLICY refund_requests_admin ON public.refund_requests
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  );

COMMIT;
