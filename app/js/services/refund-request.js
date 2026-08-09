/**
 * Refund request flow — user submission + eligibility validation.
 * @module services/refund-request
 */

const LS_PURCHASE = 'monefyi_purchase_record';
export const REFUND_WINDOW_DAYS = 7;

/**
 * @returns {import('@supabase/supabase-js').SupabaseClient|null}
 */
function supa() {
  return window.STATE?.db?.supa || window.__monefyiSupabase || null;
}

/**
 * @returns {string|null}
 */
function userId() {
  return window.STATE?.db?.user?.id || window.STATE?.user?.id || null;
}

/**
 * @param {object} [state]
 * @returns {{ planType: string, purchaseDate: string|null, reference: string|null, eligible: boolean, daysSincePurchase: number|null, reason?: string }}
 */
export function getPurchaseInfo(state = window.STATE || {}) {
  const profile = state.db?.profile || {};
  const planType = String(
    state.subscription?.planType || profile.plan_type || 'none',
  );

  let purchaseDate = state.subscription?.planPurchasedAt || null;
  let reference = null;

  try {
    const raw = localStorage.getItem(LS_PURCHASE);
    if (raw) {
      const rec = JSON.parse(raw);
      purchaseDate = rec.purchased_at || purchaseDate;
      reference = rec.reference || rec.order_id || null;
    }
  } catch { /* ignore */ }

  if (!purchaseDate && planType !== 'none' && planType !== 'trial') {
    purchaseDate = profile.updated_at || profile.created_at || null;
  }

  if (planType === 'none' || planType === 'trial') {
    return {
      planType,
      purchaseDate,
      reference,
      eligible: false,
      daysSincePurchase: null,
      reason: 'Tidak ada pembelian berbayar yang terdeteksi.',
    };
  }

  if (!purchaseDate) {
    return {
      planType,
      purchaseDate: null,
      reference,
      eligible: false,
      daysSincePurchase: null,
      reason: 'Tanggal pembelian tidak ditemukan — hubungi support.',
    };
  }

  const daysSince = Math.floor(
    (Date.now() - new Date(purchaseDate).getTime()) / 86400000,
  );
  const eligible = daysSince <= REFUND_WINDOW_DAYS;

  return {
    planType,
    purchaseDate,
    reference,
    eligible,
    daysSincePurchase: daysSince,
    reason: eligible
      ? undefined
      : `Refund hanya tersedia dalam ${REFUND_WINDOW_DAYS} hari setelah pembelian (${daysSince} hari lalu).`,
  };
}

/**
 * @param {string} reason
 * @param {object} [state]
 * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
 */
export async function submitRefundRequest(reason, state = window.STATE || {}) {
  const trimmed = String(reason || '').trim();
  if (trimmed.length < 10) {
    return { success: false, error: 'Alasan minimal 10 karakter.' };
  }

  const info = getPurchaseInfo(state);
  if (!info.eligible) {
    return { success: false, error: info.reason || 'Tidak eligible refund.' };
  }

  const uid = userId();
  const row = {
    user_id: uid,
    plan_type: info.planType,
    purchase_reference: info.reference,
    purchase_date: info.purchaseDate,
    reason: trimmed.slice(0, 1000),
    status: 'pending',
  };

  const client = supa();
  if (uid && client) {
    try {
      const { data: existing } = await client
        .from('refund_requests')
        .select('id, status')
        .eq('user_id', uid)
        .eq('status', 'pending')
        .maybeSingle();
      if (existing) {
        return { success: false, error: 'Kamu sudah punya permintaan refund yang menunggu review.' };
      }

      const { data, error } = await client
        .from('refund_requests')
        .insert(row)
        .select('*')
        .single();
      if (error) throw error;
      return { success: true, data };
    } catch (e) {
      console.error('[refund-request] submitRefundRequest', e);
      return { success: false, error: e.message || 'Gagal mengirim permintaan.' };
    }
  }

  const localKey = 'monefyi_refund_requests';
  try {
    const list = JSON.parse(localStorage.getItem(localKey) || '[]');
    if (list.some((r) => r.status === 'pending')) {
      return { success: false, error: 'Permintaan refund lokal sudah ada.' };
    }
    const localRow = { ...row, id: `local-${Date.now()}`, created_at: new Date().toISOString() };
    list.unshift(localRow);
    localStorage.setItem(localKey, JSON.stringify(list.slice(0, 20)));
    return { success: true, data: localRow };
  } catch (e) {
    return { success: false, error: e.message || 'Gagal menyimpan lokal.' };
  }
}

/**
 * @returns {Promise<object[]>}
 */
export async function listMyRefundRequests() {
  const uid = userId();
  const client = supa();
  if (uid && client) {
    try {
      const { data } = await client
        .from('refund_requests')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(10);
      return data || [];
    } catch (e) {
      console.warn('[refund-request] listMyRefundRequests', e);
    }
  }
  try {
    return JSON.parse(localStorage.getItem('monefyi_refund_requests') || '[]');
  } catch {
    return [];
  }
}

/**
 * Admin: list pending refund requests.
 * @param {object} [opts]
 * @returns {Promise<object[]>}
 */
export async function listRefundRequestsAdmin(opts = {}) {
  const client = supa();
  if (!client) return [];

  let q = client
    .from('refund_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(opts.limit || 50);

  if (opts.status && opts.status !== 'all') {
    q = q.eq('status', opts.status);
  }

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

/**
 * Admin: approve or reject refund.
 * @param {string} requestId
 * @param {'approved'|'rejected'} status
 * @param {string} [adminNotes]
 * @returns {Promise<void>}
 */
export async function processRefundRequest(requestId, status, adminNotes = '') {
  const client = supa();
  const uid = userId();
  if (!client || !requestId) throw new Error('Invalid params');

  const { error } = await client
    .from('refund_requests')
    .update({
      status,
      admin_notes: String(adminNotes || '').slice(0, 1000),
      processed_by: uid,
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId);
  if (error) throw error;
}

/**
 * Record purchase after checkout (call from app when plan activates).
 * @param {object} record
 */
export function recordPurchaseLocally(record = {}) {
  try {
    localStorage.setItem(LS_PURCHASE, JSON.stringify({
      plan_type: record.plan_type || record.planType,
      purchased_at: record.purchased_at || new Date().toISOString(),
      reference: record.reference || record.order_id || null,
    }));
  } catch { /* ignore */ }
}
