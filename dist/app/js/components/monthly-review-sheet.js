/**
 * Guided monthly review ritual sheet (Fase 4.2).
 * @module components/monthly-review-sheet
 */

import { Icon } from './icons.js';
import { REVIEW_PROMPTS, saveJournalEntry } from '../services/monthly-review-journal.js';
import { buildClosingSummary } from '../services/monthly-closing.js';

/** @type {HTMLElement|null} */
let _host = null;

/**
 * @param {object} opts
 */
export async function showMonthlyReviewSheet(opts = {}) {
  const {
    period = window.STATE?.selectedMonth,
    transactions = window.STATE?.transactions || [],
    onComplete,
    onClosing,
  } = opts;

  const summary = buildClosingSummary(period, transactions);
  const monthName = new Date(`${period}-01T12:00:00`).toLocaleDateString('id-ID', {
    month: 'long', year: 'numeric',
  });

  if (!_host) {
    _host = document.createElement('div');
    _host.id = 'monthlyReviewHost';
    _host.className = 'monthly-review-host';
    document.body.appendChild(_host);
  }

  let step = 0;
  const answers = { reflection: '', intention: '', allocation_note: '' };

  const render = () => {
    _host.innerHTML = `
      <div class="monthly-review-sheet" role="dialog" aria-modal="true">
        <div class="mrs-header">
          <div class="mrs-kicker">Review Bulanan · ${escapeHtml(monthName)}</div>
          <button type="button" class="mrs-close" data-action="close">${Icon('x', { size: 18 })}</button>
        </div>
        <div class="mrs-steps">${[0, 1, 2, 3].map((i) => `
          <span class="mrs-step-dot${i <= step ? ' is-active' : ''}"></span>
        `).join('')}</div>
        ${renderStep(step, summary, answers, monthName)}
      </div>
    `;

    _host.classList.add('is-visible');
    bindEvents();
  };

  const bindEvents = () => {
    _host.querySelector('[data-action="close"]')?.addEventListener('click', close);
    _host.querySelector('[data-action="next"]')?.addEventListener('click', () => {
      collectAnswers();
      if (step < 3) { step += 1; render(); }
    });
    _host.querySelector('[data-action="back"]')?.addEventListener('click', () => {
      if (step > 0) { step -= 1; render(); }
    });
    _host.querySelector('[data-action="save"]')?.addEventListener('click', () => {
      collectAnswers();
      saveJournalEntry(period, answers);
      onComplete?.(answers);
      close();
      if (typeof window.showToast === 'function') window.showToast('Journal bulan ini tersimpan', 'success');
    });
    _host.querySelector('[data-action="closing"]')?.addEventListener('click', async () => {
      close();
      onClosing?.({ period, summary });
    });
  };

  const collectAnswers = () => {
    for (const key of ['reflection', 'intention', 'allocation_note']) {
      const el = _host.querySelector(`[name="${key}"]`);
      if (el) answers[key] = el.value.trim();
    }
  };

  const close = () => {
    _host?.classList.remove('is-visible');
  };

  render();
}

/**
 * @param {number} step
 * @param {object} summary
 * @param {object} answers
 * @param {string} monthName
 */
function renderStep(step, summary, answers, monthName) {
  const fmt = (n) => new Intl.NumberFormat('id-ID').format(Math.round(Number(n) || 0));

  if (step === 0) {
    return `
      <div class="mrs-body">
        <h3>Ringkasan ${escapeHtml(monthName)}</h3>
        <div class="mrs-summary-grid">
          <div><span>Income</span><strong>Rp ${fmt(summary.income)}</strong></div>
          <div><span>Expense</span><strong>Rp ${fmt(summary.expense)}</strong></div>
          <div><span>Net</span><strong class="${summary.net >= 0 ? 'positive' : 'negative'}">${summary.net >= 0 ? '+' : ''}Rp ${fmt(summary.net)}</strong></div>
        </div>
        <p class="mrs-hint">Luangkan 2 menit untuk refleksi sebelum bulan baru.</p>
      </div>
      <div class="mrs-footer">
        <button type="button" class="mrs-btn mrs-btn--primary" data-action="next">Lanjut Refleksi</button>
      </div>
    `;
  }

  if (step === 1) {
    return `
      <div class="mrs-body">
        <label for="mrs-reflection">${escapeHtml(REVIEW_PROMPTS[0].label)}</label>
        <textarea id="mrs-reflection" name="reflection" rows="4" placeholder="${escapeHtml(REVIEW_PROMPTS[0].placeholder)}">${escapeHtml(answers.reflection)}</textarea>
      </div>
      <div class="mrs-footer">
        <button type="button" class="mrs-btn" data-action="back">Kembali</button>
        <button type="button" class="mrs-btn mrs-btn--primary" data-action="next">Lanjut</button>
      </div>
    `;
  }

  if (step === 2) {
    return `
      <div class="mrs-body">
        <label for="mrs-intention">${escapeHtml(REVIEW_PROMPTS[2].label)}</label>
        <textarea id="mrs-intention" name="intention" rows="4" placeholder="${escapeHtml(REVIEW_PROMPTS[2].placeholder)}">${escapeHtml(answers.intention)}</textarea>
      </div>
      <div class="mrs-footer">
        <button type="button" class="mrs-btn" data-action="back">Kembali</button>
        <button type="button" class="mrs-btn mrs-btn--primary" data-action="next">Lanjut</button>
      </div>
    `;
  }

  return `
    <div class="mrs-body">
      <h3>Alokasi & Tutup Buku</h3>
      <p>Net bulan ini: <strong>${summary.net >= 0 ? 'surplus' : 'defisit'} Rp ${fmt(Math.abs(summary.net))}</strong></p>
      <label for="mrs-allocation">Catatan alokasi (opsional)</label>
      <textarea id="mrs-allocation" name="allocation_note" rows="3" placeholder="Ke tabungan / investasi / bayar utang...">${escapeHtml(answers.allocation_note)}</textarea>
    </div>
    <div class="mrs-footer mrs-footer--stack">
      <button type="button" class="mrs-btn mrs-btn--primary" data-action="save">Simpan Journal</button>
      <button type="button" class="mrs-btn mrs-btn--ghost" data-action="closing">Lanjut Tutup Buku →</button>
    </div>
  `;
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
