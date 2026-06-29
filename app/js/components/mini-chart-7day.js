/**
 * 7-day mini expense chart (inline SVG bars).
 * @module components/mini-chart-7day
 */

import { Icon } from './icons.js';

/**
 * @param {object} chartData
 * @param {Function} formatCompactIDR
 * @param {object} [callbacks]
 * @returns {HTMLElement}
 */
export function renderMiniChart7Day(chartData, formatCompactIDR, callbacks = {}) {
  const el = document.createElement('section');
  el.className = 'home-section home-mini-chart';
  const days = chartData?.days || [];
  const max = chartData?.max || 1;
  const barW = 28;
  const gap = 8;
  const height = 80;
  const width = days.length * (barW + gap);

  const bars = days.map((d, i) => {
    const h = max > 0 ? Math.max(4, (d.amount / max) * (height - 20)) : 4;
    const x = i * (barW + gap);
    const y = height - h - 16;
    const isMax = chartData?.maxDay?.date === d.date && d.amount > 0;
    const fill = isMax ? '#2ecc71' : 'rgba(46, 204, 113, 0.32)';
    return `
      <g class="home-chart-bar" data-date="${d.date}">
        <rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="4" fill="${fill}"/>
        <text x="${x + barW / 2}" y="${height - 2}" text-anchor="middle" class="home-chart-label">${d.dayName}</text>
      </g>
    `;
  }).join('');

  el.innerHTML = `
    <div class="home-section-header">
      <h2 class="home-section-title">${Icon('chartBar', { size: 18 })} Pengeluaran 7 Hari</h2>
      <button type="button" class="home-section-action tap" data-action="advisor">
        Detail ${Icon('chevronRight', { size: 14 })}
      </button>
    </div>
    <div class="home-chart-wrap">
      <svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" aria-hidden="true">${bars}</svg>
    </div>
    <p class="home-chart-caption">Rata-rata harian Rp ${formatCompactIDR(chartData?.avg || 0)}</p>
  `;

  el.querySelector('[data-action="advisor"]')?.addEventListener('click', () => callbacks.onViewFullChart?.());
  return el;
}
