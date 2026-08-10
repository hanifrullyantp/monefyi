/**
 * Hero card — situasi keuangan hari ini (safe-to-spend).
 * @module components/daily-situation-hero
 */

import { computeDailySituation, saveDailySnapshot } from '../services/daily-situation.js';
import { getFinancialStatus } from '../services/financial-status.js';
import { computePeriodFinancials } from '../services/financial-metrics.js';
import { Icon } from './icons.js';

/**
 * @param {object} situation
 * @param {function} formatIDR
 * @param {function} formatCompactIDR
 * @returns {string}
 */
function buildBodyHtml(situation, formatIDR, formatCompactIDR) {
  const predLine = buildPredictionLine(situation, formatCompactIDR);

  if (situation.status === 'incomplete') {
    return `
      <p class="daily-hero__incomplete">${escapeHtml(situation.message)}</p>
      <button type="button" class="daily-hero__cta tap" data-action="complete-data">Lengkapi data</button>
    `;
  }

  if (situation.status === 'bahaya') {
    const runout = situation.runoutDayOfMonth;
    const daysLeft = situation.daysUntilRunout;
    const gap = situation.daysToPayday - (daysLeft || 0);
    return `
      <p class="daily-hero__alert-title">Perhatian</p>
      <p class="daily-hero__alert-msg">
        ${runout
    ? `Dengan pola ini, uangmu habis tanggal ${runout}${gap > 0 ? ` — masih ${gap} hari lagi ke gajian` : ''}.`
    : 'Pengeluaranmu melebihi rencana fleksibel bulan ini.'}
      </p>
      <div class="daily-hero__meta">
        <span>${Icon('calendar', { size: 14 })} Gajian lagi ${situation.daysToPayday} hari</span>
        <span class="daily-hero__deficit">${predLine || `🔴 Prediksi defisit: ${formatCompactIDR(Math.abs(situation.predictedEndBalance))}`}</span>
      </div>
      <p class="daily-hero__foot">→ Lihat apa yang bisa direm</p>
    `;
  }

  if (situation.status === 'waspada') {
    const catLine = situation.nearCategory
      ? `Kategori ${situation.nearCategory.name} mendekati batas`
      : 'Pengeluaran minggu ini agak tinggi';
    const holdDays = Math.max(2, Math.ceil((situation.daysToPayday - situation.runwayDays) / 2));
    return `
      <p class="daily-hero__label">Hari ini aman pakai</p>
      <p class="daily-hero__amount">${formatIDR(situation.safeToSpend)}</p>
      <div class="daily-hero__meta">
        <span>${Icon('calendar', { size: 14 })} Gajian lagi ${situation.daysToPayday} hari</span>
        <span>⚠️ ${escapeHtml(catLine)}</span>
      </div>
      <p class="daily-hero__foot">→ Tahan ${holdDays} hari bisa aman</p>
    `;
  }

  // AMAN
  const predLabel = predLine || (situation.predictedEndBalance >= 0
    ? `📈 Prediksi akhir periode: +${formatCompactIDR(situation.predictedEndBalance)}`
    : '');
  return `
    <p class="daily-hero__label">Hari ini aman pakai</p>
    <p class="daily-hero__amount">${formatIDR(situation.safeToSpend)}</p>
    <div class="daily-hero__meta">
      <span>${Icon('calendar', { size: 14 })} Gajian lagi ${situation.daysToPayday} hari</span>
      ${predLabel ? `<span>${predLabel}</span>` : ''}
    </div>
    <p class="daily-hero__foot">✅ Kamu on track bulan ini</p>
  `;
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

/**
 * @param {object} situation
 * @param {function} formatCompactIDR
 * @returns {string}
 */
function buildPredictionLine(situation, formatCompactIDR) {
  if (situation.predictionMessage) {
    return escapeHtml(situation.predictionMessage);
  }
  if (situation.predictionStatus === 'incomplete' || situation.predictionStatus === 'unreliable') {
    return '';
  }
  const amt = Math.abs(Number(situation.predictedEndBalance || 0));
  if (!amt) return '';
  const conf = situation.predictionConfidence ? ` (${situation.predictionConfidence})` : '';
  if (situation.predictedEndBalance >= 0) {
    return `📈 Surplus kecil ${formatCompactIDR(amt)}${conf}`;
  }
  return `🔴 Prediksi defisit: ${formatCompactIDR(amt)}${conf}`;
}

/**
 * @param {object} ctx
 * @param {object} [callbacks]
 * @returns {Promise<HTMLElement>}
 */
export async function renderDailySituationHero(ctx, callbacks = {}) {
  const { formatIDR, formatCompactIDR } = ctx.helpers || {};
  const state = ctx.state || window.STATE;
  const situation = computeDailySituation(state);
  const finStatus = getFinancialStatus(state);
  const month = state?.selectedMonth || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const metrics = computePeriodFinancials(state, month);

  saveDailySnapshot(situation).catch(() => {});

  const el = document.createElement('section');
  el.className = `daily-hero daily-hero--${situation.status || 'incomplete'} home-section`;

  const anomalyHtml = metrics.hasUnhandledAnomalies ? `
    <div class="daily-hero__anomaly-bar">
      <p>⚠️ Ada transaksi besar yang perlu dikategorisasi</p>
      <p class="daily-hero__anomaly-compare">
        Dengan anomali: ${formatCompactIDR?.(metrics.netCashFlow) || metrics.netCashFlow}
        · Tanpa anomali: ${formatCompactIDR?.(metrics.consumptionNetCashFlow) || metrics.consumptionNetCashFlow}
      </p>
      <button type="button" class="daily-hero__cta tap" data-action="classify-anomaly">Kategorisasi Sekarang</button>
    </div>
  ` : '';

  if (situation.isNegativePool && situation.status !== 'incomplete') {
    el.classList.add('daily-hero--negative-pool');
  }

  el.innerHTML = `
    ${anomalyHtml}
    <div class="daily-hero__status-badge daily-hero__status-badge--${finStatus.color}">${escapeHtml(finStatus.badge)}</div>
    <div class="daily-hero__inner">
      ${buildBodyHtml(situation, formatIDR, formatCompactIDR)}
    </div>
  `;

  el.querySelector('[data-action="classify-anomaly"]')?.addEventListener('click', () => {
    callbacks.onClassifyAnomaly?.(metrics.unhandledAnomalies?.[0]);
  });

  el.querySelector('[data-action="complete-data"]')?.addEventListener('click', () => {
    callbacks.onCompleteData?.();
  });

  if (situation.status === 'bahaya') {
    el.classList.add('tap');
    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-action]')) return;
      callbacks.onViewAdvisor?.();
    });
  }

  if (situation.status === 'waspada') {
    el.querySelector('.daily-hero__inner')?.addEventListener('click', () => {
      callbacks.onViewBudget?.();
    });
  }

  return el;
}

/**
 * @param {object} ctx
 * @param {object} callbacks
 * @returns {Promise<HTMLElement|null>}
 */
export async function buildDailySituationHero(ctx, callbacks) {
  return renderDailySituationHero(ctx, callbacks);
}
