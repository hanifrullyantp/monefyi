/**
 * Admin Dashboard V2 — metrics, trends, alerts, insights.
 * @module pages/admin-dashboard
 */

import {
  fmtCurrency,
  fmtPct,
  sectionHeader,
  metricCard,
  renderInsightsPanel,
  wireInsightActions,
  renderAlerts,
  renderTrendChart,
  getAdminPeriod,
} from './admin-shared.js';

/**
 * @param {HTMLElement} body
 * @param {object} ctx
 */
export async function renderAdminDashboard(body, ctx = {}) {
  const escapeHtml = ctx.escapeHtml || ((s) => String(s ?? ''));
  const fmtNum = ctx.fmtNum || ((n) => String(n));
  const edgePost = ctx.edgePost;
  const toast = ctx.toast || (() => {});
  const navigate = ctx.navigate;
  const days = getAdminPeriod();

  body.innerHTML = '<p class="admin-muted">Memuat dashboard…</p>';

  const fn = (window.MONEFYI_CONFIG || {}).fnAdminAnalytics || 'monefyi-admin-analytics';
  let data;
  try {
    data = await edgePost(fn, { days });
  } catch (e) {
    body.innerHTML = `<div class="admin-card"><p class="admin-muted">Gagal memuat analytics: ${escapeHtml(e.message)}</p>
      <p class="admin-muted">Deploy edge function <code>monefyi-admin-analytics</code>.</p></div>`;
    return;
  }

  const m = data.metrics || {};
  const byPlan = data.by_plan || {};
  const revProd = data.revenue_by_product || {};
  const totalPlan = Object.values(byPlan).reduce((a, b) => a + Number(b), 0) || 1;
  const totalRev = Object.values(revProd).reduce((a, b) => a + Number(b), 0) || 1;

  body.innerHTML = `
    ${sectionHeader(
      '📊 Dashboard Overview',
      'Ringkasan performa bisnis Monefyi (user produksi, tanpa test user).',
      'Data diperbarui dari Supabase — periode bisa diubah di header.',
    )}
    <div class="admin-toolbar admin-toolbar--period">
      <span class="admin-muted">Periode: ${days} hari · Update ${new Date(data.updated_at).toLocaleString('id-ID')}</span>
    </div>

    <div class="admin-kpi-grid">
      ${metricCard({
        label: 'Total Users',
        value: fmtNum(m.total_users),
        delta: m.new_users_delta,
        trend: m.new_users_trend,
        tooltip: 'User terdaftar (bukan test user)',
      })}
      ${metricCard({
        label: 'Active Users',
        value: fmtNum(m.active_users),
        sub: `${m.activation_rate || 0}% activation`,
        delta: m.active_users_delta,
        trend: m.active_users_delta > 0 ? 'up' : m.active_users_delta < 0 ? 'down' : 'flat',
        tooltip: 'Login/transaksi minimal 1x dalam periode',
      })}
      ${metricCard({
        label: `Revenue ${days}d`,
        value: fmtCurrency(m.revenue_period),
        delta: m.revenue_delta,
        trend: m.revenue_trend,
        tooltip: 'Pembayaran confirmed dari lynk_orders',
      })}
      ${metricCard({
        label: 'Conv Rate',
        value: `${m.conversion_rate || 0}%`,
        sub: `AOV ${fmtCurrency(m.avg_order_value)}`,
        delta: m.conversion_delta,
        trend: m.conversion_delta > 0 ? 'up' : m.conversion_delta < 0 ? 'down' : 'flat',
        tooltip: 'Visitor → buyer (acquisition_events + orders)',
      })}
    </div>

    ${renderAlerts(data.alerts)}

    <div class="admin-grid-2">
      <div class="admin-card">
        <h2>User breakdown</h2>
        <p class="admin-muted">Distribusi plan saat ini.</p>
        <div class="admin-row-list">
          ${Object.entries(byPlan).filter(([, v]) => v > 0).map(([k, v]) => `
            <div class="admin-row">
              <span>${escapeHtml(k)}</span>
              <span><strong>${fmtNum(v)}</strong> <span class="admin-muted">(${Math.round((v / totalPlan) * 100)}%)</span></span>
            </div>
          `).join('') || '<p class="admin-muted">—</p>'}
        </div>
      </div>
      <div class="admin-card">
        <h2>Revenue breakdown</h2>
        <p class="admin-muted">Per produk / label order.</p>
        <div class="admin-row-list">
          ${Object.entries(revProd).map(([k, v]) => `
            <div class="admin-row">
              <span>${escapeHtml(k)}</span>
              <span><strong>${fmtCurrency(v)}</strong> <span class="admin-muted">(${Math.round((Number(v) / totalRev) * 100)}%)</span></span>
            </div>
          `).join('') || '<p class="admin-muted">Belum ada order</p>'}
        </div>
        <div class="admin-row" style="margin-top:8px;border-top:1px solid var(--mf-border)">
          <span>Total lifetime</span><strong>${fmtCurrency(m.revenue_lifetime)}</strong>
        </div>
      </div>
    </div>

    <div class="admin-card">
      <h2>Trend ${days} hari</h2>
      ${renderTrendChart(data.daily_trend, fmtNum)}
    </div>

    <div class="admin-card">
      <h2>Quick actions</h2>
      <div class="admin-toolbar">
        <button type="button" class="admin-btn ghost" data-go="marketing">Marketing & Funnel</button>
        <button type="button" class="admin-btn ghost" data-go="plans">Edit Pricing</button>
        <button type="button" class="admin-btn ghost" data-go="landing">Landing Page</button>
        <button type="button" class="admin-btn ghost" data-go="refunds">Refund Pending (${fmtNum(m.pending_refunds || 0)})</button>
        <button type="button" class="admin-btn ghost" data-go="testing">Testing Lab</button>
      </div>
    </div>

    <div class="admin-card" id="admLaunchGateCard"><p class="admin-muted">Memuat launch gate…</p></div>

    <div class="admin-card">
      <h2>AI Sales Advisor</h2>
      <p class="admin-muted">Rekomendasi rule-based dari data real (bukan LLM).</p>
      <div id="admInsightsHost">${renderInsightsPanel(data.insights)}</div>
    </div>
  `;

  body.querySelectorAll('[data-go]').forEach((b) => {
    b.addEventListener('click', () => navigate?.(b.getAttribute('data-go')));
  });
  wireInsightActions(body.querySelector('#admInsightsHost'), navigate);

  const gateCard = body.querySelector('#admLaunchGateCard');
  if (gateCard) {
    try {
      const { runLandingParityAudit } = await import('../services/landing-parity.js');
      const { evaluateLaunchReadiness } = await import('../services/launch-readiness.js');
      const audit = await runLandingParityAudit();
      const readiness = evaluateLaunchReadiness(window.STATE?.featureFlags || {});
      const scoreClass = readiness.ready ? 'parity-score--ready' : 'parity-score--not-ready';
      gateCard.innerHTML = `
        <div class="admin-toolbar" style="align-items:flex-end;margin-bottom:12px">
          <div>
            <h2 style="margin:0">Launch Gate</h2>
            <p class="admin-muted" style="margin:4px 0 0">${readiness.ready ? '✅ Siap launch' : '⚠️ Ada blocker'}</p>
          </div>
          <div class="parity-score ${scoreClass}">${readiness.score}%</div>
        </div>
        <div class="admin-row-list">
          ${readiness.checks.slice(0, 5).map((c) => `
            <div class="admin-row"><span>${c.ok ? '✅' : '❌'} ${escapeHtml(c.label)}</span></div>
          `).join('')}
        </div>
        <p class="admin-muted" style="margin-top:8px;font-size:11px">Parity: ${audit.criticalFails} critical fail</p>
      `;
    } catch (e) {
      gateCard.innerHTML = `<p class="admin-muted">${escapeHtml(e.message)}</p>`;
    }
  }
}
