/**
 * Marketing analytics V2 — funnel, sales, AI advisor sections.
 * @module pages/admin-marketing-insights
 */

import {
  fmtCurrency,
  sectionHeader,
  renderInsightsPanel,
  wireInsightActions,
  renderFunnelVisual,
  getAdminPeriod,
} from './admin-shared.js';

/**
 * @param {HTMLElement} host
 * @param {object} ctx
 */
export async function renderMarketingInsightsV2(host, ctx = {}) {
  const escapeHtml = ctx.escapeHtml || ((s) => String(s ?? ''));
  const fmtNum = ctx.fmtNum || ((n) => String(n));
  const edgePost = ctx.edgePost;
  const navigate = ctx.navigate;
  const days = getAdminPeriod();

  host.innerHTML = '<p class="admin-muted">Memuat marketing analytics…</p>';

  const fn = (window.MONEFYI_CONFIG || {}).fnAdminAnalytics || 'monefyi-admin-analytics';
  let data;
  try {
    data = await edgePost(fn, { days });
  } catch (e) {
    host.innerHTML = `<div class="admin-card"><p class="admin-muted">${escapeHtml(e.message)}</p></div>`;
    return;
  }

  const m = data.metrics || {};
  const dropoffs = data.dropoffs || [];
  const revProd = data.revenue_by_product || {};
  const prodCounts = data.product_counts || {};

  host.innerHTML = `
    ${sectionHeader(
      '📣 Marketing & Sales Analytics',
      'Funnel landing → purchase, breakdown produk, dan rekomendasi optimasi.',
    )}

    <div class="admin-card">
      <h2>Sales funnel (${days} hari)</h2>
      <p class="admin-muted">Drop-off tinggi = area optimasi prioritas.</p>
      ${renderFunnelVisual(data.funnel, escapeHtml, fmtNum)}
      ${dropoffs.length ? `
        <div class="admin-dropoffs" style="margin-top:12px">
          <strong>Drop-off analysis</strong>
          ${dropoffs.map((d) => `
            <div class="admin-row">
              <span>${escapeHtml(d.from)} → ${escapeHtml(d.to)}</span>
              <span class="admin-badge ${d.severity === 'high' ? 'warn' : ''}">${d.drop_pct}% drop</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>

    <div class="admin-card">
      <h2>Product sales</h2>
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr><th>Produk</th><th>Qty</th><th>Revenue</th></tr></thead>
          <tbody>
            ${Object.keys(revProd).length
              ? Object.entries(revProd).map(([k, v]) => `
                <tr>
                  <td>${escapeHtml(k)}</td>
                  <td>${fmtNum(prodCounts[k] || 0)}</td>
                  <td>${fmtCurrency(v)}</td>
                </tr>
              `).join('')
              : '<tr><td colspan="3" class="admin-muted">Belum ada data order</td></tr>'}
          </tbody>
        </table>
      </div>
      <div class="admin-kpi-grid" style="margin-top:12px">
        <div class="admin-kpi"><div class="admin-kpi-label">AOV</div><div class="admin-kpi-value">${fmtCurrency(m.avg_order_value)}</div></div>
        <div class="admin-kpi"><div class="admin-kpi-label">Trial→Paid</div><div class="admin-kpi-value">${m.trial_to_paid_rate || 0}%</div></div>
        <div class="admin-kpi"><div class="admin-kpi-label">Conv rate</div><div class="admin-kpi-value">${m.conversion_rate || 0}%</div></div>
        <div class="admin-kpi"><div class="admin-kpi-label">Revenue ${days}d</div><div class="admin-kpi-value">${fmtCurrency(m.revenue_period)}</div></div>
      </div>
    </div>

    <div class="admin-card">
      <h2>🤖 AI Sales Advisor</h2>
      <p class="admin-muted">Rekomendasi otomatis berdasarkan metrik periode ini.</p>
      <div id="mkInsightsHost">${renderInsightsPanel(data.insights)}</div>
      ${m.revenue_period && m.revenue_delta != null ? `
        <p class="admin-muted" style="margin-top:12px">
          📊 Trajectory: revenue ${days}d = ${fmtCurrency(m.revenue_period)}
          (${m.revenue_delta >= 0 ? '↗' : '↘'} ${Math.abs(m.revenue_delta)}% vs periode sebelumnya).
        </p>
      ` : ''}
    </div>
  `;

  wireInsightActions(host.querySelector('#mkInsightsHost'), navigate);
}
