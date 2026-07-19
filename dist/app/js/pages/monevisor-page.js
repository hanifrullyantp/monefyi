/**
 * Monevisor Financial Coach — full-page diagnosis UI.
 * Chat AI is secondary (collapsible).
 * @module pages/monevisor-page
 */

import { Icon } from '../components/icons.js';
import { buildFinancialReport } from '../services/financial-report.js';
import { diagnoseFinancials } from '../services/financial-diagnosis.js';
import { sendMessage, initMonevisor, loadMessageHistory } from '../services/monevisor-client.js';

let _root = null;
let _formatIDR = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;
let _pendingOptions = {};

/**
 * @param {HTMLElement} container
 * @param {object} [options]
 */
export async function renderMonevisorPage(container, options = {}) {
  if (!container) return;
  _root = container;
  _pendingOptions = options || {};
  if (typeof options.formatIDR === 'function') _formatIDR = options.formatIDR;

  ensureCss();
  container.className = 'monevisor-page';
  container.innerHTML = `
    <div class="mv-loading">
      <div class="mv-spinner"></div>
      <p>Menganalisis keuanganmu...</p>
    </div>
  `;

  try {
    await initMonevisor().catch(() => {});
    const report = await buildFinancialReport();
    const diagnosis = diagnoseFinancials(report);
    renderDiagnosis(container, report, diagnosis);

    if (options.prefillMessage || options.expandChat || options.focus) {
      setTimeout(() => {
        const details = container.querySelector('.mv-chat-collapse');
        if (details) details.open = true;
        const input = container.querySelector('#mv-input');
        if (input && options.prefillMessage) {
          input.value = options.prefillMessage;
          input.focus();
        }
      }, 200);
    }

    loadMessageHistory().catch(() => {});
  } catch (e) {
    console.error('[monevisor]', e);
    container.innerHTML = `
      <div class="mv-error">
        <p>Gagal memuat analisa</p>
        <button type="button" data-action="refresh">Retry</button>
      </div>
    `;
    container.querySelector('[data-action="refresh"]')?.addEventListener('click', () => {
      renderMonevisorPage(container, _pendingOptions);
    });
  }
}

/**
 * Re-render when filter/period changes.
 */
