/**
 * Monevisor Client — unified API for insights, chat, actions.
 * Offline-first: heuristic fallback + local draft apply via STATE budgets.
 * @module services/monevisor-client
 */

const CACHE_KEY = 'monevisor_cache';
const _listeners = new Set();
let _state = {
  insights: null,
  loading: false,
  error: null,
  thread_id: 'default',
  messages: [],
  prefs: null,
};

function getCfg() {
  return window.MONEFYI_CONFIG || {};
}

function getSupabase() {
  return window.__monefyiSupabase || window.STATE?.db?.supa || null;
}

function getAccessToken() {
  return window.STATE?.db?.session?.access_token || null;
}

function functionsBase() {
  const url = (getCfg().supabaseUrl || '').replace(/\/+$/, '');
  return `${url}/functions/v1`;
}

/**
 * Initialize client (cache + optional prefs).
 */
export async function initMonevisor() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      _state = {
        ..._state,
        insights: parsed.insights || _state.insights,
        thread_id: parsed.thread_id || _state.thread_id,
        prefs: parsed.prefs || _state.prefs,
        messages: Array.isArray(parsed.messages) ? parsed.messages : _state.messages,
      };
    }
  } catch (_) { /* ignore */ }

  const supa = getSupabase();
  if (navigator.onLine && supa) {
    try {
      const { data } = await supa.from('monevisor_prefs').select('*').maybeSingle();
      if (data) _state.prefs = data;
    } catch (_) { /* table may not exist */ }
  }

  _notify();
  return getState();
}

export function getState() {
  return { ..._state, messages: [..._state.messages] };
}

export function onStateChange(callback) {
  _listeners.add(callback);
  return () => _listeners.delete(callback);
}

function _notify() {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      insights: _state.insights,
      thread_id: _state.thread_id,
      prefs: _state.prefs,
      messages: _state.messages.slice(-40),
    }));
  } catch (_) { /* ignore */ }
  _listeners.forEach((cb) => {
    try { cb(getState()); } catch (_) { /* ignore */ }
  });
}

/**
 * Generate insights with rich local context.
 * @param {object} [options]
 */
export async function generateInsights(options = {}) {
  _state.loading = true;
  _state.error = null;
  _notify();

  try {
    const context = await gatherContext(options);
    let result = null;

    if (navigator.onLine && getAccessToken()) {
      try {
        result = await callInsightsEdgeFn(context);
      } catch (e) {
        console.warn('[monevisor] edge insights failed, using heuristic:', e);
      }
    }

    if (!result) {
      const { generateInsights: localGen } = await import('./monevisor-heuristic.js');
      result = await localGen(context);
    }

    _state.insights = result;
    _state.loading = false;
    _notify();
    return result;
  } catch (e) {
    console.error('[monevisor] generate failed:', e);
    _state.error = e.message;
    _state.loading = false;
    try {
      const { generateInsights: localGen } = await import('./monevisor-heuristic.js');
      const context = await gatherContext(options);
      _state.insights = await localGen(context);
      _state.error = null;
    } catch (_) { /* ignore */ }
    _notify();
    return _state.insights;
  }
}

async function gatherContext(options = {}) {
  const state = window.STATE || {};
  const lang = options.lang || state.settings?.lang || 'id';

  const now = new Date();
  const periodStart = options.periodStart || state.period?.start
    || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const periodEnd = options.periodEnd || state.period?.end
    || new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  const month = periodEnd.slice(0, 7);

  let transactions = Array.isArray(state.transactions) ? state.transactions : [];
  try {
    const { getTransactions } = await import('./data-store.js');
    const fromDb = await getTransactions();
    if (fromDb?.length) transactions = fromDb;
  } catch (_) { /* use STATE */ }

  const periodTx = transactions.filter((t) => t.date >= periodStart && t.date <= periodEnd);

  const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
  const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
  const prevMonthTx = transactions.filter((t) => t.date >= prevStart && t.date <= prevEnd);

  const { rowsToBudgetList, calculateProgress } = await import('./budget-model.js');
  let rows = rowsToBudgetList(month, state.budgetsByMonth || {});
  if (!rows.length) {
    try {
      const { getBudgetRowsForMonth } = await import('./data-store.js');
      rows = await getBudgetRowsForMonth(month);
    } catch (_) { /* empty */ }
  }

  let incomeTotal = Number(state.budgetsByMonth?.[month]?.income || state.budgetDraft?.income || 0);
  let sources = [];
  try {
    const { getTotalIncome, getIncomeSources } = await import('./income-source.js');
    const fromSources = await getTotalIncome(month);
    if (fromSources > 0) incomeTotal = fromSources;
    sources = await getIncomeSources(month);
  } catch (_) { /* ignore */ }

  // Income from transactions as fallback
  if (!incomeTotal) {
    incomeTotal = periodTx
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + Number(t.amount || 0), 0);
  }

  const enrichedBudgets = (rows || []).map((b) => {
    const p = calculateProgress(b, periodTx, month);
    return {
      id: b.id,
      category: b.name || b.category,
      priority: b.priority || 'penting',
      amount: Number(b.amount || 0),
      spent: p.spent,
      remaining: p.remaining,
      percent_used: p.percentUsed,
      items: b.items,
    };
  });

  return {
    periodStart,
    periodEnd,
    start: periodStart,
    end: periodEnd,
    periodLabel: state.period?.label || `${periodStart} – ${periodEnd}`,
    lang,
    budgets: enrichedBudgets,
    income: { total: incomeTotal, sources },
    transactions: periodTx.slice(0, 200),
    previous_month_summary: summarize(prevMonthTx),
    user_prefs: _state.prefs,
  };
}

