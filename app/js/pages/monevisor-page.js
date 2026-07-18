/**
 * Monevisor full-page UI — financial report primary, chat secondary.
 * @module pages/monevisor-page
 */

import { Icon } from '../components/icons.js';
import { buildFinancialReport } from '../services/financial-report.js';
import {
  initMonevisor,
  getState as getMonevisorState,
  onStateChange,
  generateInsights,
  sendMessage,
  applyAction,
  clearConversation,
  loadMessageHistory,
} from '../services/monevisor-client.js';

let _root = null;
let _unsub = null;
let _chatExpanded = false;
let _pendingOptions = {};
let _report = null;
let _formatIDR = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;

/**
 * @param {HTMLElement} container
 * @param {object} [options]
 * @param {function} [options.formatIDR]
 * @param {string} [options.prefillMessage]
 * @param {boolean} [options.expandChat]
 * @param {string} [options.focus]
 * @param {string} [options.context]
 */
export async function renderMonevisorPage(container, options = {}) {
  if (!container) return;
  _root = container;
  _pendingOptions = options || {};
  if (typeof options.formatIDR === 'function') _formatIDR = options.formatIDR;

  ensureCss();
  container.className = 'monevisor-page';
  container.innerHTML = renderShell();

  _chatExpanded = !!(options.expandChat || options.prefillMessage || options.focus);

  await initMonevisor();
  if (_unsub) _unsub();
  _unsub = onStateChange((state) => paintChat(state));

  await refreshReport();
  wirePageHandlers();

  loadMessageHistory().catch(() => {});
  const mv = getMonevisorState();
  if (!mv.insights && !mv.loading) {
    setTimeout(() => generateInsights(), 200);
  } else {
    paintChat(mv);
  }

  if (options.prefillMessage) {
    setTimeout(() => {
      expandChat(true);
      const input = _root?.querySelector('#mvp-chat-input');
      if (input) {
        input.value = options.prefillMessage;
        input.focus();
      }
    }, 250);
  } else if (_chatExpanded) {
    expandChat(true);
  }
}

/**
 * Re-render report when filter/period changes.
 */
export async function refreshMonevisorPage() {
  if (!_root || !window.STATE?.ui?.monevisorPageOpen) return;
  await refreshReport();
}

async function refreshReport() {
  if (!_root) return;
  const reportEl = _root.querySelector('#mvp-report');
  if (reportEl) {
    reportEl.innerHTML = `<div class="mvp-loading">${Icon('refresh', { size: 18 })} Memuat laporan...</div>`;
  }
  try {
    _report = await buildFinancialReport();
    if (reportEl) reportEl.innerHTML = renderReport(_report);
    const periodEl = _root.querySelector('#mvp-period');
    if (periodEl) periodEl.textContent = _report.periodLabel || _report.month;
  } catch (e) {
    console.error('[monevisor-page] report failed:', e);
    if (reportEl) {
      reportEl.innerHTML = `<div class="mvp-empty">Gagal memuat laporan. Coba refresh.</div>`;
    }
  }
}

function ensureCss() {
  if (document.getElementById('monevisor-page-css')) return;
  const link = document.createElement('link');
  link.id = 'monevisor-page-css';
  link.rel = 'stylesheet';
  try {
    link.href = new URL('css/monevisor-page.css', document.baseURI).href;
  } catch (_) {
    link.href = '/app/css/monevisor-page.css';
  }
  document.head.appendChild(link);
}