export async function refreshMonevisorPage() {
  if (!_root || !window.STATE?.ui?.monevisorPageOpen) return;
  try {
    const report = await buildFinancialReport();
    const diagnosis = diagnoseFinancials(report);
    renderDiagnosis(_root, report, diagnosis);
  } catch (e) {
    console.error('[monevisor] refresh failed', e);
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

function renderDiagnosis(container, report, dx) {
  const h = dx.health;
  const m = report.metrics || {};
  const income = Number(m.income ?? m.totalIncome ?? 0);
  const expense = Number(m.expense ?? m.totalExpense ?? 0);
  const net = Number(m.net ?? (income - expense));
  const savingRate = Number(m.saving_rate ?? m.savingRate ?? 0);
  const cats = report.categories || report.categoryBreakdown || [];
  const comparison = report.comparison
    ? {
      current: { expense: report.comparison.current?.expense ?? expense },
      previous: { expense: report.comparison.previous?.expense || 0 },
      changes: {
        expense: report.comparison.previous?.expense > 0
          ? ((expense - report.comparison.previous.expense) / report.comparison.previous.expense) * 100
          : null,
      },
    }
    : null;

  container.innerHTML = `
    <div class="mv-page">
      <header class="mv-header">
        <div class="mv-brand">
          <div class="mv-logo">${Icon('sparkles', { size: 18 })}</div>
          <div>
            <div class="mv-title">Monevisor</div>
            <div class="mv-period">${escapeHtml(report.periodLabel || '')}</div>
          </div>
        </div>
        <button type="button" class="mv-refresh" data-action="refresh" title="Refresh" aria-label="Refresh">
          ${Icon('refresh', { size: 18 })}
        </button>
      </header>

      <section class="mv-coach-card">
        <div class="mv-coach-text">${escapeHtml(dx.summary.greeting)}</div>
        <div class="mv-health-row">
          <div class="mv-health-ring-wrap">${renderHealthRing(h.score, h.color)}</div>
          <div class="mv-health-detail">
            <div class="mv-health-label" style="color:${h.color}">
              Kondisi Keuangan: ${escapeHtml(h.label)} (${h.score}/100)
            </div>
            <div class="mv-health-msg">${escapeHtml(h.message)}</div>
            ${h.factors?.length ? `
              <div class="mv-health-factors">
                ${h.factors.map((f) => `
                  <span class="mv-factor ${escapeHtml(f.status)}">${escapeHtml(f.name)}: ${escapeHtml(f.score)}</span>
                `).join('')}
              </div>
            ` : ''}
          </div>
        </div>
      </section>

      ${dx.dataQuality.quality !== 'good' ? `
        <section class="mv-data-quality">
          <div class="mv-dq-header">
            ${Icon('alertTriangle', { size: 14 })}
            <span>Kualitas Data: ${dx.dataQuality.quality === 'poor' ? 'Kurang' : 'Cukup'}</span>
          </div>
          <div class="mv-dq-issues">
            ${dx.dataQuality.issues.map((i) => `
              <div class="mv-dq-issue ${escapeHtml(i.severity)}">
                <span>${escapeHtml(i.message)}</span>
              </div>
            `).join('')}
          </div>
        </section>
      ` : ''}

      <section class="mv-metrics">
        ${renderMetricCard('Income', income, 'income', income === 0 ? 'Belum tercatat' : null)}
        ${renderMetricCard('Expense', expense, 'expense', null)}
        ${renderMetricCard('Net', net, net >= 0 ? 'positive' : 'negative', null)}
        ${renderMetricCard(
          'Saving',
          `${Math.round(savingRate * 100)}%`,
          savingRate >= 0.2 ? 'good' : savingRate >= 0.1 ? 'warning' : 'bad',
          savingRate >= 0.2 ? 'Target tercapai' : 'Target: 20%',
        )}
      </section>

      ${dx.diagnoses.filter(Boolean).length ? `
        <section class="mv-section">
          <h3 class="mv-section-title">${Icon('stethoscope', { size: 14 })} Diagnosa Keuangan</h3>
          <div class="mv-diagnoses">
            ${dx.diagnoses.filter(Boolean).map((d) => renderDiagnosisCard(d)).join('')}
          </div>
        </section>
      ` : ''}

      ${(dx.rule503020?.length || dx.benchmarks?.length) ? `
        <section class="mv-section">
          <h3 class="mv-section-title">${Icon('chartBar', { size: 14 })} Benchmark: Posisi Kamu vs Standar</h3>
          ${dx.rule503020?.length ? `
            <div class="mv-bench-subtitle">Aturan 50/30/20</div>
            <div class="mv-benchmarks mv-benchmarks--503020">
              ${dx.rule503020.map((b) => renderBenchmarkBar(b)).join('')}
            </div>
          ` : ''}
          <div class="mv-benchmarks">
            ${(dx.benchmarks || []).map((b) => renderBenchmarkBar(b)).join('')}
          </div>
        </section>
      ` : ''}

      ${dx.actionPlan.length ? `
        <section class="mv-section">
          <h3 class="mv-section-title">${Icon('target', { size: 14 })} Action Plan</h3>
          <div class="mv-actions">
            ${dx.actionPlan.map((a) => renderActionStep(a)).join('')}
          </div>
        </section>
      ` : ''}

      ${dx.projection?.message ? `
        <section class="mv-section">
          <h3 class="mv-section-title">${Icon('trendingUp', { size: 14 })} Proyeksi: Jika Konsisten</h3>
          <div class="mv-projection ${escapeHtml(dx.projection.type || 'neutral')}">
            ${dx.projection.title ? `<div class="mv-proj-title">${escapeHtml(dx.projection.title)}</div>` : ''}
            <div class="mv-proj-msg">${escapeHtml(dx.projection.message)}</div>
            ${dx.projection.chart ? renderProjectionChart(dx.projection) : ''}
            ${dx.projection.suggestion ? `
              <div class="mv-proj-sug">
                ${Icon('lightBulb', { size: 12 })}
                ${escapeHtml(dx.projection.suggestion)}
              </div>
            ` : ''}
          </div>
        </section>
      ` : ''}

      ${cats.length ? `
        <section class="mv-section">
          <h3 class="mv-section-title">${Icon('chartPie', { size: 14 })} Breakdown Pengeluaran</h3>
          <div class="mv-categories">
            ${cats.slice(0, 6).map((c, i) => `
              <div class="mv-cat-row">
                <span class="mv-cat-rank">${i + 1}</span>
                <div class="mv-cat-info">
                  <span class="mv-cat-name">${escapeHtml(c.category)}</span>
                  <div class="mv-cat-bar"><div style="width:${Math.min(c.percent || 0, 100)}%"></div></div>
                </div>
                <div class="mv-cat-val">
                  <div>${_formatIDR(c.amount)}</div>
                  <div class="mv-cat-pct">${Math.round(c.percent || 0)}%</div>
                </div>
              </div>
            `).join('')}
          </div>
        </section>
      ` : ''}

      ${comparison ? `
        <section class="mv-section">
          <h3 class="mv-section-title">${Icon('calendar', { size: 14 })} vs Bulan Lalu</h3>
          <div class="mv-compare-grid">
            <div class="mv-compare-col">
              <div class="mv-compare-period">Bulan Ini</div>
              <div class="mv-compare-amt expense">${_formatIDR(comparison.current.expense)}</div>
            </div>
            <div class="mv-compare-col">
              <div class="mv-compare-period">Bulan Lalu</div>
              <div class="mv-compare-amt">${_formatIDR(comparison.previous.expense)}</div>
            </div>
            ${comparison.changes.expense !== null ? `
              <div class="mv-compare-delta ${comparison.changes.expense > 0 ? 'up' : 'down'}">
                ${comparison.changes.expense > 0 ? '↑' : '↓'}
                ${Math.round(Math.abs(comparison.changes.expense))}%
              </div>
            ` : ''}
          </div>
        </section>
      ` : ''}

      <section class="mv-section mv-chat-section">
        <details class="mv-chat-collapse">
          <summary class="mv-chat-trigger">
            ${Icon('sparkles', { size: 14 })}
            <span>Tanya Monevisor AI</span>
            <span class="mv-ai-badge">AI</span>
          </summary>
          <div class="mv-chat-body">
            <div class="mv-chat-msgs" id="mv-msgs"></div>
            <div class="mv-chat-starters" id="mv-starters">
              <button type="button" class="mv-starter" data-q="Kenapa saving rate saya rendah?">Kenapa saving rate rendah?</button>
              <button type="button" class="mv-starter" data-q="Kategori mana yang perlu dikurangi?">Kategori mana dikurangi?</button>
              <button type="button" class="mv-starter" data-q="Buatkan rencana keuangan bulan depan">Rencana bulan depan</button>
            </div>
            <div class="mv-chat-input">
              <input type="text" id="mv-input" placeholder="Tanya apapun..." autocomplete="off" />
              <button type="button" id="mv-send" aria-label="Kirim">${Icon('check', { size: 14 })}</button>
            </div>
          </div>
        </details>
      </section>

      <div class="mv-spacer"></div>
    </div>
  `;

  wireHandlers(container);
}

function renderHealthRing(score, color) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - score / 100);
  return `
    <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden="true">
      <circle cx="36" cy="36" r="${r}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="6"/>
      <circle cx="36" cy="36" r="${r}" fill="none" stroke="${color}" stroke-width="6"
              stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${offset}"
              transform="rotate(-90 36 36)" class="mv-ring-anim"/>
      <text x="36" y="40" text-anchor="middle" fill="white" font-size="18" font-weight="800">${score}</text>
    </svg>
  `;
}

