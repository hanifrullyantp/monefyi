/**
 * Local OS notification manager (no VAPID in this phase).
 * Gates: permission, prefs, quiet hours, daily limit (hard max 3), dedup.
 * Dual-writes to notification-center inbox.
 * @module services/push-notification
 */

const HARD_DAILY_MAX = 3;
const DEDUP_MS = 4 * 60 * 60 * 1000;
const ICON = '/app/icons/monefyi-logo.png';
const BADGE = '/app/icons/icon-192.svg';

/** Module-level bypass for scheduler force-run (avoids threading force through generators). */
let _forceBypass = false;

/**
 * Enable/disable gate bypass for all showNotification calls.
 * @param {boolean} on
 */
export function setForceBypass(on) {
  _forceBypass = !!on;
}

const DEFAULT_PREFS = {
  enabled: true,
  morningBriefing: true,
  billReminders: true,
  budgetMilestones: true,
  weeklyRecap: true,
  monthlyReport: true,
  achievements: true,
  smartTips: true,
  spendingAlerts: true,
  syncStatus: false,
  dailyLimit: 3,
  quietStart: 22,
  quietEnd: 7,
  sound: true,
  vibration: true,
};

/**
 * @returns {typeof DEFAULT_PREFS}
 */
export function getNotifPrefs() {
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem('monefyi_notif_prefs') || '{}') };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

/**
 * @param {Partial<typeof DEFAULT_PREFS>} updates
 * @returns {typeof DEFAULT_PREFS}
 */
export function updateNotifPrefs(updates) {
  const merged = { ...getNotifPrefs(), ...updates };
  if (typeof merged.dailyLimit === 'number') {
    merged.dailyLimit = Math.min(HARD_DAILY_MAX, Math.max(1, merged.dailyLimit));
  }
  localStorage.setItem('monefyi_notif_prefs', JSON.stringify(merged));
  return merged;
}

/**
 * @returns {Promise<{granted:boolean,permission?:string,reason?:string,message?:string}>}
 */
export async function requestPermission() {
  if (!('Notification' in window)) {
    return { granted: false, reason: 'not_supported' };
  }
  if (Notification.permission === 'granted') {
    return { granted: true, permission: 'granted' };
  }
  if (Notification.permission === 'denied') {
    return {
      granted: false,
      reason: 'denied',
      message: 'Notifikasi diblokir. Aktifkan di pengaturan browser.',
    };
  }
  const result = await Notification.requestPermission();
  return { granted: result === 'granted', permission: result };
}

/**
 * @returns {{supported:boolean,permission:string,swRegistered:boolean,prefs:object}}
 */
export function getNotifStatus() {
  return {
    supported: 'Notification' in window,
    permission: typeof Notification !== 'undefined' ? Notification.permission : 'denied',
    swRegistered: !!navigator.serviceWorker?.controller,
    prefs: getNotifPrefs(),
  };
}

/**
 * @returns {boolean}
 */
function isQuietHour() {
  const prefs = getNotifPrefs();
  const hour = new Date().getHours();
  const start = Number(prefs.quietStart ?? 22);
  const end = Number(prefs.quietEnd ?? 7);
  if (start > end) return hour >= start || hour < end;
  return hour >= start && hour < end;
}

/**
 * @returns {boolean}
 */
function isDailyLimitReached() {
  const prefs = getNotifPrefs();
  const limit = Math.min(HARD_DAILY_MAX, Number(prefs.dailyLimit) || HARD_DAILY_MAX);
  const today = new Date().toISOString().split('T')[0];
  try {
    const log = JSON.parse(localStorage.getItem('monefyi_notif_log') || '{}');
    return (log[today] || []).length >= limit;
  } catch {
    return false;
  }
}

/**
 * @param {string} tag
 * @returns {boolean}
 */
function isNotifDuplicate(tag) {
  if (!tag) return false;
  try {
    const log = JSON.parse(localStorage.getItem('monefyi_notif_sent') || '{}');
    const lastSent = log[tag];
    if (!lastSent) return false;
    return Date.now() - lastSent < DEDUP_MS;
  } catch {
    return false;
  }
}

