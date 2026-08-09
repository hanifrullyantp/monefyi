/**
 * Guided monthly review ritual — 6-step flow (Growth Sprint 8).
 * @module components/monthly-review-sheet
 */

import { Icon } from './icons.js';
import { REVIEW_PROMPTS, saveJournalEntry } from '../services/monthly-review-journal.js';
import { detectMonthlyPatterns } from '../services/monthly-review-patterns.js';
import { buildClosingSummary } from '../services/monthly-closing.js';

/** @type {HTMLElement|null} */
let _host = null;

const ALLOCATION_OPTIONS = [
  { id: 'emergency', label: 'Dana Darurat' },
  { id: 'invest', label: 'Investasi' },
  { id: 'debt', label: 'Bayar Utang' },
  { id: 'carry', label: 'Carry over bulan depan' },
  { id: 'split', label: 'Split ke beberapa tujuan' },
];

const INTENTION_OPTIONS = [
  { id: 'reduce_fun', label: 'Turunkan Hiburan 30%' },
  { id: 'save_1m', label: 'Nabung Rp 1jt' },
  { id: 'debt_extra', label: 'Bayar utang extra Rp 500rb' },
];

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
  const patterns = detectMonthlyPatterns(period, transactions);
  const monthName = new Date(`${period}-01T12:00:00`).toLocaleDateString('id-ID', {
    month: 'long', year: 'numeric',
  });
  const nextMonth = new Date(`${period}-01T12:00:00`);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const nextLabel = nextMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  if (!_host) {
    _host = document.createElement('div');
    _host.id = 'monthlyReviewHost';
    _host.className = 'monthly-review-host';
    document.body.appendChild(_host);
  }

  let step = 0;
  const answers = {
    proud: '', improve: '', surprise: '',
    allocation_choice: 'emergency',
    allocation_note: '',
    intentions: [],
    pattern_ack: null,
    patterns,
  };

  const render = () => {
    _host.innerHTML = `
      <div class="monthly-review-sheet" role="dialog" aria-modal="true">
        <div class="mrs-header">
          <div class="mrs-kicker">Review Bulanan · ${escapeHtml(monthName)}</div>
          <button type="button" class="mrs-close" data-action="close">${Icon('x', { size: 18 })}</button>
        </div>
        <div class="mrs-steps">${[0, 1, 2, 3, 4, 5].map((i) => `
          <span class="mrs-step-dot${i <= step ? ' is-active' : ''}"></span>
        `).join('')}</div>
        ${renderStep(step, summary, answers, monthName, nextLabel)}
      </div>
    `;
    _host.classList.add('is-visible');
    bindEvents();
  };

  const bindEvents = () => {
    _host.querySelector('[data-action="close"]')?.addEventListener('click', close);
    _host.querySelector('[data-action="next"]')?.addEventListener('click', () => {
      collectAnswers();
      if (step < 5) { step += 1; render(); }
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
      collectAnswers();
      saveJournalEntry(period, answers);
      close();
      onClosing?.({ period, summary });
    });
    _host.querySelectorAll('[name="allocation"]').forEach((input) => {
      input.addEventListener('change', () => { answers.allocation_choice = input.value; });
    });
    _host.querySelectorAll('[name="intention"]').forEach((input) => {
      input.addEventListener('change', () => {
        if (input.checked) answers.intentions.push(input.value);
        else answers.intentions = answers.intentions.filter((v) => v !== input.value);
      });
    });
    _host.querySelectorAll('[data-pattern-ack]').forEach((btn) => {
      btn.addEventListener('click', () => {
        answers.pattern_ack = btn.getAttribute('data-pattern-ack');
        step += 1;
        render();
      });
    });
  };

  const collectAnswers = () => {
    for (const key of ['proud', 'improve', 'surprise', 'allocation_note']) {
      const el = _host.querySelector(`[name="${key}"]`);
      if (el) answers[key] = el.value.trim();
    }
  };

  const close = () => {
    _host?.classList.remove('is-visible');
  };

  render();
}