function renderShell() {
  return `
    <header class="mvp-header">
      <div class="mvp-header-main">
        <div class="mvp-brand">
          <span class="mvp-brand-icon">${Icon('sparkles', { size: 20 })}</span>
          <div>
            <h1 class="mvp-title">Monevisor</h1>
            <p class="mvp-subtitle" id="mvp-period">Laporan keuangan</p>
          </div>
        </div>
        <button type="button" class="mvp-icon-btn" data-action="refresh-report" title="Refresh">
          ${Icon('refresh', { size: 16 })}
        </button>
      </div>
    </header>

    <div id="mvp-report" class="mvp-report" aria-label="Laporan keuangan"></div>

    <section class="mvp-chat-dock ${ _chatExpanded ? 'is-expanded' : '' }" id="mvp-chat-dock" aria-label="Chat Monevisor">
      <button type="button" class="mvp-chat-toggle" data-action="toggle-chat" aria-expanded="${_chatExpanded}">
        <span class="mvp-chat-toggle-left">
          ${Icon('sparkles', { size: 16 })}
          <span>Tanya Monevisor</span>
          <span class="mvp-chat-badge" id="mvp-chat-badge" hidden></span>
        </span>
        <span class="mvp-chat-chevron">${Icon('chevronDown', { size: 16 })}</span>
      </button>
      <div class="mvp-chat-body" id="mvp-chat-body">
        <div class="mvp-chat-insights" id="mvp-chat-insights"></div>
        <div class="mvp-chat-messages" id="mvp-chat-messages"></div>
        <div class="mvp-chat-starters" id="mvp-chat-starters"></div>
        <div class="mvp-chat-input-row">
          <input type="text" id="mvp-chat-input" placeholder="Tanya tentang laporan ini..." autocomplete="off" />
          <button type="button" class="mvp-send-btn" data-action="send-chat" title="Kirim">
            ${Icon('check', { size: 16 })}
          </button>
        </div>
        <p class="mvp-disclaimer">Bukan nasihat keuangan berlisensi. Analisis dari data lokalmu.</p>
      </div>
    </section>
  `;
}

