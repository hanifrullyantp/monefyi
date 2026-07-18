/**
 * Budget Summary Hero — budget-specific stats card for budget page.
 * @module components/budget-summary-hero
 */

import { calculateProgress, calculatePriorityTotals } from '../services/budget-model.js';
import { Icon } from './icons.js';

/**
 * @param {HTMLElement} container
 * @param {object} ctx
 */
export async function renderBudgetSummaryHero(container, ctx) {
  if (!container) return;

  const {
    rows = [],
    transactions = [],
    month,
    income = 0,
    onEvaluation,
    overBudgetCount = 0,
    criticalCount = 0,
  } = ctx;
  const totalBudget = rows.reduce((sum, b) => sum + Number(b.amount || 0), 0);
  const totalSpent = rows.reduce((sum, b) => sum + calculateProgress(b, transactions, month).spent, 0);
  const remaining = totalBudget - totalSpent;
  const percentUsed = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  const time = getMonthTimeProgress(month);
  const { daysLeft, daysPassed, timeProgress, timeMarkerLabel } = time;

  const dailyRemaining = daysLeft > 0 ? remaining / daysLeft : 0;
  const dailyAvg = daysPassed > 0 ? totalSpent / daysPassed : 0;
  const status = getHealthStatus(percentUsed, timeProgress);
  const fillClass = getProgressFillClass(percentUsed);
  const priorityTotals = calculatePriorityTotals(rows, income);

  container.innerHTML = `
    <div class="budget-summary-hero">
      <div class="bsh-header">
        <button type="button" class="bsh-status bsh-status-btn ${status.className}" data-action="hero-evaluation" title="Lihat evaluasi bulanan">
          <span class="bsh-status-icon">${status.iconHtml}</span>
          <span class="bsh-status-label">${status.label}</span>
          <span class="bsh-status-chev">${Icon('chevronRight', { size: 14 })}</span>
        </button>
        <div class="bsh-period">${formatPeriod(month)}</div>
      </div>
      <div class="bsh-main">
        <div class="bsh-progress-section">
          <div class="bsh-progress-label">Realisasi Budget</div>
          <div class="bsh-progress-amount">
            <span class="bsh-spent">Rp ${fmt(totalSpent)}</span>
            <span class="bsh-separator">/</span>
            <span class="bsh-total">Rp ${fmt(totalBudget)}</span>
          </div>
          <div class="bsh-progress-bar-wrap">
            <div class="bsh-time-marker-wrap" style="left:${timeProgress}%">
              <span class="bsh-time-marker-label">${escapeHtml(timeMarkerLabel)}</span>
              <span class="bsh-time-marker" aria-hidden="true"></span>
            </div>
            <div class="bsh-progress-bar">
              <div class="bsh-progress-fill ${fillClass}" style="width:${Math.min(percentUsed, 100)}%"></div>
            </div>
            <div class="bsh-progress-meta">
              <span class="bsh-percent">${percentUsed}% realisasi</span>
              <span class="bsh-time-percent">Waktu: ${timeProgress}%</span>
            </div>
          </div>
        </div>
        <div class="bsh-stats-grid">
          <div class="bsh-stat">
            <div class="bsh-stat-label">${Icon('wallet', { size: 12 })} Sisa</div>
            <div class="bsh-stat-value ${remaining < 0 ? 'negative' : ''}">
              ${remaining >= 0 ? '' : '-'}Rp ${fmt(Math.abs(remaining))}
            </div>
          </div>
          <div class="bsh-stat">
            <div class="bsh-stat-label">${Icon('calendar', { size: 12 })} Sisa Hari</div>
            <div class="bsh-stat-value">${daysLeft} hari</div>
          </div>
          <div class="bsh-stat">
            <div class="bsh-stat-label">${Icon('lightBulb', { size: 12 })} Per Hari</div>
            <div class="bsh-stat-value">Rp ${fmt(Math.max(0, dailyRemaining))}</div>
          </div>
          <div class="bsh-stat">
            <div class="bsh-stat-label">${Icon('chartBar', { size: 12 })} Rata-rata</div>
            <div class="bsh-stat-value">Rp ${fmt(dailyAvg)}</div>
          </div>
        </div>
      </div>
      <div class="bsh-priority-mini">${renderPriorityMini(priorityTotals, totalBudget)}</div>
      ${renderInsightCard(status, overBudgetCount, criticalCount)}
    </div>
  `;

  container.querySelectorAll('[data-action="hero-evaluation"]').forEach((el) => {
    el.addEventListener('click', () => onEvaluation?.());
  });
}