function renderStep(step, summary, answers, monthName, nextLabel) {
  const fmt = (n) => new Intl.NumberFormat('id-ID').format(Math.round(Number(n) || 0));
  const savingPct = summary.income > 0
    ? Math.round(((summary.income - summary.expense) / summary.income) * 100)
    : 0;

  if (step === 0) {
    return `
      <div class="mrs-body">
        <h3>📊 ${escapeHtml(monthName)} Recap</h3>
        <div class="mrs-summary-grid">
          <div><span>Income</span><strong>Rp ${fmt(summary.income)}</strong></div>
          <div><span>Expense</span><strong>Rp ${fmt(summary.expense)}</strong></div>
          <div><span>Saving</span><strong class="${summary.net >= 0 ? 'positive' : 'negative'}">${savingPct}%</strong></div>
        </div>
        <p class="mrs-hint">Luangkan 5 menit — refleksi sebelum bulan baru.</p>
      </div>
      <div class="mrs-footer">
        <button type="button" class="mrs-btn mrs-btn--primary" data-action="next">Lanjut Refleksi</button>
      </div>
    `;
  }

  if (step === 1) {
    return `
      <div class="mrs-body">
        <h3>🤔 Refleksi Bulan Ini</h3>
        ${REVIEW_PROMPTS.map((p) => `
          <label for="mrs-${p.id}">${escapeHtml(p.label)}</label>
          <textarea id="mrs-${p.id}" name="${p.id}" rows="2" placeholder="${escapeHtml(p.placeholder)}">${escapeHtml(answers[p.id] || '')}</textarea>
        `).join('')}
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
        <h3>🔍 Kami Temukan Pattern</h3>
        <ul class="mrs-pattern-list">
          ${(answers.patterns || []).map((p) => `<li>${escapeHtml(p.text)}</li>`).join('')
            || '<li>Belum cukup data — terus catat transaksi.</li>'}
        </ul>
        <p class="mrs-hint">Ini bikin surprise?</p>
      </div>
      <div class="mrs-footer">
        <button type="button" class="mrs-btn" data-action="back">Kembali</button>
        <button type="button" class="mrs-btn" data-pattern-ack="known">Sudah tahu</button>
        <button type="button" class="mrs-btn mrs-btn--primary" data-pattern-ack="surprised">Ya, ternyata</button>
      </div>
    `;
  }

  if (step === 3) {
    return `
      <div class="mrs-body">
        <h3>💰 Sisa Rp ${fmt(Math.max(0, summary.net))} mau diapakan?</h3>
        ${ALLOCATION_OPTIONS.map((o) => `
          <label class="mrs-radio"><input type="radio" name="allocation" value="${o.id}" ${answers.allocation_choice === o.id ? 'checked' : ''} /> ${escapeHtml(o.label)}</label>
        `).join('')}
        <label for="mrs-allocation">Catatan split (opsional)</label>
        <textarea id="mrs-allocation" name="allocation_note" rows="2">${escapeHtml(answers.allocation_note)}</textarea>
      </div>
      <div class="mrs-footer">
        <button type="button" class="mrs-btn" data-action="back">Kembali</button>
        <button type="button" class="mrs-btn mrs-btn--primary" data-action="next">Lanjut</button>
      </div>
    `;
  }

  if (step === 4) {
    return `
      <div class="mrs-body">
        <h3>🎯 ${escapeHtml(nextLabel)}</h3>
        <p>Target utama bulan depan:</p>
        ${INTENTION_OPTIONS.map((o) => `
          <label class="mrs-radio"><input type="checkbox" name="intention" value="${o.id}" ${answers.intentions.includes(o.id) ? 'checked' : ''} /> ${escapeHtml(o.label)}</label>
        `).join('')}
      </div>
      <div class="mrs-footer">
        <button type="button" class="mrs-btn" data-action="back">Kembali</button>
        <button type="button" class="mrs-btn mrs-btn--primary" data-action="next">Preview Journal</button>
      </div>
    `;
  }

  return `
    <div class="mrs-body">
      <h3>📔 Journal ${escapeHtml(monthName)}</h3>
      <div class="mrs-journal-preview">
        <p><strong>Bangga:</strong> ${escapeHtml(answers.proud || '—')}</p>
        <p><strong>Improve:</strong> ${escapeHtml(answers.improve || '—')}</p>
        <p><strong>Alokasi:</strong> ${escapeHtml(answers.allocation_choice || '—')}</p>
        <p><strong>Intention:</strong> ${escapeHtml((answers.intentions || []).join(', ') || '—')}</p>
      </div>
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
