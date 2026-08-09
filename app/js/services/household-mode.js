/**
 * Household mode — local-first shared finance (Fase 5.3).
 * @module services/household-mode
 */

const LS_HOUSEHOLD = 'monefyi_household';

/**
 * @returns {object|null}
 */
export function loadHousehold() {
  try {
    const raw = localStorage.getItem(LS_HOUSEHOLD);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * @param {object|null} data
 */
function saveHousehold(data) {
  if (!data) {
    localStorage.removeItem(LS_HOUSEHOLD);
    return;
  }
  localStorage.setItem(LS_HOUSEHOLD, JSON.stringify(data));
}

/**
 * @param {string} name
 * @returns {object}
 */
export function createHousehold(name) {
  const code = Math.random().toString(36).slice(2, 8).toUpperCase();
  const household = {
    id: `hh_${crypto.randomUUID?.() || Date.now()}`,
    name: String(name || 'Keluarga').trim() || 'Keluarga',
    invite_code: code,
    members: [{
      id: 'owner',
      name: window.STATE?.db?.profile?.name || window.STATE?.user?.name || 'Saya',
      role: 'owner',
    }],
    created_at: new Date().toISOString(),
  };
  saveHousehold(household);
  return household;
}

/**
 * Create household — Supabase when online, local fallback.
 * @param {string} name
 * @returns {Promise<object>}
 */
export async function createHouseholdAsync(name) {
  try {
    const { createHouseholdRemote, cacheHouseholdLocally } = await import('./household-store.js');
    const remote = await createHouseholdRemote(name);
    if (remote) {
      cacheHouseholdLocally(remote);
      return remote;
    }
  } catch (e) {
    console.warn('[household] remote create failed, using local', e);
  }
  return createHousehold(name);
}

/**
 * Join household by invite code (Supabase).
 * @param {string} code
 * @returns {Promise<object>}
 */
export async function joinHouseholdByCode(code) {
  const trimmed = String(code || '').trim();
  if (!trimmed) throw new Error('Kode undangan wajib diisi');

  const { joinHouseholdRemote, cacheHouseholdLocally } = await import('./household-store.js');
  const remote = await joinHouseholdRemote(trimmed);
  if (!remote) throw new Error('Gagal bergabung — perlu login & koneksi');
  cacheHouseholdLocally(remote);
  return remote;
}

/**
 * Regenerate invite code for remote household owner.
 * @returns {Promise<object|null>}
 */
export async function refreshInviteCode() {
  const hh = loadHousehold();
  if (!hh?.id) return null;
  const { createInviteRemote, fetchMyHousehold, cacheHouseholdLocally } = await import('./household-store.js');
  await createInviteRemote(hh.id);
  const updated = await fetchMyHousehold();
  if (updated) cacheHouseholdLocally(updated);
  return updated || hh;
}

/**
 * @param {string} memberName
 * @returns {object|null}
 */
export function addHouseholdMember(memberName) {
  const hh = loadHousehold();
  if (!hh) return null;
  const name = String(memberName || '').trim();
  if (!name) return hh;
  hh.members.push({
    id: `m_${crypto.randomUUID?.() || Date.now()}`,
    name,
    role: 'member',
  });
  saveHousehold(hh);
  return hh;
}

/**
 * @param {string} memberId
 */
export function removeHouseholdMember(memberId) {
  const hh = loadHousehold();
  if (!hh) return;
  hh.members = hh.members.filter((m) => m.id !== memberId || m.role === 'owner');
  saveHousehold(hh);
}

export function leaveHousehold() {
  saveHousehold(null);
}

/**
 * @param {object} [state]
 * @returns {object|null}
 */
export function getHouseholdSummary(state = typeof window !== 'undefined' ? window.STATE : {}) {
  const hh = loadHousehold();
  if (!hh) return null;

  const month = state.selectedMonth
    || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const txs = (state.transactions || []).filter((t) => String(t.date || '').startsWith(month));
  const expense = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + (Number(t.amount) || 0), 0);

  return {
    ...hh,
    member_count: hh.members?.length || 1,
    month_expense: expense,
    month_tx_count: txs.length,
  };
}

if (typeof window !== 'undefined') {
  window.monefyiHousehold = {
    loadHousehold,
    createHousehold,
    createHouseholdAsync,
    joinHouseholdByCode,
    refreshInviteCode,
    addHouseholdMember,
    removeHouseholdMember,
    leaveHousehold,
    getHouseholdSummary,
  };
}