/**
 * @param {object} status
 * @param {number} overBudgetCount
 * @param {number} criticalCount
 */
function renderInsightCard(status, overBudgetCount, criticalCount) {
  const content = buildInsightContent(status, overBudgetCount, criticalCount);
  if (!content) return '';

  const tagsHtml = content.tags.map((tag) =>
    `<span class="bsh-insight-tag bsh-insight-tag--${tag.type}">${escapeHtml(tag.label)}</span>`,
  ).join('');

  return `
    <button type="button" class="bsh-insight-entry ${status.className}" data-action="hero-evaluation">
      <div class="bsh-insight-top">
        <span class="bsh-insight-icon">${Icon(content.icon, { size: 16 })}</span>
        <span class="bsh-insight-title">${escapeHtml(content.title)}</span>
      </div>
      <p class="bsh-insight-message">${escapeHtml(content.message)}</p>
      ${tagsHtml ? `<div class="bsh-insight-tags">${tagsHtml}</div>` : ''}
      <div class="bsh-insight-footer">
        <span>Lihat evaluasi bulanan</span>
        ${Icon('chevronRight', { size: 14 })}
      </div>
    </button>
  `;
}

/**
 * @param {object} status
 * @param {number} overBudgetCount
 * @param {number} criticalCount
 */
function buildInsightContent(status, overBudgetCount, criticalCount) {
  const tags = [];
  if (overBudgetCount > 0) {
    tags.push({ label: `${overBudgetCount} kategori over budget`, type: 'danger' });
  }
  if (criticalCount > 0) {
    tags.push({ label: `${criticalCount} perlu perhatian`, type: 'warning' });
  }

  if (status.className === 'over') {
    return {
      icon: 'alertTriangle',
      title: 'Pengeluaran melebihi budget',
      message: 'Review kategori yang boros dan pertimbangkan realokasi.',
      tags,
    };
  }
  if (status.className === 'critical') {
    return {
      icon: 'alertTriangle',
      title: status.label,
      message: status.recommendation || 'Pengeluaran lebih cepat dari waktu.',
      tags,
    };
  }
  if (status.className === 'warning') {
    return {
      icon: 'exclamation',
      title: status.label,
      message: status.recommendation || 'Perhatikan sisa budget bulan ini.',
      tags,
    };
  }
  if (status.className === 'excellent' || status.className === 'healthy') {
    return {
      icon: 'check',
      title: status.label,
      message: tags.length ? 'Budget masih terkendali, tapi ada area yang perlu dicek.' : 'Budget on-track. Lihat evaluasi untuk detail lengkap.',
      tags,
    };
  }

  return {
    icon: 'lightBulb',
    title: 'Insight budget',
    message: status.recommendation || 'Lihat evaluasi bulanan lengkap.',
    tags,
  };
}

/**
 * @param {string} month YYYY-MM
 */
function getMonthTimeProgress(month) {
  const now = new Date();
  const [y, m] = (month || '').split('-').map(Number);
  const monthEnd = new Date(y, m, 0);
  const daysInMonth = monthEnd.getDate();
  const isCurrentMonth = now.getFullYear() === y && now.getMonth() === m - 1;
  const isPastMonth = new Date(y, m - 1, daysInMonth) < new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let daysPassed;
  let daysLeft;
  let timeMarkerLabel;

  if (isCurrentMonth) {
    daysPassed = now.getDate();
    daysLeft = Math.max(0, daysInMonth - daysPassed);
    timeMarkerLabel = `Hari ${daysPassed}`;
  } else if (isPastMonth) {
    daysPassed = daysInMonth;
    daysLeft = 0;
    timeMarkerLabel = 'Akhir bulan';
  } else {
    daysPassed = 0;
    daysLeft = daysInMonth;
    timeMarkerLabel = 'Awal bulan';
  }

  const timeProgress = daysInMonth > 0 ? Math.round((daysPassed / daysInMonth) * 100) : 0;
  return { daysPassed, daysLeft, daysInMonth, timeProgress, timeMarkerLabel };
}