function summarize(transactions) {
  const income = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount || 0), 0);
  const expense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount || 0), 0);
  return {
    income,
    expense,
    savings: income - expense,
    saving_rate: income > 0 ? (income - expense) / income : 0,
  };
}

async function callInsightsEdgeFn(context) {
  const token = getAccessToken();
  if (!token) throw new Error('Not authenticated');
  const fn = getCfg().fnInsights || 'monefyi-generate-insights';
  const response = await fetch(`${functionsBase()}/${fn}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(context),
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}

/**
 * Send chat message.
 * @param {string} message
 * @param {object} [options]
 */
export async function sendMessage(message, options = {}) {
  const userMsg = {
    id: `msg_${crypto.randomUUID()}`,
    role: 'user',
    content: message,
    timestamp: new Date().toISOString(),
  };
  _state.messages.push(userMsg);
  _notify();

  try {
    if (!navigator.onLine || !getAccessToken()) throw new Error('offline');

    const fn = getCfg().fnCoach || 'ai-user-coach';
    const state = window.STATE || {};
    const response = await fetch(`${functionsBase()}/${fn}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAccessToken()}`,
      },
      body: JSON.stringify({
        message,
        thread_id: _state.thread_id || 'default',
        context: options.context || {},
        start: state.period?.start,
        end: state.period?.end,
        budgetMonth: (state.period?.end || '').slice(0, 7),
        lang: state.settings?.lang || 'id',
      }),
    });

    if (!response.ok) throw new Error(`Chat error: ${response.status}`);
    const result = await response.json();

    const assistantMsg = {
      id: `msg_${crypto.randomUUID()}`,
      role: 'assistant',
      content: result.reply || result.error || 'Maaf, respon tidak valid.',
      timestamp: new Date().toISOString(),
      suggested_actions: result.suggested_actions || [],
      quick_replies: result.quick_replies || [],
      isError: result.ok === false,
    };

    _state.messages.push(assistantMsg);
    if (result.thread_id) _state.thread_id = result.thread_id;
    _notify();
    return assistantMsg;
  } catch (e) {
    const errorMsg = {
      id: `msg_${crypto.randomUUID()}`,
      role: 'assistant',
      content: e.message === 'offline'
        ? 'Kamu sedang offline. Chat butuh internet, tapi kamu tetap bisa lihat insight terakhir.'
        : `Gagal: ${e.message}`,
      timestamp: new Date().toISOString(),
      isError: true,
    };
    _state.messages.push(errorMsg);
    _notify();
    return errorMsg;
  }
}

/**
 * Apply action from insight/chat — prefer local draft, try edge when online.
 * @param {object} action
 * @param {object} [options]
 */
export async function applyAction(action, options = {}) {
  if (!action?.type) throw new Error('Invalid action');

  if (action.type === 'view_category' || action.type === 'ask_deeper') {
    return { success: true, deferred: true, action };
  }

  // Always try local first for snappy UX / offline
  let localResult = null;
  try {
    localResult = await applyActionLocal(action);
  } catch (e) {
    console.warn('[monevisor] local apply failed:', e);
  }

  if (navigator.onLine && getAccessToken() && !['view_category', 'ask_deeper'].includes(action.type)) {
    try {
      const response = await fetch(`${functionsBase()}/monevisor-apply-action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAccessToken()}`,
        },
        body: JSON.stringify({
          action_type: action.type,
          payload: action.payload,
          source: options.source || 'insight',
          message_id: options.messageId,
        }),
      });
      if (response.ok) {
        const remote = await response.json();
        setTimeout(() => generateInsights(), 400);
        return remote;
      }
    } catch (e) {
      console.warn('[monevisor] remote apply failed:', e);
    }
  }

  if (localResult) {
    setTimeout(() => generateInsights(), 400);
    return localResult;
  }
  throw new Error(`Cannot apply ${action.type}`);
}

async function applyActionLocal(action) {
  const state = window.STATE || {};
  const payload = action.payload || {};
  const month = String(payload.month || state.period?.end || '').slice(0, 7)
    || new Date().toISOString().slice(0, 7);

  const { rowsToBudgetList, serializeBudgetRows } = await import('./budget-model.js');
  const { saveBudgetRowsLocal } = await import('./data-store.js');

  let rows = rowsToBudgetList(month, state.budgetsByMonth || {});
  if (!rows.length && state.budgetDraft?.rows) {
    rows = state.budgetDraft.rows.map((r) => ({ ...r }));
  } else {
    rows = rows.map((r) => ({ ...r }));
  }

  const income = Number(
    state.budgetDraft?.income
    ?? state.budgetsByMonth?.[month]?.income
    ?? 0,
  );

  const findRow = (idOrName) => rows.find(
    (r) => r.id === idOrName || r.name === idOrName || r.category === idOrName,
  );

  switch (action.type) {
    case 'reallocate': {
      const amount = Math.round(Number(payload.amount || 0));
      const from = findRow(payload.from_budget_id || payload.from_category || payload.from);
      const to = findRow(payload.to_budget_id || payload.to_category || payload.to);
      if (!from || !to || amount <= 0) throw new Error('Invalid reallocate');
      from.amount = Math.max(0, Number(from.amount || 0) - amount);
      to.amount = Number(to.amount || 0) + amount;
      break;
    }
    case 'increase_budget':
    case 'decrease_budget': {
      const row = findRow(payload.budget_id || payload.category || payload.name);
      if (!row) throw new Error('Budget row not found');
      row.amount = Math.max(0, Math.round(Number(payload.new_amount ?? payload.amount ?? 0)));
      break;
    }
    case 'create_budget': {
      rows.push({
        id: payload.id || `bud_${crypto.randomUUID()}`,
        name: payload.category || payload.name || 'Baru',
        amount: Math.round(Number(payload.amount || payload.new_amount || 0)),
        priority: payload.priority || 'penting',
        items: payload.items || [],
      });
      break;
    }
    case 'set_goal': {
      await updatePrefs(payload);
      return { success: true, local: true };
    }
    default:
      throw new Error(`Cannot apply ${action.type} offline`);
  }

  // Update draft in memory for budget page
  if (state.budgetDraft) {
    state.budgetDraft.month = month;
    state.budgetDraft.rows = rows;
    state.budgetDraft.income = income;
    state.budgetDraft.dirty = true;
  }

  await saveBudgetRowsLocal(month, income, rows);

  // Persist to Supabase if helper available
  try {
    if (typeof window.saveBudgetMonth === 'function') {
      await window.saveBudgetMonth(month, income, { rows: serializeBudgetRows(rows) });
    } else if (state.db?.supa && state.db?.user?.id) {
      await state.db.supa.from('budgets').upsert({
        user_id: state.db.user.id,
        month,
        income,
        categories: { rows: serializeBudgetRows(rows) },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,month' });
      state.budgetsByMonth = state.budgetsByMonth || {};
      state.budgetsByMonth[month] = {
        income,
        categories: { rows: serializeBudgetRows(rows) },
        updated_at: new Date().toISOString(),
      };
    }
  } catch (e) {
    console.warn('[monevisor] cloud budget sync deferred:', e);
  }

  try {
    window.renderBudgetPageView?.();
  } catch (_) { /* ignore */ }

  return { success: true, local: true };
}

/**
 * @param {object} updates
 */
export async function updatePrefs(updates) {
  _state.prefs = { ...(_state.prefs || {}), ...updates };
  _notify();

  const supa = getSupabase();
  const userId = window.STATE?.db?.user?.id || window.currentUser?.id;
  if (navigator.onLine && supa && userId) {
    try {
      await supa.from('monevisor_prefs').upsert({
        user_id: userId,
        ...updates,
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('[monevisor] update prefs failed:', e);
    }
  }
}

/**
 * @param {string} [threadId]
 */
export async function loadMessageHistory(threadId = 'default') {
  const supa = getSupabase();
  if (!navigator.onLine || !supa) return;

  try {
    const { data } = await supa
      .from('monevisor_messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })
      .limit(50);

    if (data?.length) {
      _state.messages = data.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.created_at,
        suggested_actions: m.metadata?.suggested_actions || [],
        quick_replies: m.metadata?.quick_replies || [],
      }));
      _state.thread_id = threadId;
      _notify();
    }
  } catch (e) {
    console.warn('[monevisor] load history failed:', e);
  }
}

export function clearConversation() {
  _state.messages = [];
  _state.thread_id = 'default';
  _notify();
}

if (typeof window !== 'undefined') {
  window.monefyiMonevisor = {
    initMonevisor,
    getState,
    onStateChange,
    generateInsights,
    sendMessage,
    applyAction,
    updatePrefs,
    loadMessageHistory,
    clearConversation,
  };
}
