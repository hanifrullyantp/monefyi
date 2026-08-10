/**
 * Shared UI helpers for Admin Console V2.
 * @module pages/admin-shared
 */

export function fmtCurrency(n) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Math.round(Number(n) || 0));
}

export function fmtPct(n, signed = true) {
  if (n == null || Number.isNaN(n)) return '—';
  const v = Math.round(Number(n) * 10) / 10;
  if (!signed) return `${v}%`;
  return v > 0 ? `+${v}%` : `${v}%`;
}

export function trendIcon(dir) {
  if (dir === 'up') return '↗';
  if (dir === 'down') return '↘';
  return '→';
}

export function trendClass(dir) {
  if (dir === 'up') return 'admin-trend--up';
  if (dir === 'down') return 'admin-trend--down';
  return 'admin-trend--flat';
}

/**
 * @param {string} title
 * @param {string} desc
 * @param {string} [tooltip]
 */
export function sectionHeader(title, desc, tooltip) {
  const tip = tooltip
    ? `<span class="admin-info-tip" title="${escapeAttr(tooltip)}">ℹ️</span>`
    : '';
  return `
    <div class="admin-section-head">
      <div>
        <h2 class="admin-section-title">${title}${tip}</h2>
        ${desc ? `<p class="admin-section-desc">${desc}</p>` : ''}
      </div>
    </div>
  `;
}

export function escapeAttr(s) {
  return String(s ?? '').replace(/"/g, '&quot;');
}

/**
 * @param {object} opts
 */
export function metricCard(opts) {
  const {
    label,
    value,
    sub,
    delta,
    trend,
    tooltip,
  } = opts;
  const tip = tooltip ? `<span class="admin-info-tip" title="${escapeAttr(tooltip)}">ℹ️</span>` : '';
  const deltaHtml = delta != null
    ? `<div class="admin-trend ${trendClass(trend)}">${trendIcon(trend)} ${fmtPct(delta)} vs lalu</div>`
    : (sub ? `<div class="admin-kpi-sub">${sub}</div>` : '');
  return `
    <div class="admin-kpi admin-metric-card">
      <div class="admin-kpi-label">${label}${tip}</div>
      <div class="admin-kpi-value">${value}</div>
      ${deltaHtml}
    </div>
  `;
}

/**
 * @param {object[]} insights
 * @param {(tab: string) => void} [onNavigate]
 */
export function renderInsightsPanel(insights, onNavigate) {
  if (!insights?.length) {
    return '<p class="admin-muted">Belum ada insight untuk periode ini.</p>';
  }
  return `
    <div class="admin-insights">
      ${insights.map((ins) => `
        <div class="admin-insight admin-insight--${ins.priority || 'medium'}">
          <div class="admin-insight__head">
            <span class="admin-insight__icon">💡</span>
            <strong>${ins.title}</strong>
            ${ins.expected_impact ? `<span class="admin-badge">${ins.expected_impact}</span>` : ''}
          </div>
          <p class="admin-muted">${ins.body}</p>
          ${ins.action_label && ins.action_tab
            ? `<button type="button" class="admin-btn ghost admin-insight__action" data-insight-tab="${ins.action_tab}">${ins.action_label}</button>`
            : ''}
        </div>
      `).join('')}
    </div>
  `;
}

export function wireInsightActions(container, navigate) {
  container?.querySelectorAll('[data-insight-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-insight-tab');
      if (tab && navigate) navigate(tab);
    });
  });
}

export function renderAlerts(alerts) {
  if (!alerts?.length) return '';
  return `
    <div class="admin-alerts">
      ${alerts.map((a) => `
        <div class="admin-alert admin-alert--${a.type || 'info'}">
          ${a.type === 'success' ? '✅' : a.type === 'warning' ? '⚠️' : 'ℹ️'} ${a.message}
        </div>
      `).join('')}
    </div>
  `;
}

export function renderTrendChart(dailyTrend, fmtNum) {
  if (!dailyTrend?.length) return '<p class="admin-muted">Belum ada data trend.</p>';
  const maxRev = Math.max(1, ...dailyTrend.map((d) => d.revenue || 0));
  const maxUsr = Math.max(1, ...dailyTrend.map((d) => d.users || 0));
  return `
    <div class="admin-trend-chart">
      ${dailyTrend.map((d) => {
        const revH = Math.round(((d.revenue || 0) / maxRev) * 100);
        const usrH = Math.round(((d.users || 0) / maxUsr) * 100);
        return `
          <div class="admin-trend-chart__col" title="${d.date}: ${fmtNum(d.users)} user, ${fmtCurrency(d.revenue)}">
            <div class="admin-trend-chart__bars">
              <span class="admin-trend-chart__bar admin-trend-chart__bar--rev" style="height:${revH}%"></span>
              <span class="admin-trend-chart__bar admin-trend-chart__bar--usr" style="height:${usrH}%"></span>
            </div>
            <em>${d.date.slice(8)}</em>
          </div>
        `;
      }).join('')}
    </div>
    <p class="admin-muted" style="margin-top:8px;font-size:11px">Hijau = revenue · Biru = user baru</p>
  `;
}

export function renderFunnelVisual(funnel, escapeHtml, fmtNum) {
  if (!funnel?.length) return '';
  const max = Math.max(1, ...funnel.map((s) => s.count));
  return `
    <div class="admin-funnel">
      ${funnel.map((s) => {
        const w = Math.max(8, Math.round((s.count / max) * 100));
        return `
          <div class="admin-funnel__row">
            <span class="admin-funnel__label">${escapeHtml(s.step)}</span>
            <div class="admin-funnel__bar-wrap"><div class="admin-funnel__bar" style="width:${w}%"></div></div>
            <strong>${fmtNum(s.count)}</strong>
            <span class="admin-muted">${s.pct}%</span>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

export const ADMIN_PERIOD_KEY = 'monefyi_admin_period_days';
export const ADMIN_ENV_KEY = 'monefyi_admin_env';

export function getAdminPeriod() {
  try {
    return Number(localStorage.getItem(ADMIN_PERIOD_KEY)) || 30;
  } catch {
    return 30;
  }
}

export function setAdminPeriod(days) {
  try {
    localStorage.setItem(ADMIN_PERIOD_KEY, String(days));
  } catch { /* ignore */ }
}

export function getAdminEnv() {
  try {
    return localStorage.getItem(ADMIN_ENV_KEY) || 'live';
  } catch {
    return 'live';
  }
}

export function setAdminEnv(env) {
  try {
    localStorage.setItem(ADMIN_ENV_KEY, env);
  } catch { /* ignore */ }
}