/**
 * @param {number} percentUsed
 */
function getProgressFillClass(percentUsed) {
  if (percentUsed > 100) return 'fill-over';
  if (percentUsed >= 90) return 'fill-critical';
  if (percentUsed >= 75) return 'fill-warning';
  if (percentUsed >= 50) return 'fill-moderate';
  return 'fill-healthy';
}

/**
 * @param {object} status
 * @param {number} overBudgetCount
 * @param {number} criticalCount
 * @deprecated Use buildInsightContent
 */
function buildInsightMessage(status, overBudgetCount, criticalCount) {
  const content = buildInsightContent(status, overBudgetCount, criticalCount);
  if (!content) return '';
  const extras = content.tags.map((t) => t.label).join(' · ');
  return extras ? `${content.message} ${extras}` : content.message;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str ?? '');
  return div.innerHTML;
}

/**
 * @param {number} percentUsed
 * @param {number} timeProgress
 */
function getHealthStatus(percentUsed, timeProgress) {
  const diff = percentUsed - timeProgress;

  if (percentUsed > 100) {
    return {
      className: 'over',
      iconHtml: Icon('alertTriangle', { size: 16 }),
      label: 'Over Budget',
      recommendation: 'Pengeluaran melebihi budget. Review kategori yang boros.',
    };
  }
  if (diff > 20) {
    return {
      className: 'critical',
      iconHtml: Icon('alertTriangle', { size: 16 }),
      label: 'Terlalu Cepat',
      recommendation: `Kamu sudah pakai ${percentUsed}% budget tapi baru ${timeProgress}% bulan berlalu. Rem sedikit!`,
    };
  }
  if (diff > 10) {
    return {
      className: 'warning',
      iconHtml: Icon('exclamation', { size: 16 }),
      label: 'Perhatian',
      recommendation: 'Pengeluaran lebih cepat dari waktu. Perhatikan sisa budget.',
    };
  }
  if (diff < -10) {
    return { className: 'excellent', iconHtml: Icon('target', { size: 16 }), label: 'Sangat Hemat', recommendation: null };
  }
  return { className: 'healthy', iconHtml: Icon('check', { size: 16 }), label: 'On Track', recommendation: null };
}

/**
 * @param {Record<string, object>} priorityTotals
 * @param {number} totalBudget
 */
function renderPriorityMini(priorityTotals, totalBudget) {
  const colors = { harus: '#ef4444', penting: '#f59e0b', mau: '#eab308', simpan: '#10b981' };
  const labels = { harus: 'Harus', penting: 'Penting', mau: 'Mau', simpan: 'Simpan' };

  const bars = Object.keys(colors).map((key) => {
    const data = priorityTotals[key] || { amount: 0 };
    const percent = totalBudget > 0 ? (data.amount / totalBudget) * 100 : 0;
    if (percent === 0) return '';
    return `<div class="pm-segment" style="width:${percent}%;background:${colors[key]}" title="${labels[key]}: Rp ${fmt(data.amount)}"></div>`;
  }).join('');

  const legend = Object.keys(colors)
    .filter((key) => (priorityTotals[key]?.amount || 0) > 0)
    .map((key) => {
      const data = priorityTotals[key];
      return `
        <div class="pm-legend-item">
          <span class="pm-dot" style="background:${colors[key]}"></span>
          <span class="pm-label">${labels[key]}</span>
          <span class="pm-value">${totalBudget > 0 ? Math.round((data.amount / totalBudget) * 100) : 0}%</span>
        </div>
      `;
    }).join('');

  return `
    <div class="pm-bar">${bars || '<div class="pm-empty">Belum ada budget</div>'}</div>
    ${legend ? `<div class="pm-legend">${legend}</div>` : ''}
  `;
}

/**
 * @param {string} [month]
 */
function formatPeriod(month) {
  if (month) {
    const [y, m] = month.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  }
  return new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

/**
 * @param {number} num
 */
function fmt(num) {
  return new Intl.NumberFormat('id-ID').format(Math.round(Math.abs(num || 0)));
}

if (typeof window !== 'undefined') {
  window.monefyiBudgetHero = { renderBudgetSummaryHero };
}
