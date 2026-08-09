/**
 * Debt payoff milestone notifications (25/50/75/100%).
 * @module services/debt-milestones
 */

const LS_KEY = 'monefyi_debt_milestones';

/**
 * @param {object[]} debts
 * @returns {number}
 */
export function computeDebtPayoffPercent(debts = []) {
  let original = 0;
  let remaining = 0;
  for (const d of debts) {
    const orig = Number(d.original_amount || d.original_balance || d.balance || 0);
    const bal = Number(d.balance || d.current_balance || 0);
    if (orig > 0) {
      original += orig;
      remaining += Math.max(0, bal);
    } else if (bal > 0) {
      original += bal;
      remaining += bal;
    }
  }
  if (original <= 0) return 100;
  return Math.round(((original - remaining) / original) * 100);
}

/**
 * @param {number} pct
 * @returns {number|null}
 */
export function milestoneForPercent(pct) {
  const thresholds = [25, 50, 75, 100];
  let hit = null;
  for (const t of thresholds) {
    if (pct >= t) hit = t;
  }
  return hit;
}

/**
 * @param {object[]} debts
 * @returns {Promise<object|null>}
 */
export async function checkDebtMilestones(debts = []) {
  const pct = computeDebtPayoffPercent(debts);
  const milestone = milestoneForPercent(pct);
  if (!milestone) return null;

  let seen = {};
  try {
    seen = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
  } catch { /* ignore */ }

  const key = String(milestone);
  if (seen[key]) return null;
  seen[key] = new Date().toISOString();
  localStorage.setItem(LS_KEY, JSON.stringify(seen));

  const labels = {
    25: '25% utang lunas — momentum bagus!',
    50: 'Setengah utang sudah lunas — lanjutkan!',
    75: '75% utang lunas — hampir bebas!',
    100: 'Utang lunas — selamat!',
  };

  const payload = {
    milestone,
    percent: pct,
    title: 'Milestone utang',
    body: labels[milestone] || `Progress utang ${pct}%`,
  };

  try {
    window.showToast?.(payload.body, milestone === 100 ? 'success' : 'info');
  } catch { /* ignore */ }

  return payload;
}

/**
 * Reset milestone tracking (testing or new debt cycle).
 */
export function resetDebtMilestones() {
  try {
    localStorage.removeItem(LS_KEY);
  } catch { /* ignore */ }
}
