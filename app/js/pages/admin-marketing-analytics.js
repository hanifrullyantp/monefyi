/**
 * Admin Marketing Analytics panel (Sprint 4).
 * @module pages/admin-marketing-analytics
 */

import { loadMarketingAnalytics } from '../services/marketing-analytics.js';

/**
 * @param {HTMLElement} host
 * @param {object} ctx
 */
export async function renderMarketingAnalytics(host, ctx = {}) {
  const escapeHtml = ctx.escapeHtml || ((s) => String(s ?? ''));
  const fmtNum = ctx.fmtNum || ((n) => String(n));
  const client = window.STATE?.db?.supa;

  host.innerHTML = '<p class="admin-muted">Memuat analytics…</p>';

  try {
    const data = await loadMarketingAnalytics(client, { since: ctx.since });
    const t = data.totals;
    const maxHour = Math.max(1, ...Object.values(data.byHour || {}));

    host.innerHTML = `
      <div class="admin-card">
        <h2>Marketing Analytics (30 hari)</h2>
        <p class="admin-muted">${fmtNum(data.interaction_count)} interaksi tercatat</p>
        <div class="admin-kpi-grid">
          <div class="admin-kpi"><div class="admin-kpi-label">Viewed</div><div class="admin-kpi-value">${fmtNum(t.viewed)}</div></div>
          <div class="admin-kpi"><div class="admin-kpi-label">CTR</div><div class="admin-kpi-value">${t.ctr}%</div></div>
          <div class="admin-kpi"><div class="admin-kpi-label">Converted</div><div class="admin-kpi-value">${fmtNum(t.converted)}</div></div>
          <div class="admin-kpi"><div class="admin-kpi-label">Dismiss rate</div><div class="admin-kpi-value">${t.dismiss_rate}%</div></div>
        </div>
      </div>

      <div class="admin-card">
        <h2>Funnel</h2>
        <div class="mk-funnel">
          ${data.funnel.map((step) => `
            <div class="mk-funnel__step">
              <span>${escapeHtml(step.step)}</span>
              <strong>${fmtNum(step.count)}</strong>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="admin-card">
        <h2>Performance by hour</h2>
        <div class="mk-hour-chart">
          ${Array.from({ length: 24 }, (_, h) => {
            const v = data.byHour[h] || 0;
            const pct = Math.round((v / maxHour) * 100);
            return `<div class="mk-hour-chart__bar" title="${h}:00 — ${v}"><span style="height:${pct}%"></span><em>${h}</em></div>`;
          }).join('')}
        </div>
      </div>

      <div class="admin-card">
        <h2>Top offers</h2>
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead><tr><th>Offer</th><th>Views</th><th>CTR</th><th>Conv</th></tr></thead>
            <tbody>
              ${data.offers.slice(0, 10).map((o) => `
                <tr>
                  <td>${escapeHtml(o.headline)}</td>
                  <td>${fmtNum(o.metrics.viewed)}</td>
                  <td>${o.metrics.ctr}%</td>
                  <td>${fmtNum(o.metrics.converted)}</td>
                </tr>
              `).join('') || '<tr><td colspan="4" class="admin-muted">Belum ada data</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>

      <div class="admin-card">
        <h2>Campaign performance</h2>
        <div class="admin-row-list">
          ${data.campaigns.map((c) => `
            <div class="admin-row">
              <span>${escapeHtml(c.name)} <span class="admin-badge">${escapeHtml(c.status)}</span></span>
              <span>Views ${fmtNum(c.metrics.viewed)} · CTR ${c.metrics.ctr}%</span>
            </div>
          `).join('') || '<p class="admin-muted">Belum ada campaign</p>'}
        </div>
      </div>
    `;
  } catch (e) {
    host.innerHTML = `<div class="admin-card"><p class="admin-muted">Analytics: ${escapeHtml(e.message)}</p></div>`;
  }
}
