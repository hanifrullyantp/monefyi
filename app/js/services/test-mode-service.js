/**
 * Admin test mode — impersonate test user via edge proxy.
 * @module services/test-mode-service
 */

const LS_SESSION = 'monefyi_admin_test_session';

/**
 * @returns {boolean}
 */
export function isTestModeActive() {
  return Boolean(window.STATE?.testMode?.active);
}

/**
 * @returns {string|null}
 */
export function getTestUserId() {
  return window.STATE?.testMode?.testUserId || null;
}

function cfg() {
  return window.MONEFYI_CONFIG || {};
}

/**
 * @param {string} fnName
 * @param {object} body
 */
async function edgePost(fnName, body) {
  const token = window.STATE?.db?.session?.access_token
    || (await window.STATE?.db?.supa?.auth.getSession())?.data?.session?.access_token;
  if (!token) throw new Error('Not authenticated');

  const url = `${cfg().supabaseUrl}/functions/v1/${fnName}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

/**
 * @param {object} bundle
 */
function hydrateStateFromBundle(bundle, sessionMeta = {}) {
  const state = window.STATE;
  if (!state) return;

  state._adminBackup = {
    transactions: state.transactions,
    budgetsByMonth: state.budgetsByMonth,
    dbUserPrefs: state.db?.userPreferences,
    selectedMonth: state.selectedMonth,
  };

  state.transactions = bundle.transactions || [];
  state.budgetsByMonth = bundle.budgetsByMonth || {};
  if (state.db) {
    state.db.userPreferences = bundle.userPreferences || {};
  }

  state.testMode = {
    active: true,
    testUserId: sessionMeta.testUserId,
    sessionId: sessionMeta.sessionId,
    scenarioLabel: bundle.profile?.test_scenario_label || sessionMeta.scenarioLabel || 'test',
    defaultMonth: bundle.defaultMonth || sessionMeta.defaultMonth || '2026-08',
    adminUserId: state.db?.user?.id,
  };

  try {
    localStorage.setItem(LS_SESSION, JSON.stringify({
      testUserId: state.testMode.testUserId,
      sessionId: state.testMode.sessionId,
      defaultMonth: state.testMode.defaultMonth,
      scenarioLabel: state.testMode.scenarioLabel,
    }));
  } catch { /* ignore */ }

  const month = state.testMode.defaultMonth;
  if (typeof window.monefyiSetPeriodMonth === 'function') {
    window.monefyiSetPeriodMonth(month);
  } else {
    state.selectedMonth = month;
  }
}

/**
 * Start impersonation session for a test user.
 * @param {string} testUserId
 * @param {object} [opts]
 */
export async function startImpersonation(testUserId, opts = {}) {
  const fn = cfg().fnAdminTestLab || 'monefyi-admin-test-lab';
  const sessionRes = await edgePost(fn, {
    action: 'start_session',
    test_user_id: testUserId,
    scenario_id: opts.scenarioId || null,
  });

  const bundle = await edgePost(fn, {
    action: 'fetch_test_data',
    test_user_id: testUserId,
    default_month: opts.defaultMonth,
  });

  hydrateStateFromBundle(bundle, {
    testUserId,
    sessionId: sessionRes.session?.id,
    scenarioLabel: bundle.profile?.test_scenario_label,
    defaultMonth: opts.defaultMonth || bundle.defaultMonth,
  });

  window.dispatchEvent(new CustomEvent('monefyi:test-mode-changed', { detail: { active: true } }));

  try {
    const { renderTestModeChecklist } = await import('../components/test-mode-checklist.js');
    renderTestModeChecklist();
  } catch { /* ignore */ }

  if (typeof opts.onReady === 'function') opts.onReady();
  if (typeof window.rerender === 'function') window.rerender();

  return { session: sessionRes.session, bundle };
}

/**
 * End impersonation and restore admin data view.
 * @param {object} [opts]
 */
export async function endImpersonation(opts = {}) {
  const state = window.STATE;
  if (!state?.testMode?.active) return;

  const fn = cfg().fnAdminTestLab || 'monefyi-admin-test-lab';
  try {
    await edgePost(fn, {
      action: 'end_session',
      session_id: state.testMode.sessionId,
    });
  } catch { /* ignore */ }

  const backup = state._adminBackup;
  if (backup) {
    state.transactions = backup.transactions || [];
    state.budgetsByMonth = backup.budgetsByMonth || {};
    if (state.db && backup.dbUserPrefs) state.db.userPreferences = backup.dbUserPrefs;
    if (backup.selectedMonth) state.selectedMonth = backup.selectedMonth;
  }

  state.testMode = { active: false };
  delete state._adminBackup;

  try { localStorage.removeItem(LS_SESSION); } catch { /* ignore */ }

  window.dispatchEvent(new CustomEvent('monefyi:test-mode-changed', { detail: { active: false } }));

  document.getElementById('testModeChecklist')?.remove();

  if (opts.reload !== false && typeof opts.reloadFn === 'function') {
    await opts.reloadFn();
  } else if (typeof window.bootstrapAuthed === 'function') {
    await window.bootstrapAuthed();
  }

  if (typeof window.rerender === 'function') window.rerender();
}

/**
 * Proxy write during test mode.
 * @param {string} table
 * @param {string} op
 * @param {object} payload
 */
export async function proxyMutation(table, op, payload) {
  if (!isTestModeActive()) return null;
  const fn = cfg().fnAdminTestLab || 'monefyi-admin-test-lab';
  return edgePost(fn, {
    action: 'proxy_mutation',
    test_user_id: getTestUserId(),
    table,
    op,
    payload,
  });
}

/**
 * Call test lab edge function (admin panel).
 * @param {object} body
 */
export async function callTestLab(body) {
  const fn = cfg().fnAdminTestLab || 'monefyi-admin-test-lab';
  return edgePost(fn, body);
}

/**
 * Restore session hint after page reload (admin only).
 */
export async function tryRestoreSession() {
  const state = window.STATE;
  if (!state?.db?.user?.id) return false;
  let raw = null;
  try { raw = localStorage.getItem(LS_SESSION); } catch { /* ignore */ }
  if (!raw) return false;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed.testUserId) return false;
    await startImpersonation(parsed.testUserId, { defaultMonth: parsed.defaultMonth });
    return true;
  } catch {
    localStorage.removeItem(LS_SESSION);
    return false;
  }
}

if (typeof window !== 'undefined') {
  window.monefyiTestMode = {
    isTestModeActive,
    startImpersonation,
    endImpersonation,
    proxyMutation,
    callTestLab,
    tryRestoreSession,
  };
}
