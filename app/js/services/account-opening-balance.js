/**
 * Account opening balances — saldo awal per akun untuk neraca.
 * @module services/account-opening-balance
 */

import { getDb, generateLocalId } from './offline-db.js';

/**
 * @returns {string|null}
 */
function getUserId() {
  return window.STATE?.db?.user?.id || null;
}

/**
 * @param {object} row
 * @returns {object}
 */
function normalizeRow(row = {}) {
  return {
    id: row.id || generateLocalId(),
    user_id: row.user_id,
    account_name: String(row.account_name || '').trim(),
    as_of_date: String(row.as_of_date || new Date().toISOString().slice(0, 10)),
    amount: Number(row.amount || 0),
    source: row.source || 'manual',
    server_id: row.server_id || null,
    _sync_status: row._sync_status || 'pending',
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
  };
}

/**
 * @param {string} userId
 * @returns {Promise<object[]>}
 */
export async function listOpeningBalances(userId) {
  const db = await getDb();
  const uid = userId || getUserId();
  if (!uid) return [];
  return db.account_opening_balances.where('user_id').equals(uid).toArray();
}

/**
 * @param {string} userId
 * @returns {Promise<Map<string, number>>}
 */
export async function getOpeningBalanceMap(userId) {
  const rows = await listOpeningBalances(userId);
  const map = new Map();
  for (const r of rows) {
    const name = String(r.account_name || '').trim();
    if (!name) continue;
    map.set(name, Number(r.amount || 0));
  }
  return map;
}

/**
 * @param {string} userId
 * @param {{ account_name: string, amount: number, source?: string }[]} accounts
 * @returns {Promise<{ success: boolean, count: number }>}
 */
export async function saveOpeningBalances(userId, accounts) {
  const db = await getDb();
  const uid = userId || getUserId();
  if (!uid) return { success: false, count: 0 };

  const today = new Date().toISOString().slice(0, 10);
  let count = 0;

  for (const acc of accounts || []) {
    const name = String(acc.account_name || acc.name || '').trim();
    if (!name) continue;
    const amount = Number(acc.amount || 0);
    const existing = (await db.account_opening_balances.where('user_id').equals(uid).toArray())
      .find((r) => r.account_name === name);

    const row = normalizeRow({
      ...(existing || {}),
      user_id: uid,
      account_name: name,
      as_of_date: today,
      amount,
      source: acc.source || 'onboarding',
    });

    await db.account_opening_balances.put(row);
    count += 1;
  }

  try {
    const supa = window.STATE?.db?.supa;
    if (supa) {
      const payload = (accounts || []).map((acc) => ({
        user_id: uid,
        account_name: String(acc.account_name || acc.name || '').trim(),
        as_of_date: today,
        amount: Number(acc.amount || 0),
        source: acc.source || 'onboarding',
        updated_at: new Date().toISOString(),
      })).filter((r) => r.account_name);

      if (payload.length) {
        await supa.from('account_opening_balances').upsert(payload, {
          onConflict: 'user_id,account_name,as_of_date',
        });
      }
    }
  } catch (e) {
    console.warn('[opening-balance] sync', e);
  }

  if (window.STATE) {
    window.STATE.accountOpeningBalances = await listOpeningBalances(uid);
  }

  return { success: true, count };
}

/**
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
export async function hasOpeningBalances(userId) {
  const rows = await listOpeningBalances(userId);
  return rows.some((r) => Number(r.amount || 0) !== 0);
}

/**
 * Pull from Supabase.
 * @param {string} userId
 */
export async function pullOpeningBalances(userId) {
  const supa = window.STATE?.db?.supa;
  const uid = userId || getUserId();
  if (!supa || !uid) return 0;
  const db = await getDb();
  const { data, error } = await supa.from('account_opening_balances').select('*').eq('user_id', uid);
  if (error || !data?.length) return 0;
  for (const row of data) {
    await db.account_opening_balances.put({ ...row, server_id: row.id, _sync_status: 'synced' });
  }
  if (window.STATE) window.STATE.accountOpeningBalances = data;
  return data.length;
}

if (typeof window !== 'undefined') {
  window.monefyiOpeningBalance = {
    listOpeningBalances,
    getOpeningBalanceMap,
    saveOpeningBalances,
    hasOpeningBalances,
    pullOpeningBalances,
  };
}
