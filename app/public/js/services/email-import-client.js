/**
 * Client for email import feature.
 * @module services/email-import-client
 */

/**
 * @returns {import('@supabase/supabase-js').SupabaseClient|null}
 */
function getSb() {
  return window.__monefyiSupabase || window.STATE?.db?.supa || null;
}

/**
 * @returns {Promise<string|null>}
 */
async function getUserId() {
  const fromState = window.STATE?.db?.user?.id;
  if (fromState) return fromState;
  const sb = getSb();
  if (!sb) return null;
  try {
    const { data } = await sb.auth.getUser();
    return data?.user?.id || null;
  } catch {
    return null;
  }
}

/**
 * Setup email import for current user. Returns unique import address.
 * @returns {Promise<string>}
 */
export async function setupEmailImport() {
  const sb = getSb();
  if (!sb) throw new Error('Supabase not available');

  const userId = await getUserId();
  if (!userId) throw new Error('Not logged in');

  const { data, error } = await sb.rpc('generate_import_address', { p_user_id: userId });
  if (error) throw error;
  return data;
}

/**
 * @returns {Promise<object|null>}
 */
export async function getImportConfig() {
  const sb = getSb();
  if (!sb) return null;

  const { data, error } = await sb
    .from('email_import_config')
    .select('*')
    .maybeSingle();

  if (error) {
    console.warn('[email-import] getImportConfig', error);
    return null;
  }
  return data;
}

/**
 * @param {boolean} active
 */
export async function toggleImport(active) {
  const sb = getSb();
  const userId = await getUserId();
  if (!sb || !userId) return;

  await sb
    .from('email_import_config')
    .update({ is_active: active, updated_at: new Date().toISOString() })
    .eq('user_id', userId);
}

/**
 * @param {boolean} enabled
 */
export async function toggleAutoConfirm(enabled) {
  const sb = getSb();
  const userId = await getUserId();
  if (!sb || !userId) return;

  await sb
    .from('email_import_config')
    .update({ auto_confirm: enabled, updated_at: new Date().toISOString() })
    .eq('user_id', userId);
}

/**
 * @returns {Promise<object[]>}
 */
export async function getPendingImports() {
  return getImports({ status: 'pending' });
}

/**
 * @param {{ status?: string, limit?: number }} [options]
 * @returns {Promise<object[]>}
 */
export async function getImports(options = {}) {
  const sb = getSb();
  if (!sb) return [];

  let query = sb
    .from('email_imports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(options.limit || 50);

  if (options.status) query = query.eq('status', options.status);

  const { data, error } = await query;
  if (error) {
    console.warn('[email-import] getImports', error);
    return [];
  }
  return data || [];
}

/**
 * Confirm an import (save as real transaction).
 * @param {string} importId
 * @param {object} [edits]
 */
export async function confirmImport(importId, edits = {}) {
  const sb = getSb();
  if (!sb) throw new Error('Supabase not available');

  const userId = await getUserId();
  if (!userId) throw new Error('Not logged in');

  const { data: imp, error: fetchErr } = await sb
    .from('email_imports')
    .select('*')
    .eq('id', importId)
    .single();

  if (fetchErr || !imp) throw new Error('Import not found');
  if (imp.status === 'confirmed') throw new Error('Already confirmed');

  const txData = {
    type: edits.type || imp.parsed_type || 'expense',
    amount: Number(edits.amount ?? imp.parsed_amount) || 0,
    merchant: edits.merchant ?? imp.parsed_merchant ?? '',
    category: edits.category ?? imp.parsed_category ?? 'Other',
    account: edits.account ?? imp.parsed_account ?? '',
    date: edits.date || imp.parsed_date || new Date().toISOString().split('T')[0],
    notes: edits.notes || imp.parsed_notes || `Import dari ${imp.bank_id || 'email'}`,
    user_id: userId,
  };

  if (!(txData.amount > 0)) throw new Error('Invalid amount');

  let localTx = null;
  try {
    const { createTransaction } = await import('./data-store.js');
    localTx = await createTransaction(txData);
  } catch (e) {
    console.warn('[email-import] local create failed, trying supabase', e);
  }

  if (!localTx) {
    const { data: tx, error: txErr } = await sb
      .from('transactions')
      .insert(txData)
      .select()
      .single();
    if (txErr) throw txErr;
    localTx = tx;
  }

  // Mirror into in-memory STATE when available
  try {
    if (typeof window.upsertTransaction === 'function') {
      await window.upsertTransaction({ ...txData, id: localTx.id }, { silent: true, skipUndo: true });
    } else if (Array.isArray(window.STATE?.transactions)) {
      const exists = window.STATE.transactions.some((t) => t.id === localTx.id);
      if (!exists) {
        window.STATE.transactions.unshift({ ...txData, id: localTx.id });
      }
    }
  } catch { /* ignore */ }

  const txId = localTx.server_id || localTx.id;
  await sb
    .from('email_imports')
    .update({
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
      transaction_id: typeof txId === 'string' && !String(txId).startsWith('local_') ? txId : null,
      parsed_type: txData.type,
      parsed_amount: txData.amount,
      parsed_merchant: txData.merchant,
      parsed_category: txData.category,
      parsed_account: txData.account,
      parsed_date: txData.date,
      parsed_notes: txData.notes,
    })
    .eq('id', importId);

  return localTx;
}

/**
 * @param {string} importId
 */
export async function rejectImport(importId) {
  const sb = getSb();
  if (!sb) return;

  await sb
    .from('email_imports')
    .update({ status: 'rejected' })
    .eq('id', importId);
}

/**
 * @param {(row: object) => void} callback
 * @returns {() => void}
 */
export function subscribeToImports(callback) {
  const sb = getSb();
  if (!sb) return () => {};

  const userId = window.STATE?.db?.user?.id;
  if (!userId) return () => {};

  const channel = sb
    .channel(`email_imports_${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'email_imports',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        try {
          callback(payload.new);
        } catch (e) {
          console.warn('[email-import] subscribe callback', e);
        }
      },
    )
    .subscribe();

  return () => {
    try {
      sb.removeChannel(channel);
    } catch { /* ignore */ }
  };
}

/**
 * @returns {Promise<object|null>}
 */
export async function getImportStats() {
  const sb = getSb();
  if (!sb) return null;

  const { data } = await sb.from('email_imports').select('status, bank_id');
  if (!data) return null;

  /** @type {Record<string, number>} */
  const byBankMap = {};
  for (const d of data) {
    const key = d.bank_id || 'unknown';
    byBankMap[key] = (byBankMap[key] || 0) + 1;
  }

  return {
    total: data.length,
    pending: data.filter((d) => d.status === 'pending').length,
    confirmed: data.filter((d) => d.status === 'confirmed').length,
    rejected: data.filter((d) => d.status === 'rejected').length,
    byBank: Object.entries(byBankMap).sort((a, b) => b[1] - a[1]),
  };
}

if (typeof window !== 'undefined') {
  window.monefyiEmailImport = {
    setupEmailImport,
    getImportConfig,
    toggleImport,
    toggleAutoConfirm,
    getPendingImports,
    getImports,
    confirmImport,
    rejectImport,
    subscribeToImports,
    getImportStats,
  };
}