function renderReport(report) {
  const m = report.metrics || {};
  const cats = report.categories || [];
  const top = report.topSpending || [];
  const budgets = report.budgets || [];
  const trend = report.dailyTrend || [];
  const cmp = report.comparison || {};
  const maxCat = cats[0]?.amount || 1;
  const maxDay = Math.max(1, ...trend.map((d) => d.expense));

  if (!m.count && !budgets.length) {
    return `
      <div class="mvp-empty">
        <div class="mvp-empty-icon">${Icon('chartBar', { size: 32 })}</div>
        <div class="mvp-empty-title">Belum ada data di periode ini</div>
        <div class="mvp-empty-text">Catat transaksi atau ubah filter periode untuk melihat laporan.</div>
      </div>
    `;
  }

  return `
    <section class="mvp-metrics">
      ${metricCard('Income', m.income, 'income', 'wallet')}
      ${metricCard('Expense', m.expense, 'expense', 'trendingDown')}
      ${metricCard('Net', m.net, m.net >= 0 ? 'positive' : 'negative', 'trendingUp')}
      ${metricCard('Saving', `${Math.round((m.saving_rate || 0) * 100)}%`, 'neutral', 'target', true)}
    </section>

    <section class="mvp-section">
      <h2 class="mvp-section-title">${Icon('chartBar', { size: 16 })} Breakdown Kategori</h2>
      ${cats.length ? `
        <div class="mvp-cat-list">
          ${cats.slice(0, 8).map((c) => `
            <div class="mvp-cat-row">
              <div class="mvp-cat-meta">
                <span class="mvp-cat-name">${escapeHtml(c.category)}</span>
                <span class="mvp-cat-amt">${_formatIDR(c.amount)} · ${c.percent}%</span>
              </div>
              <div class="mvp-bar"><div class="mvp-bar-fill" style="width:${Math.round((c.amount / maxCat) * 100)}%"></div></div>
            </div>
          `).join('')}
        </div>
      ` : `<div class="mvp-muted">Tidak ada pengeluaran di periode ini.</div>`}
    </section>

    <section class="mvp-section">
      <h2 class="mvp-section-title">${Icon('shoppingBag', { size: 16 })} Top Spending</h2>
      ${top.length ? `
        <div class="mvp-top-list">
          ${top.map((t) => `
            <div class="mvp-top-row">
              <div class="mvp-top-main">
                <div class="mvp-top-name">${escapeHtml(t.merchant)}</div>
                <div class="mvp-top-sub">${escapeHtml(t.category)} · ${escapeHtml(t.date)}</div>
              </div>
              <div class="mvp-top-amt">${_formatIDR(t.amount)}</div>
            </div>
          `).join('')}
        </div>
      ` : `<div class="mvp-muted">Belum ada pengeluaran besar.</div>`}
    </section>

    <section class="mvp-section">
      <h2 class="mvp-section-title">${Icon('budget', { size: 16 })} Budget vs Aktual</h2>
      ${budgets.length ? `
        <div class="mvp-budget-list">
          ${budgets.map((b) => {
            const pct = Math.min(100, Number(b.percent_used || 0));
            const status = b.status || 'healthy';
            return `
              <div class="mvp-budget-row status-${escapeHtml(status)}">
                <div class="mvp-budget-head">
                  <span>${escapeHtml(b.category)}</span>
                  <span>${pct}%</span>
                </div>
                <div class="mvp-bar"><div class="mvp-bar-fill mvp-bar-fill--${escapeHtml(status)}" style="width:${pct}%"></div></div>
                <div class="mvp-budget-foot">
                  ${_formatIDR(b.spent)} / ${_formatIDR(b.amount)}
                  <span class="mvp-priority">${escapeHtml(String(b.priority || '').toUpperCase())}</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      ` : `<div class="mvp-muted">Belum ada budget untuk bulan ini.</div>`}
    </section>

    <section class="mvp-section">
      <h2 class="mvp-section-title">${Icon('calendar', { size: 16 })} Tren Harian</h2>
      ${trend.length ? `
        <div class="mvp-trend" role="img" aria-label="Tren pengeluaran harian">
          ${trend.map((d) => {
            const h = Math.max(4, Math.round((d.expense / maxDay) * 72));
            return `<div class="mvp-trend-col" title="${escapeHtml(d.date)}: ${_formatIDR(d.expense)}">
              <div class="mvp-trend-bar" style="height:${h}px"></div>
            </div>`;
          }).join('')}
        </div>
        <div class="mvp-trend-legend">
          <span>Max hari: ${_formatIDR(maxDay)}</span>
          <span>${trend.length} hari</span>
        </div>
      ` : `<div class="mvp-muted">Tren belum tersedia.</div>`}
    </section>

    <section class="mvp-section">
      <h2 class="mvp-section-title">${Icon('refresh', { size: 16 })} Bandingkan Bulan</h2>
      <div class="mvp-compare">
        <div class="mvp-compare-card">
          <div class="mvp-compare-label">${escapeHtml(cmp.current?.month || report.month)}</div>
          <div class="mvp-compare-row"><span>Expense</span><strong>${_formatIDR(cmp.current?.expense || 0)}</strong></div>
          <div class="mvp-compare-row"><span>Income</span><strong>${_formatIDR(cmp.current?.income || 0)}</strong></div>
          <div class="mvp-compare-row"><span>Net</span><strong class="${(cmp.current?.net || 0) >= 0 ? 'pos' : 'neg'}">${_formatIDR(cmp.current?.net || 0)}</strong></div>
        </div>
        <div class="mvp-compare-card">
          <div class="mvp-compare-label">${escapeHtml(cmp.previous?.month || '—')}</div>
          <div class="mvp-compare-row"><span>Expense</span><strong>${_formatIDR(cmp.previous?.expense || 0)}</strong></div>
          <div class="mvp-compare-row"><span>Income</span><strong>${_formatIDR(cmp.previous?.income || 0)}</strong></div>
          <div class="mvp-compare-row"><span>Net</span><strong class="${(cmp.previous?.net || 0) >= 0 ? 'pos' : 'neg'}">${_formatIDR(cmp.previous?.net || 0)}</strong></div>
        </div>
      </div>
      <div class="mvp-compare-delta">
        Δ Expense ${fmtDelta(cmp.expenseDelta)} · Δ Net ${fmtDelta(cmp.netDelta)}
      </div>
    </section>
  `;
}

function metricCard(label, value, tone, icon, raw = false) {
  const display = raw ? escapeHtml(String(value)) : _formatIDR(value);
  return `
    <div class="mvp-metric tone-${tone}">
      <div class="mvp-metric-icon">${Icon(icon, { size: 16 })}</div>
      <div class="mvp-metric-label">${escapeHtml(label)}</div>
      <div class="mvp-metric-value">${display}</div>
    </div>
  `;
}

function fmtDelta(n) {
  const v = Number(n || 0);
  const sign = v > 0 ? '+' : '';
  return `${sign}${_formatIDR(v)}`;
}

function paintChat(state) {
  if (!_root) return;
  const insightsEl = _root.querySelector('#mvp-chat-insights');
  const messagesEl = _root.querySelector('#mvp-chat-messages');
  const startersEl = _root.querySelector('#mvp-chat-starters');
  const badge = _root.querySelector('#mvp-chat-badge');

  if (insightsEl) {
    if (state.loading && !state.insights) {
      insightsEl.innerHTML = `<div class="mvp-muted">Menyiapkan insight...</div>`;
    } else if (state.insights) {
      const i = state.insights;
      insightsEl.innerHTML = `
        <div class="mvp-insight-card">
          <div class="mvp-insight-greeting">${escapeHtml(i.greeting || 'Halo!')}</div>
          <div class="mvp-insight-story">${escapeHtml(i.story || i.summary || '')}</div>
          <div class="mvp-health-mini">
            Skor ${Number(i.healthScore || 0)} · ${escapeHtml(i.healthLabel || 'fair')}
          </div>
        </div>
      `;
    } else {
      insightsEl.innerHTML = '';
    }
  }

  if (messagesEl) {
    const msgs = state.messages || [];
    messagesEl.innerHTML = msgs.map((m) => `
      <div class="mvp-msg mvp-msg-${m.role}${m.isError ? ' is-error' : ''}">
        <div class="mvp-msg-bubble">${escapeHtml(m.content || '').replace(/\n/g, '<br>')}</div>
      </div>
    `).join('');
    if (msgs.length) {
      requestAnimationFrame(() => { messagesEl.scrollTop = messagesEl.scrollHeight; });
    }
  }

  if (startersEl) {
    const qs = state.insights?.suggested_questions || [];
    if ((!state.messages || !state.messages.length) && qs.length) {
      startersEl.innerHTML = qs.slice(0, 4).map((q) =>
        `<button type="button" class="mvp-starter" data-action="ask" data-q="${escapeHtml(q)}">${escapeHtml(q)}</button>`
      ).join('');
    } else {
      startersEl.innerHTML = '';
    }
  }

  if (badge) {
    const n = (state.messages || []).filter((m) => m.role === 'assistant').length;
    badge.hidden = n < 1 || _chatExpanded;
    badge.textContent = String(n);
  }
}

function expandChat(open) {
  _chatExpanded = !!open;
  const dock = _root?.querySelector('#mvp-chat-dock');
  const toggle = _root?.querySelector('.mvp-chat-toggle');
  if (dock) dock.classList.toggle('is-expanded', _chatExpanded);
  if (toggle) toggle.setAttribute('aria-expanded', String(_chatExpanded));
}

function wirePageHandlers() {
  if (!_root || _root.dataset.wired === '1') return;
  _root.dataset.wired = '1';

  _root.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn || !_root.contains(btn)) return;
    const action = btn.getAttribute('data-action');

    if (action === 'toggle-chat') {
      expandChat(!_chatExpanded);
      return;
    }
    if (action === 'refresh-report') {
      await refreshReport();
      generateInsights().catch(() => {});
      return;
    }
    if (action === 'send-chat') {
      await handleSend();
      return;
    }
    if (action === 'ask') {
      const q = btn.getAttribute('data-q') || '';
      const input = _root.querySelector('#mvp-chat-input');
      if (input) input.value = q;
      expandChat(true);
      await handleSend();
    }
  });

  _root.querySelector('#mvp-chat-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  });
}

async function handleSend() {
  const input = _root?.querySelector('#mvp-chat-input');
  const text = (input?.value || '').trim();
  if (!text) return;
  input.value = '';
  expandChat(true);
  await sendMessage(text, { context: { report: _report } });
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

if (typeof window !== 'undefined') {
  window.monefyiMonevisorPage = {
    renderMonevisorPage,
    refreshMonevisorPage,
    applyAction,
    clearConversation,
  };
}