/**
 * @param {string} [categoryKey]
 * @returns {boolean}
 */
export function isCategoryEnabled(categoryKey) {
  const prefs = getNotifPrefs();
  if (prefs.enabled === false) return false;
  if (!categoryKey) return true;
  if (prefs[categoryKey] === false) return false;
  return true;
}

/**
 * @param {string} tag
 * @param {string} title
 * @param {object} [extra]
 * @param {{ countDaily?: boolean }} [opts]
 */
async function logNotification(tag, title, extra = {}, opts = {}) {
  const countDaily = opts.countDaily !== false;
  try {
    const sent = JSON.parse(localStorage.getItem('monefyi_notif_sent') || '{}');
    sent[tag] = Date.now();
    for (const key of Object.keys(sent)) {
      if (Date.now() - sent[key] > 24 * 60 * 60 * 1000) delete sent[key];
    }
    localStorage.setItem('monefyi_notif_sent', JSON.stringify(sent));

    if (countDaily) {
      const today = new Date().toISOString().split('T')[0];
      const log = JSON.parse(localStorage.getItem('monefyi_notif_log') || '{}');
      if (!log[today]) log[today] = [];
      log[today].push({ tag, title, time: Date.now() });
      const cutoff = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
      for (const day of Object.keys(log)) {
        if (day < cutoff) delete log[day];
      }
      localStorage.setItem('monefyi_notif_log', JSON.stringify(log));
    }

    try {
      const { addNotification } = await import('./notification-center.js');
      await addNotification({
        type: extra.type || 'system',
        title,
        message: extra.body || '',
        icon: extra.iconEmoji || '🔔',
        dedupKey: tag,
        source: 'push',
        severity: extra.severity || 'medium',
        actions: extra.inboxActions || [],
      });
    } catch { /* inbox optional */ }
  } catch (e) {
    console.warn('[push] Log failed:', e);
  }
}

/**
 * @param {object} options
 */
async function queueNotification(options) {
  try {
    const queued = JSON.parse(localStorage.getItem('monefyi_notif_queue') || '[]');
    queued.push({ ...options, queuedAt: Date.now() });
    localStorage.setItem('monefyi_notif_queue', JSON.stringify(queued.slice(-10)));
  } catch { /* ignore */ }
}

/**
 * Process queued notifications after quiet hours.
 */
export async function processQueue() {
  try {
    const queued = JSON.parse(localStorage.getItem('monefyi_notif_queue') || '[]');
    if (!queued.length) return;
    const now = Date.now();
    const valid = queued.filter((q) => now - q.queuedAt < 12 * 60 * 60 * 1000);
    localStorage.setItem('monefyi_notif_queue', '[]');
    for (const notif of valid) {
      await showNotification({ ...notif, urgent: true });
    }
  } catch { /* ignore */ }
}

/**
 * Show OS notification (SW preferred) + inbox dual-write.
 * @param {object} options
 * @returns {Promise<{sent:boolean,method?:string,error?:string,skipped?:string}|null>}
 */
