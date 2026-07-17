/**
 * Centralized notification center.
 * Aggregates: budget alerts, AI recommendations, sync status, pending, etc.
 * @module services/notification-center
 */

const MAX_NOTIFICATIONS = 100;
const _listeners = new Set();

/** @type {import('dexie').Dexie|null} */
let _dbInstance = null;

/**
 * @returns {Promise<import('dexie').Dexie>}
 */
async function getDb() {
  if (_dbInstance) return _dbInstance;
  const { getDb: get } = await import('./offline-db.js');
  _dbInstance = await get();
  return _dbInstance;
}

export const NOTIF_TYPES = {
  BUDGET_ALERT: { key: 'budget_alert', label: 'Alert Budget', icon: '⚠️', color: '#f59e0b' },
  BUDGET_REMINDER: { key: 'budget_reminder', label: 'Reminder Budget', icon: '📅', color: '#3b82f6' },
  BUDGET_TIP: { key: 'budget_tip', label: 'Tips Budget', icon: '💡', color: '#eab308' },
  AI_RECOMMENDATION: { key: 'ai_recommendation', label: 'Saran AI', icon: '🧠', color: '#a855f7' },
  SYNC_STATUS: { key: 'sync_status', label: 'Sinkronisasi', icon: '🔄', color: '#10b981' },
  PENDING: { key: 'pending', label: 'Menunggu', icon: '⏳', color: '#f59e0b' },
  ACHIEVEMENT: { key: 'achievement', label: 'Pencapaian', icon: '🎉', color: '#10b981' },
  SYSTEM: { key: 'system', label: 'Sistem', icon: 'ℹ️', color: '#6b7280' },
};

/**
 * @param {object} notif
 * @returns {Promise<string|null>}
 */
export async function addNotification(notif) {
  try {
    const db = await getDb();
    if (!db.notifications) return null;

    const record = {
      id: `notif_${crypto.randomUUID()}`,
      timestamp: new Date().toISOString(),
      read: false,
      dismissed: false,
      ...notif,
    };

    await db.notifications.add(record);

    const count = await db.notifications.count();
    if (count > MAX_NOTIFICATIONS) {
      const oldest = await db.notifications.orderBy('timestamp').limit(count - MAX_NOTIFICATIONS).toArray();
      await db.notifications.bulkDelete(oldest.map((o) => o.id));
    }

    _notify();
    return record.id;
  } catch (e) {
    console.warn('[notif] Add failed:', e);
    return null;
  }
}

/**
 * @param {object} [options]
 * @returns {Promise<object[]>}
 */
export async function getNotifications(options = {}) {
  try {
    const db = await getDb();
    if (!db.notifications) return [];

    let items = await db.notifications.orderBy('timestamp').reverse().limit(50).toArray();

    if (options.unreadOnly) items = items.filter((n) => !n.read);
    if (options.notDismissed !== false) items = items.filter((n) => !n.dismissed);
    if (options.type) items = items.filter((n) => n.type === options.type);

    return items;
  } catch (e) {
    console.warn('[notif] Get failed:', e);
    return [];
  }
}

/**
 * @returns {Promise<number>}
 */
export async function getUnreadCount() {
  try {
    const db = await getDb();
    if (!db.notifications) return 0;
    const items = await db.notifications.filter((n) => !n.read && !n.dismissed).toArray();
    return items.length;
  } catch {
    return 0;
  }
}

/**
 * @param {string} id
 */
export async function markAsRead(id) {
  const db = await getDb();
  if (db.notifications) {
    await db.notifications.update(id, { read: true });
    _notify();
  }
}

export async function markAllAsRead() {
  const db = await getDb();
  if (db.notifications) {
    const unread = await db.notifications.filter((n) => !n.read).toArray();
    for (const n of unread) {
      await db.notifications.update(n.id, { read: true });
    }
    _notify();
  }
}

/**
 * @param {string} id
 */
export async function dismissNotification(id) {
  const db = await getDb();
  if (db.notifications) {
    await db.notifications.update(id, { dismissed: true });
    _notify();
  }
}

export async function clearAll() {
  const db = await getDb();
  if (db.notifications) {
    await db.notifications.clear();
    _notify();
  }
}

/**
 * @returns {Promise<object>}
 */
async function getBudgetContext() {
  const state = typeof window !== 'undefined' ? window.STATE : null;
  const month = state?.selectedMonth || getCurrentPeriod();
  const { rowsToBudgetList } = await import('./budget-model.js');
  const { getTotalIncome } = await import('./income-source.js');

  let rows = state?.budgetDraft?.rows;
  if (!rows?.length) {
    rows = rowsToBudgetList(month, state?.budgetsByMonth || {});
  }

  const transactions = state?.transactions || [];
  let income = Number(state?.budgetDraft?.income || state?.budgetsByMonth?.[month]?.income || 0);
  try {
    const fromSources = await getTotalIncome(month);
    if (fromSources > 0) income = fromSources;
  } catch { /* ignore */ }

  return { month, rows, transactions, income };
}