function renderProjectionChart(projection) {
  const points = projection.chart || [];
  if (points.length < 2) return '';

  const w = 280;
  const h = 100;
  const pad = 8;
  const values = points.map((p) => p.value);
  const min = Math.min(0, ...values);
  const max = Math.max(...values, 1);
  const range = max - min || 1;

  const coords = points.map((p, i) => {
    const x = pad + (i / (points.length - 1)) * (w - pad * 2);
    const y = h - pad - ((p.value - min) / range) * (h - pad * 2);
    return { x, y };
  });

  const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x},${c.y}`).join(' ');
  const area = `${line} L${coords[coords.length - 1].x},${h - pad} L${coords[0].x},${h - pad} Z`;
  const stroke = projection.type === 'negative' ? '#ef4444' : '#10b981';
  const fill = projection.type === 'negative' ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.15)';
  const last = coords[coords.length - 1];

  return `
    <div class="mv-proj-chart" role="img" aria-label="Proyeksi 12 bulan">
      <svg viewBox="0 0 ${w} ${h}" width="100%" height="100">
        <path d="${area}" fill="${fill}"/>
        <path d="${line}" fill="none" stroke="${stroke}" stroke-width="2.5" stroke-linecap="round"/>
        <circle cx="${last.x}" cy="${last.y}" r="4" fill="${stroke}"/>
      </svg>
      <div class="mv-proj-x">
        <span>1</span><span>6</span><span>12 bln</span>
      </div>
    </div>
  `;
}

function renderMetricCard(label, value, type, note) {
  const displayValue = typeof value === 'number'
    ? `${value < 0 ? '-' : ''}${_formatIDR(Math.abs(value))}`
    : escapeHtml(String(value));

  return `
    <div class="mv-metric ${escapeHtml(type)}">
      <div class="mv-metric-label">${escapeHtml(label)}</div>
      <div class="mv-metric-value">${displayValue}</div>
      ${note ? `<div class="mv-metric-note">${escapeHtml(note)}</div>` : ''}
    </div>
  `;
}

function renderDiagnosisCard(d) {
  const statusColors = {
    critical: '#ef4444',
    warning: '#f59e0b',
    good: '#10b981',
    excellent: '#10b981',
    info: '#3b82f6',
    neutral: '#6b7280',
  };
  const color = statusColors[d.status] || '#6b7280';
  const iconName = d.icon || 'sparkles';

  return `
    <div class="mv-dx-card" style="border-left-color:${color}">
      <div class="mv-dx-header">
        <div class="mv-dx-icon" style="color:${color}">${Icon(iconName, { size: 18 })}</div>
        <div>
          <div class="mv-dx-title">${escapeHtml(d.title)}</div>
          <div class="mv-dx-area">
            <span class="mv-dx-status" style="color:${color}">${escapeHtml(d.status)}</span>
            · ${escapeHtml(d.area)}
          </div>
        </div>
      </div>
      <div class="mv-dx-explain">${escapeHtml(d.explanation)}</div>
      ${d.benchmark ? `
        <div class="mv-dx-bench">
          ${Icon('chartBar', { size: 10 })}
          ${escapeHtml(d.benchmark)}
        </div>
      ` : ''}
      ${d.action ? `
        <button type="button" class="mv-dx-action" data-target="${escapeHtml(d.action.target || '')}" data-type="${escapeHtml(d.action.type || '')}">
          ${escapeHtml(d.action.label)}
          ${Icon('chevronRight', { size: 12 })}
        </button>
      ` : ''}
    </div>
  `;
}

function renderBenchmarkBar(b) {
  const maxVal = Math.max(b.yours || 0, b.ideal || 0, 1);
  const scale = b.lowerIsBetter ? (b.ideal || 1) * 1.5 : maxVal * 1.2;
  const yoursWidth = Math.min(100, ((b.yours || 0) / scale) * 100);
  const idealPos = Math.min(100, ((b.ideal || 0) / scale) * 100);
  const colors = { good: '#10b981', warning: '#f59e0b', bad: '#ef4444' };
  const color = colors[b.status] || '#6b7280';

  return `
    <div class="mv-bench-item">
      <div class="mv-bench-header">
        <span class="mv-bench-name">${escapeHtml(b.name)}</span>
        <span class="mv-bench-values">
          <span style="color:${color};font-weight:700">${b.yours}${escapeHtml(b.unit || '')}</span>
          <span class="mv-bench-sep">/</span>
          <span class="mv-bench-ideal">${b.ideal}${escapeHtml(b.unit || '')}</span>
        </span>
      </div>
      <div class="mv-bench-bar">
        <div class="mv-bench-fill" style="width:${yoursWidth}%;background:${color}"></div>
        <div class="mv-bench-marker" style="left:${idealPos}%" title="Ideal: ${b.ideal}${b.unit || ''}"></div>
      </div>
      ${b.description ? `<div class="mv-bench-desc">${escapeHtml(b.description)}</div>` : ''}
    </div>
  `;
}

function renderActionStep(a) {
  const urgencyColors = { high: '#ef4444', medium: '#f59e0b', low: '#10b981' };
  const color = urgencyColors[a.urgency] || '#6b7280';

  return `
    <div class="mv-action-step">
      <div class="mv-action-num" style="background:${color}20;color:${color}">${a.step}</div>
      <div class="mv-action-body">
        <div class="mv-action-title">${escapeHtml(a.title)}</div>
        <div class="mv-action-desc">${escapeHtml(a.description)}</div>
        ${a.target ? `
          <button type="button" class="mv-action-btn" data-target="${escapeHtml(a.target)}" data-type="navigate">
            Lakukan ${Icon('chevronRight', { size: 12 })}
          </button>
        ` : ''}
      </div>
    </div>
  `;
}

function wireHandlers(container) {
  container.querySelector('[data-action="refresh"]')?.addEventListener('click', async () => {
    await renderMonevisorPage(container, _pendingOptions);
  });

  container.querySelectorAll('[data-target]').forEach((btn) => {
    btn.addEventListener('click', () => handleNavigation(btn.dataset.target));
  });

  const input = container.querySelector('#mv-input');
  const sendBtn = container.querySelector('#mv-send');
  const msgs = container.querySelector('#mv-msgs');
  const starters = container.querySelector('#mv-starters');

  const doSend = async (text) => {
    if (!text?.trim() || !msgs) return;
    if (input) input.value = '';
    if (starters) starters.style.display = 'none';

    msgs.innerHTML += `<div class="mv-msg-user"><div class="mv-bubble">${escapeHtml(text)}</div></div>`;
    msgs.innerHTML += `
      <div class="mv-msg-ai" id="mv-typing">
        <div class="mv-bubble"><div class="mv-dots"><span></span><span></span><span></span></div></div>
      </div>
    `;
    msgs.scrollTop = msgs.scrollHeight;

    try {
      const reply = await sendMessage(text);
      container.querySelector('#mv-typing')?.remove();
      const content = escapeHtml(reply?.content || '').replace(/\n/g, '<br>');
      msgs.innerHTML += `<div class="mv-msg-ai${reply?.isError ? ' error' : ''}"><div class="mv-bubble">${content}</div></div>`;
    } catch (_) {
      container.querySelector('#mv-typing')?.remove();
      msgs.innerHTML += `
        <div class="mv-msg-ai error">
          <div class="mv-bubble">${navigator.onLine ? 'Gagal mengirim' : 'Butuh internet untuk chat AI'}</div>
        </div>
      `;
    }
    msgs.scrollTop = msgs.scrollHeight;
  };

  if (sendBtn) sendBtn.onclick = () => doSend(input?.value);
  if (input) {
    input.onkeydown = (e) => {
      if (e.key === 'Enter') doSend(input.value);
    };
  }
  container.querySelectorAll('.mv-starter').forEach((btn) => {
    btn.onclick = () => doSend(btn.dataset.q);
  });
}

function handleNavigation(target) {
  switch (target) {
    case 'budget':
      if (typeof window.openBudget === 'function') window.openBudget();
      else if (typeof window.toggleNav === 'function') window.toggleNav('budget');
      break;
    case 'transactions':
      if (typeof window.toggleNav === 'function') window.toggleNav('list');
      break;
    case 'income':
      import('../components/income-manager.js')
        .then((mod) => mod.showIncomeManagerModal())
        .catch((e) => console.error('[monevisor] income modal', e));
      break;
    case 'add-transaction':
      if (typeof window.openAddSheet === 'function') window.openAddSheet('quick');
      else if (typeof window.showAddTransactionUI === 'function') window.showAddTransactionUI();
      break;
    default:
      console.error('[monevisor] Unknown nav target:', target);
  }
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = String(s ?? '');
  return d.innerHTML;
}

if (typeof window !== 'undefined') {
  window.monefyiMonevisorPage = { renderMonevisorPage, refreshMonevisorPage };
}