export async function showNotification(options) {
  const {
    title,
    body,
    icon = ICON,
    badge = BADGE,
    tag,
    data = {},
    actions = [],
    silent = false,
    requireInteraction = false,
    renotify = false,
    urgent = false,
    force = false,
    categoryKey,
    type = 'system',
    iconEmoji = '🔔',
    severity = 'medium',
    inboxActions = [],
  } = options;

  if (!title) return null;

  const bypassGates = force || urgent || _forceBypass;

  // Category prefs: skip when force/bypass so test helpers always work
  if (!bypassGates && !isCategoryEnabled(categoryKey)) {
    return { sent: false, skipped: 'category_disabled' };
  }

  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
    // Still dual-write inbox when permission missing (in-app only; don't burn OS daily limit)
    const t = tag || `monefyi-${Date.now()}`;
    if (!isNotifDuplicate(t) || bypassGates) {
      await logNotification(t, title, { body, type, iconEmoji, severity, inboxActions }, { countDaily: false });
    }
    return { sent: false, skipped: 'no_permission' };
  }

  const notifTag = tag || `monefyi-${Date.now()}`;

  if (!bypassGates) {
    if (isNotifDuplicate(notifTag)) {
      return { sent: false, skipped: 'duplicate' };
    }
    if (isQuietHour()) {
      await queueNotification({ ...options, tag: notifTag });
      return { sent: false, skipped: 'quiet_hours', queued: true };
    }
    if (isDailyLimitReached()) {
      return { sent: false, skipped: 'daily_limit' };
    }
  }

  const prefs = getNotifPrefs();
  const useVibrate = prefs.vibration !== false && !silent;
  const useSilent = silent || prefs.sound === false;

  try {
    const reg = await navigator.serviceWorker?.getRegistration?.();
    if (reg?.showNotification) {
      await reg.showNotification(title, {
        body,
        icon,
        badge,
        tag: notifTag,
        data: { ...data, url: data.url || '/app/', timestamp: Date.now() },
        actions: (actions || []).slice(0, 2),
        silent: useSilent,
        requireInteraction,
        renotify,
        vibrate: useVibrate ? [200, 100, 200] : undefined,
      });
      await logNotification(
        notifTag,
        title,
        { body, type, iconEmoji, severity, inboxActions },
        { countDaily: !(force || _forceBypass) },
      );
      return { sent: true, method: 'service_worker' };
    }

    const notif = new Notification(title, {
      body,
      icon,
      badge,
      tag: notifTag,
      data,
      silent: useSilent,
    });
    notif.onclick = () => {
      try { window.focus(); } catch { /* ignore */ }
      if (data.url) {
        window.dispatchEvent(new CustomEvent('monefyi-notif-navigate', { detail: data }));
      }
    };
    await logNotification(
      notifTag,
      title,
      { body, type, iconEmoji, severity, inboxActions },
      { countDaily: !(force || _forceBypass) },
    );
    return { sent: true, method: 'notification_api' };
  } catch (e) {
    console.error('[push] Send failed:', e);
    return { sent: false, error: e.message };
  }
}

if (typeof window !== 'undefined') {
  window.monefyiPush = {
    requestPermission,
    showNotification,
    processQueue,
    getNotifPrefs,
    updateNotifPrefs,
    getNotifStatus,
    isCategoryEnabled,
    setForceBypass,

    /** One-shot test notification (bypasses quiet hours / limits). */
    test: async (title = 'Test Monefyi', body = 'Notifikasi berhasil!') => showNotification({
      title,
      body,
      tag: `test_${Date.now()}`,
      force: true,
      data: { url: '/app/#home' },
    }),

    /** Sample morning briefing (force only — does not mutate quiet prefs). */
    testMorning: async () => showNotification({
      title: 'Test Morning Briefing',
      body: 'Ini simulasi notifikasi pagi.',
      tag: `test_morning_${Date.now()}`,
      force: true,
      categoryKey: 'morningBriefing',
      type: 'system',
      data: { url: '/app/#home' },
    }),

    /** Fire 5 sample notifications, 2s apart. */
    testAll: async () => {
      const tests = [
        { title: 'Morning Briefing', body: 'Sisa budget harian: Rp 85.000', data: { url: '/app/#home' } },
        { title: 'Bill Reminder', body: 'Tagihan Listrik dalam 3 hari (Rp 300.000)', data: { url: '/app/#budget' } },
        { title: 'Spending Alert', body: 'Rp 500.000 untuk Shopping. Budget sisa 30%.', data: { url: '/app/#transactions' } },
        { title: 'Budget Milestone', body: 'Budget Food & Drink 90% terpakai!', data: { url: '/app/#budget' } },
        { title: 'Weekly Recap', body: 'Pengeluaran Rp 850.000 (turun 12% vs minggu lalu)', data: { url: '/app/#advisor' } },
      ];
      for (let i = 0; i < tests.length; i += 1) {
        setTimeout(() => {
          showNotification({
            ...tests[i],
            tag: `test_all_${i}_${Date.now()}`,
            force: true,
          }).catch(() => {});
        }, i * 2000);
      }
      return `Sending ${tests.length} test notifications...`;
    },
  };
}
