/**
 * Transaction list edit session — drafts, selection, manual order.
 * Inline edits accumulate here until bulk save; no prompt on clickaway.
 * @module services/tx-edit-session
 */

/** @type {Map<string, object>} */
const _drafts = new Map();

/** @type {Set<string>} */
const _selected = new Set();

/** @type {string[]} manual display order (ids) */
let _order = [];

/** @type {Set<() => void>} */
const _listeners = new Set();

const ORDER_KEY = 'monefyi_tx_manual_order';

function notify() {
  for (const fn of _listeners) {
    try { fn(getTxEditState()); } catch (_) { /* ignore */ }
  }
}

/**
 * @returns {{ draftCount: number, selectedCount: number, selectedIds: string[], draftIds: string[], isDirty: boolean }}
 */
export function getTxEditState() {
  return {
    draftCount: _drafts.size,
    selectedCount: _selected.size,
    selectedIds: [..._selected],
    draftIds: [..._drafts.keys()],
    isDirty: _drafts.size > 0,
  };
}

/**
 * @param {() => void} fn
 * @returns {() => void}
 */
export function onTxEditChange(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

/**
 * @param {string} id
 * @param {object} patch
 * @param {object} [original]
 */
export function setTxDraft(id, patch, original) {
  if (!id) return;
  const prev = _drafts.get(id) || { id, original: original || null, patch: {} };
  prev.patch = { ...prev.patch, ...patch };
  if (original && !prev.original) prev.original = { ...original };
  _drafts.set(id, prev);
  notify();
}

/**
 * @param {string} id
 * @returns {object|null}
 */
export function getTxDraft(id) {
  return _drafts.get(id) || null;
}

/**
 * Merge live TX with draft for display.
 * @param {object} tx
 * @returns {object}
 */
export function applyTxDraft(tx) {
  if (!tx?.id) return tx;
  const d = _drafts.get(tx.id);
  if (!d?.patch) return tx;
  return { ...tx, ...d.patch };
}

/**
 * @param {string} id
 */
export function clearTxDraft(id) {
  if (_drafts.delete(id)) notify();
}

export function clearAllTxDrafts() {
  if (!_drafts.size) return;
  _drafts.clear();
  notify();
}

/**
 * @returns {Array<{ id: string, patch: object, original: object|null }>}
 */
export function listTxDrafts() {
  return [..._drafts.values()];
}

/**
 * @param {string} id
 * @param {boolean} [on]
 */
export function toggleTxSelected(id, on) {
  if (!id) return;
  const next = on === undefined ? !_selected.has(id) : !!on;
  if (next) _selected.add(id);
  else _selected.delete(id);
  notify();
}

/**
 * @param {string[]} ids
 * @param {boolean} on
 */
export function setTxSelectedMany(ids, on) {
  for (const id of ids) {
    if (on) _selected.add(id);
    else _selected.delete(id);
  }
  notify();
}

export function clearTxSelection() {
  if (!_selected.size) return;
  _selected.clear();
  notify();
}

/**
 * @param {string} id
 * @returns {boolean}
 */
export function isTxSelected(id) {
  return _selected.has(id);
}

export function loadTxManualOrder() {
  try {
    const raw = localStorage.getItem(ORDER_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    _order = Array.isArray(arr) ? arr.map(String) : [];
  } catch {
    _order = [];
  }
}

function persistOrder() {
  try {
    localStorage.setItem(ORDER_KEY, JSON.stringify(_order));
  } catch (_) { /* ignore */ }
}

/**
 * @param {string[]} idsInNewOrder full or partial reorder of visible ids
 */
export function setTxManualOrder(idsInNewOrder) {
  const incoming = (idsInNewOrder || []).map(String).filter(Boolean);
  if (!incoming.length) return;

  if (!_order.length) {
    _order = incoming.slice();
    persistOrder();
    notify();
    return;
  }

  // Move incoming block into relative positions while keeping others
  const setIncoming = new Set(incoming);
  const rest = _order.filter((id) => !setIncoming.has(id));
  // Insert incoming at the position of the first moved id in previous order
  const firstIdx = _order.findIndex((id) => setIncoming.has(id));
  const at = firstIdx >= 0 ? firstIdx : rest.length;
  _order = [...rest.slice(0, at), ...incoming, ...rest.slice(at)];
  // Deduplicate
  const seen = new Set();
  _order = _order.filter((id) => {
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  persistOrder();
  notify();
}

/**
 * @param {object[]} txs
 * @returns {object[]}
 */
export function sortTxsByManualOrder(txs) {
  if (!_order.length || !txs?.length) return txs;
  const rank = new Map(_order.map((id, i) => [id, i]));
  return txs.slice().sort((a, b) => {
    const ra = rank.has(a.id) ? rank.get(a.id) : Number.MAX_SAFE_INTEGER;
    const rb = rank.has(b.id) ? rank.get(b.id) : Number.MAX_SAFE_INTEGER;
    if (ra !== rb) return ra - rb;
    return 0;
  });
}

/**
 * Move id from fromIndex to toIndex within visibleIds, then persist.
 * @param {string[]} visibleIds
 * @param {number} fromIndex
 * @param {number} toIndex
 */
export function reorderVisibleTx(visibleIds, fromIndex, toIndex) {
  if (!visibleIds?.length) return;
  const list = visibleIds.slice();
  if (fromIndex < 0 || toIndex < 0 || fromIndex >= list.length || toIndex >= list.length) return;
  const [item] = list.splice(fromIndex, 1);
  list.splice(toIndex, 0, item);
  setTxManualOrder(list);
}

loadTxManualOrder();

if (typeof window !== 'undefined') {
  window.monefyiTxEditSession = {
    getTxEditState,
    setTxDraft,
    getTxDraft,
    applyTxDraft,
    clearTxDraft,
    clearAllTxDrafts,
    listTxDrafts,
    toggleTxSelected,
    setTxSelectedMany,
    clearTxSelection,
    isTxSelected,
    sortTxsByManualOrder,
    reorderVisibleTx,
    onTxEditChange,
  };
}