/**
 * Refresh notifications from budget rules and due dates.
 */
export async function refreshNotifications() {
  try {
    const ctx = await getBudgetContext();
    const { generateRecommendations } = await import('./budget-recommender.js');
    const recs = await generateRecommendations(ctx);

    const db = await getDb();
    if (!db.notifications) return;

    const existing = await db.notifications.filter((n) => !n.dismissed).toArray();
    const existingKeys = new Set(existing.map((n) => n.dedupKey).filter(Boolean));

    for (const rec of recs) {
      const dedupKey = `budget_${rec.type}_${rec.title}`;
      if (existingKeys.has(dedupKey)) continue;

      const type = rec.severity === 'high'
        ? NOTIF_TYPES.BUDGET_ALERT.key
        : rec.severity === 'medium'
          ? NOTIF_TYPES.BUDGET_TIP.key
          : NOTIF_TYPES.BUDGET_REMINDER.key;

      await addNotification({
        type,
        icon: rec.icon,
        title: rec.title,
        message: rec.message,
        actions: rec.actions,
        dedupKey,
        severity: rec.severity,
        source: 'budget',
      });
    }

    await checkBudgetDueDates(ctx.rows);
    await checkPendingQueue();
    await checkMonevisorTips(ctx);
    await checkSyncStatus();
    _notify();
  } catch (e) {
    console.warn('[notif] Refresh failed:', e);
  }
}

/**
 * @param {object[]} rows
 */
async function checkBudgetDueDates(rows) {
  try {
    const now = new Date();
    const today = now.getDate();
    const db = await getDb();
    if (!db.notifications) return;

    for (const budget of rows || []) {
      if (!budget.items?.length) continue;

      for (const item of budget.items) {
        if (item.status === 'done' || item.status === 'skipped') continue;

        const dayStr = item.target_date_day || extractDayFromIso(item.target_date);
        if (!dayStr) continue;

        const days = parseTargetDays(dayStr);
        if (!days) continue;

        const dayDiff = days.start - today;
        if (![3, 1, 0].includes(dayDiff)) continue;

        const dedupKey = `due_${item.id}_${dayDiff}`;
        const existing = await db.notifications
          .filter((n) => n.dedupKey === dedupKey && !n.dismissed)
          .first();
        if (existing) continue;

        const qty = Number(item.qty || 1);
        const price = Number(item.price ?? item.unit_price ?? 0);
        const label = dayDiff === 0 ? 'Hari ini' : dayDiff === 1 ? 'Besok' : `${dayDiff} hari lagi`;

        await addNotification({
          type: NOTIF_TYPES.BUDGET_REMINDER.key,
          icon: '📅',
          title: `${item.name || 'Item'} - ${label}`,
          message: `${budget.name}: Rp ${fmt(qty * price)}`,
          actions: [{ label: 'Lihat Budget', action: 'open_budget', budgetId: budget.id }],
          dedupKey,
          severity: dayDiff === 0 ? 'high' : 'medium',
          source: 'budget',
        });
      }
    }
  } catch (e) {
    console.warn('[notif] Check due dates failed:', e);
  }
}

async function checkPendingQueue() {
  try {
    const pending = window.monefyiPending?.getPendingCount?.();
    if (!pending || pending <= 0) return;

    const db = await getDb();
    if (!db.notifications) return;

    const dedupKey = 'pending_queue_count';
    const existing = await db.notifications.filter((n) => n.dedupKey === dedupKey && !n.dismissed).first();
    if (existing) {
      await db.notifications.update(existing.id, {
        message: `${pending} transaksi menunggu sinkronisasi`,
        timestamp: new Date().toISOString(),
        read: false,
      });
      return;
    }

    await addNotification({
      type: NOTIF_TYPES.PENDING.key,
      icon: '⏳',
      title: 'Transaksi pending',
      message: `${pending} transaksi menunggu sinkronisasi`,
      dedupKey,
      severity: 'medium',
      source: 'system',
    });
  } catch { /* ignore */ }
}

/**
 * @param {object} ctx
 */
