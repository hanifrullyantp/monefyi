/**
 * Wishlist with delay + impulse skip tracking (Growth Sprint 20).
 * @module services/impulse-wishlist
 */

const LS_WISHLIST = 'monefyi_impulse_wishlist';
const LS_STATS = 'monefyi_impulse_skip_stats';
const DEFAULT_REVIEW_DAYS = 30;

/**
 * @returns {object[]}
 */
export function loadWishlist() {
  try {
    return JSON.parse(localStorage.getItem(LS_WISHLIST) || '[]');
  } catch {
    return [];
  }
}

/**
 * @param {object[]} list
 */
function saveWishlist(list) {
  localStorage.setItem(LS_WISHLIST, JSON.stringify(list));
}

/**
 * @param {number} days
 * @returns {string}
 */
function reviewIso(days = DEFAULT_REVIEW_DAYS) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

/**
 * @param {object} item
 * @returns {object}
 */
export function addToWishlist(item) {
  const reviewDays = Number(item.review_days || DEFAULT_REVIEW_DAYS);
  const row = {
    id: item.id || `wish_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: String(item.name || item.merchant || 'Item wishlist').slice(0, 120),
    amount: Math.abs(Number(item.amount || 0)),
    category: item.category || null,
    merchant: item.merchant || null,
    notes: item.notes || null,
    added_at: new Date().toISOString(),
    review_at: reviewIso(reviewDays),
    review_days: reviewDays,
    status: 'pending',
  };
  const list = loadWishlist();
  list.unshift(row);
  saveWishlist(list.slice(0, 50));
  return row;
}

/**
 * @param {string} id
 * @param {object} patch
 */
export function updateWishlistItem(id, patch) {
  const list = loadWishlist().map((w) => (w.id === id ? { ...w, ...patch } : w));
  saveWishlist(list);
  return list.find((w) => w.id === id) || null;
}

/**
 * @param {string} id
 */
export function removeWishlistItem(id) {
  saveWishlist(loadWishlist().filter((w) => w.id !== id));
}

/**
 * @param {string} id
 * @param {number} [extraDays]
 */
export function extendWishlistReview(id, extraDays = DEFAULT_REVIEW_DAYS) {
  const item = loadWishlist().find((w) => w.id === id);
  if (!item) return null;
  const base = new Date(item.review_at || item.added_at);
  base.setDate(base.getDate() + extraDays);
  return updateWishlistItem(id, { review_at: base.toISOString(), status: 'pending' });
}

/**
 * @returns {object[]}
 */
export function getWishlistReadyForReview() {
  const now = Date.now();
  return loadWishlist().filter((w) => {
    if (w.status !== 'pending') return false;
    return new Date(w.review_at).getTime() <= now;
  });
}

/**
 * @returns {object}
 */
export function loadImpulseSkipStats() {
  try {
    return JSON.parse(localStorage.getItem(LS_STATS) || '{}');
  } catch {
    return {};
  }
}

/**
 * @param {object} stats
 */
function saveImpulseSkipStats(stats) {
  localStorage.setItem(LS_STATS, JSON.stringify(stats));
}

/**
 * @param {{ amount?: number, name?: string }} [opts]
 * @returns {object}
 */
export function recordImpulseSkip(opts = {}) {
  const amount = Math.abs(Number(opts.amount || 0));
  const stats = loadImpulseSkipStats();
  const month = new Date().toISOString().slice(0, 7);
  stats.total_saved = (stats.total_saved || 0) + amount;
  stats.total_skips = (stats.total_skips || 0) + 1;
  stats.month_key = month;
  stats.month_skips = stats.month_key === month ? (stats.month_skips || 0) + 1 : 1;
  stats.month_saved = stats.month_key === month
    ? (stats.month_saved || 0) + amount
    : amount;
  stats.last_skip = {
    amount,
    name: opts.name || null,
    at: new Date().toISOString(),
  };
  saveImpulseSkipStats(stats);
  return stats;
}

/**
 * @param {object} tx
 * @returns {object}
 */
export function wishlistFromTransaction(tx) {
  return addToWishlist({
    name: tx.merchant || tx.notes || tx.category || 'Belanja',
    amount: tx.amount,
    category: tx.category,
    merchant: tx.merchant,
    notes: tx.notes,
  });
}

if (typeof window !== 'undefined') {
  window.monefyiImpulseWishlist = {
    loadWishlist,
    addToWishlist,
    updateWishlistItem,
    removeWishlistItem,
    extendWishlistReview,
    getWishlistReadyForReview,
    recordImpulseSkip,
    wishlistFromTransaction,
    loadImpulseSkipStats,
  };
}
