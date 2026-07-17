/**
 * Pending queue for transactions that couldn't be parsed offline or with low confidence.
 * @module services/pending-queue
 */

import { getDb } from './offline-db.js';
import { createTransaction } from './data-store.js';

const LS_KEY = 'monefyi_pending';
const listeners = new Set();

/**
 * @returns {boolean}
 */
function isOnline() {
  if (typeof window !== 'undefined' && window.monefyiConnectivity?.isOnline) {
    return window.monefyiConnectivity.isOnline();
  }
  return navigator.onLine;
}

/**
 * @param {object} item
 * @returns {Promise<string>}
 */
export async function addToPendingQueue(item) {
  const id = `pending_${crypto.randomUUID()}`;
  const record = {
    id,
    ...item,
    status: 'pending',
    attempts: 0,
    createdAt: item.createdAt || new Date().toISOString(),
  };

  try {
    const db = await getDb();
    if (db.pending_transactions) {
      await db.pending_transactions.add(record);
    } else {
      throw new Error('pending_transactions store missing');
    }
  } catch (e) {
    console.warn('[pending] Dexie add failed, using localStorage:', e.message);
    const existing = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
    existing.push(record);
    localStorage.setItem(LS_KEY, JSON.stringify(existing));
  }

  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.sync.register('sync-pending');
    } catch {
      /* Background Sync not supported */
    }
  }

  notifyListeners();
  return id;
}

/**
 * @returns {Promise<object[]>}
 */
export async function getPendingItems() {
  try {
    const db = await getDb();
    if (db.pending_transactions) {
      return db.pending_transactions.where('status').notEqual('completed').toArray();
    }
  } catch {
    /* fallback below */
  }

  return JSON.parse(localStorage.getItem(LS_KEY) || '[]').filter((p) => p.status !== 'completed');
}

/**
 * @returns {Promise<number>}
 */
export async function getPendingCount() {
  const items = await getPendingItems();
  return items.filter((i) => i.status === 'pending' || i.status === 'processing').length;
}

/**
 * @param {string} id
 * @param {object} updates
 */
async function updatePendingStatus(id, updates) {
  try {
    const db = await getDb();
    if (db.pending_transactions) {
      await db.pending_transactions.update(id, updates);
      return;
    }
  } catch {
    /* fallback below */
  }

  const items = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
  const idx = items.findIndex((i) => i.id === id);
  if (idx >= 0) {
    items[idx] = { ...items[idx], ...updates };
    localStorage.setItem(LS_KEY, JSON.stringify(items));
  }
}

/**
 * @param {string} id
 */
async function removePending(id) {
  try {
    const db = await getDb();
    if (db.pending_transactions) {
      await db.pending_transactions.delete(id);
      return;
    }
  } catch {
    /* fallback below */
  }

  const items = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
  localStorage.setItem(LS_KEY, JSON.stringify(items.filter((i) => i.id !== id)));
}

/**
 * @returns {Promise<{processed: number, failed: number}>}
 */
export async function processPendingQueue() {
  if (!isOnline()) return { processed: 0, failed: 0 };

  const items = await getPendingItems();
  const pending = items.filter((i) => i.status === 'pending');
  if (pending.length === 0) return { processed: 0, failed: 0 };

  let processed = 0;
  let failed = 0;

  for (const item of pending) {
    try {
      await updatePendingStatus(item.id, {
        status: 'processing',
        attempts: (item.attempts || 0) + 1,
      });

      const { tryServerAI } = await import('./parser-orchestrator.js');
      const hit = await tryServerAI(item.rawText, item.userId);
      if (hit?.amount > 0) {
        await createTransaction({
          ...hit,
          meta: { ...(hit.meta || {}), _fromPending: item.id },
        });
        await removePending(item.id);
        processed++;
        showNotif('Transaksi diproses', `"${String(item.rawText).slice(0, 30)}..." tersimpan`);
      } else {
        await updatePendingStatus(item.id, { status: 'pending' });
        failed++;
      }
    } catch (e) {
      failed++;
      await updatePendingStatus(item.id, {
        status: (item.attempts || 0) >= 5 ? 'failed' : 'pending',
        lastError: e?.message || String(e),
      });
    }
  }

  notifyListeners();
  return { processed, failed };
}

/**
 * @param {string} id
 */
export async function retryPending(id) {
  await updatePendingStatus(id, { status: 'pending', attempts: 0 });
  return processPendingQueue();
}

/**
 * @param {string} id
 */
export async function deletePending(id) {
  await removePending(id);
  notifyListeners();
}

/**
 * @param {(count: number) => void} callback
 * @returns {() => void}
 */
export function onPendingChange(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

async function notifyListeners() {
  const count = await getPendingCount();
  listeners.forEach((cb) => {
    try {
      cb(count);
    } catch {
      /* ignore */
    }
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('monefyi-pending-change'));
  }
}

/**
 * @param {string} title
 * @param {string} body
 */
function showNotif(title, body) {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/app/icons/monefyi-logo.png',
        silent: false,
      });
    } catch {
      /* ignore */
    }
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    setTimeout(() => processPendingQueue(), 2000);
  });

  window.monefyiPending = {
    addToPendingQueue,
    getPendingItems,
    getPendingCount,
    processPendingQueue,
    retryPending,
    deletePending,
    onPendingChange,
  };
}
