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
    loadHousehold, createHousehold, addHouseholdMember, removeHouseholdMember, leaveHousehold, getHouseholdSummary,
  };
}
