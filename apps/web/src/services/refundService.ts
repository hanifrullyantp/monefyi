import { supabase } from '../lib/supabase';

export const REFUND_WINDOW_DAYS = 7;

export type RefundRequestRow = {
  id: string;
  user_id: string;
  plan_type: string;
  purchase_reference: string | null;
  purchase_date: string | null;
  reason: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
};

export async function submitPlannerRefundRequest(reason: string): Promise<{ success: boolean; message?: string; error?: string }> {
  const { data, error } = await supabase.functions.invoke('planner-refund-request', {
    body: { reason: reason.trim() },
  });
  if (error) {
    return { success: false, error: error.message };
  }
  if (data?.error) {
    return { success: false, error: String(data.error) };
  }
  return { success: true, message: String(data?.message || 'Permintaan refund diterima.') };
}

export async function listRefundRequestsAdmin(): Promise<RefundRequestRow[]> {
  const { data, error } = await supabase
    .from('refund_requests')
    .select('id, user_id, plan_type, purchase_reference, purchase_date, reason, status, admin_notes, created_at')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data || []) as RefundRequestRow[];
}
