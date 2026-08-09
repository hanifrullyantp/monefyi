/**
 * Self-service account deletion — soft delete with 30-day recovery window.
 * @module services/account-deletion
 */

import { notifyCompliance } from './compliance-client.js';

const LS_KEY = 'monefyi_account_deletion';
export const DELETION_CONFIRM_PHRASE = 'HAPUS AKUN SAYA';
export const RECOVERY_DAYS = 30;

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
 * @param {number} [days]
 * @returns {string}
 */
export function computeHardDeleteAt(days = RECOVERY_DAYS) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

/**
 * @param {string|null|undefined} iso
 * @returns {number}
 */
export function daysUntilHardDelete(iso) {
  if (!iso) return 0;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86400000));
}

/**
 * @returns {Promise<object|null>}
 */
export async function getDeletionStatus() {
  const uid = userId();
  const client = supa();

  if (uid && client) {
    try {
      const { data } = await client
        .from('account_deletion_requests')
        .select('*')
        .eq('user_id', uid)
        .eq('status', 'pending')
        .maybeSingle();
      if (data) {
        localStorage.setItem(LS_KEY, JSON.stringify(data));
        return data;
      }
    } catch (e) {
      console.warn('[account-deletion] getDeletionStatus remote', e);
    }
  }

  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const row = JSON.parse(raw);
    if (row.status && row.status !== 'pending') {
      localStorage.removeItem(LS_KEY);
      return null;
    }
    return row;
  } catch {
    return null;
  }
}

/**
 * @param {string} confirmPhrase
 * @param {string} [reason]
 * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
 */
export async function requestAccountDeletion(confirmPhrase, reason = '') {
  if (String(confirmPhrase || '').trim() !== DELETION_CONFIRM_PHRASE) {
    return { success: false, error: `Ketik "${DELETION_CONFIRM_PHRASE}" untuk konfirmasi.` };
  }

  const existing = await getDeletionStatus();
  if (existing?.status === 'pending') {
    return { success: false, error: 'Permintaan hapus akun sudah aktif.' };
  }

  const uid = userId();
  const scheduled = computeHardDeleteAt();
  const row = {
    user_id: uid || 'local',
    status: 'pending',
    requested_at: new Date().toISOString(),
    scheduled_hard_delete_at: scheduled,
    reason: String(reason || '').slice(0, 500),
  };

  const client = supa();
  if (uid && client) {
    try {
      const { data, error } = await client
        .from('account_deletion_requests')
        .upsert({
          user_id: uid,
          status: 'pending',
          requested_at: row.requested_at,
          scheduled_hard_delete_at: scheduled,
          reason: row.reason,
          cancelled_at: null,
          completed_at: null,
        })
        .select('*')
        .single();
      if (error) throw error;
      localStorage.setItem(LS_KEY, JSON.stringify(data));
      notifyCompliance('deletion_requested', {
        days_left: daysUntilHardDelete(scheduled),
      }).catch(() => {});
      return { success: true, data };
    } catch (e) {
      console.error('[account-deletion] requestAccountDeletion', e);
      return { success: false, error: e.message || 'Gagal menyimpan permintaan.' };
    }
  }

  localStorage.setItem(LS_KEY, JSON.stringify(row));
  notifyCompliance('deletion_requested', { days_left: RECOVERY_DAYS }).catch(() => {});
  return { success: true, data: row };
}

/**
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function cancelAccountDeletion() {
  const uid = userId();
  const client = supa();

  if (uid && client) {
    try {
      const { error } = await client
        .from('account_deletion_requests')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
        })
        .eq('user_id', uid)
        .eq('status', 'pending');
      if (error) throw error;
    } catch (e) {
      console.error('[account-deletion] cancelAccountDeletion', e);
      return { success: false, error: e.message || 'Gagal membatalkan.' };
    }
  }

  localStorage.removeItem(LS_KEY);
  notifyCompliance('deletion_cancelled').catch(() => {});
  return { success: true };
}

/**
 * Checklist shown before deletion.
 * @returns {string[]}
 */
export function getDeletionChecklist() {
  return [
    'Data transaksi, budget, dan goals akan dihapus permanen setelah 30 hari.',
    'Langganan aktif tidak otomatis dibatalkan — hubungi support jika perlu refund.',
    'Kamu bisa batalkan permintaan hapus akun kapan saja dalam 30 hari.',
    'Setelah 30 hari, akun tidak bisa dipulihkan.',
  ];
}