async function checkMonevisorTips(ctx) {
  try {
    const { calculateProgress } = await import('./budget-model.js');
    const db = await getDb();
    if (!db.notifications || !ctx.rows?.length) return;

    const totalBudget = ctx.rows.reduce((s, b) => s + Number(b.amount || 0), 0);
    if (totalBudget <= 0) return;

    const totalSpent = ctx.rows.reduce(
      (s, b) => s + calculateProgress(b, ctx.transactions, ctx.month).spent,
      0
    );
    const percentUsed = Math.round((totalSpent / totalBudget) * 100);
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const timeProgress = Math.round((now.getDate() / daysInMonth) * 100);

    const tips = [];
    if (percentUsed - timeProgress > 15) {
      tips.push({
        dedupKey: `ai_pace_${ctx.month}`,
        title: 'Monevisor: Rem pengeluaran',
        message: `Sudah ${percentUsed}% budget terpakai, baru ${timeProgress}% bulan berlalu. Tanya Monevisor untuk saran hemat.`,
        severity: 'medium',
      });
    }

    const overRows = ctx.rows.filter(
      (b) => calculateProgress(b, ctx.transactions, ctx.month).status === 'over'
    );
    if (overRows.length >= 2) {
      tips.push({
        dedupKey: `ai_over_multi_${ctx.month}`,
        title: 'Monevisor: Review budget',
        message: `${overRows.length} kategori over budget. Minta Monevisor bantu realokasi.`,
        severity: 'high',
      });
    }

    for (const tip of tips) {
      const existing = await db.notifications
        .filter((n) => n.dedupKey === tip.dedupKey && !n.dismissed)
        .first();
      if (existing) continue;

      await addNotification({
        type: NOTIF_TYPES.AI_RECOMMENDATION.key,
        icon: '🧠',
        title: tip.title,
        message: tip.message,
        actions: [{ label: 'Tanya Monevisor', action: 'ask_monevisor' }],
        dedupKey: tip.dedupKey,
        severity: tip.severity,
        source: 'ai',
      });
    }
  } catch (e) {
    console.warn('[notif] Monevisor tips failed:', e);
  }
}

async function checkSyncStatus() {
  try {
    const db = await getDb();
    if (!db.notifications) return;

    const offline = typeof navigator !== 'undefined' && !navigator.onLine;
    const dedupKey = offline ? 'sync_offline' : 'sync_online';
    const staleKey = offline ? 'sync_online' : 'sync_offline';

    const stale = await db.notifications.filter((n) => n.dedupKey === staleKey && !n.dismissed).toArray();
    if (stale.length) await db.notifications.bulkDelete(stale.map((n) => n.id));

    if (!offline) return;

    const existing = await db.notifications.filter((n) => n.dedupKey === dedupKey && !n.dismissed).first();
    if (existing) return;

    await addNotification({
      type: NOTIF_TYPES.SYNC_STATUS.key,
      icon: '📡',
      title: 'Mode offline',
      message: 'Perubahan disimpan lokal. Akan disinkronkan saat online.',
      dedupKey,
      severity: 'low',
      source: 'system',
    });
  } catch { /* ignore */ }
}

/**
 * @param {string} str
 * @returns {{ start: number, end: number }|null}
 */
function parseTargetDays(str) {
  if (!str) return null;
  const s = String(str).trim();
  if (s.includes('-')) {
    const [start, end] = s.split('-').map((x) => parseInt(x.trim(), 10));
    if (!Number.isNaN(start) && !Number.isNaN(end)) return { start, end };
  } else {
    const day = parseInt(s, 10);
    if (!Number.isNaN(day)) return { start: day, end: day };
  }
  return null;
}

/**
 * @param {string|null} iso
 * @returns {string|null}
 */
function extractDayFromIso(iso) {
  if (!iso) return null;
  const m = String(iso).match(/^\d{4}-\d{2}-(\d{2})/);
  return m ? String(parseInt(m[1], 10)) : null;
}

/**
 * @param {number} num
 * @returns {string}
 */
function fmt(num) {
  return new Intl.NumberFormat('id-ID').format(Math.round(num || 0));
}

/**
 * @returns {string}
 */
function getCurrentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * @param {(count: number) => void} callback
 * @returns {() => void}
 */
export function onNotificationChange(callback) {
  _listeners.add(callback);
  return () => _listeners.delete(callback);
}

async function _notify() {
  const count = await getUnreadCount();
  _listeners.forEach((cb) => { try { cb(count); } catch { /* ignore */ } });
}

if (typeof window !== 'undefined') {
  window.monefyiNotif = {
    NOTIF_TYPES,
    addNotification,
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    clearAll,
    refreshNotifications,
    onNotificationChange,
  };

  setTimeout(() => refreshNotifications(), 3000);
  setInterval(() => refreshNotifications(), 5 * 60 * 1000);
}
