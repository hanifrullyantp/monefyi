/**
 * Auto-generate budget preview modal.
 * @module components/budget-generator-modal
 */

import { Icon } from './icons.js';
import { detectStrategy, generateBudget, applyGeneratedBudgets } from '../services/budget-generator.js';
import { PRIORITY_LEVELS } from '../services/budget-model.js';

const STRATEGY_INFO = {
  no_history: {
    icon: 'sparkles',
    title: 'Budget Otomatis untuk Pemula',
    subtitle: 'Menggunakan aturan 50/30/20',
    description: 'Karena belum ada budget bulan lalu, kami buatkan budget default berdasarkan best practice keuangan.',
  },
  copy_improve: {
    icon: 'refresh',
    title: 'Salin & Perbaiki Bulan Lalu',
    subtitle: 'Berdasarkan data bulan sebelumnya',
    description: 'Meniru struktur budget bulan lalu dan menyesuaikan berdasarkan pengeluaran aktual.',
  },
  learned: {
    icon: 'wand',
    title: 'Optimized Budget',
    subtitle: 'Berdasarkan pola 3 bulan terakhir',
    description: 'Menganalisis pola pengeluaran 3 bulan untuk rekomendasi yang lebih akurat.',
  },
};

/**
 * @param {() => void} [onGenerated]
 */
export async function showBudgetGeneratorModal(onGenerated = null) {
  const strategy = await detectStrategy();
  const info = STRATEGY_INFO[strategy] || STRATEGY_INFO.no_history;

  const modal = document.createElement('div');
  modal.className = 'budget-modal-overlay';
  modal.innerHTML = `
    <div class="budget-modal generator-modal" role="dialog" aria-modal="true">
      <header class="modal-header">
        <div class="generator-header-icon">${Icon(info.icon, { size: 32 })}</div>
        <div>
          <h2>${info.title}</h2>
          <p class="modal-subtitle">${info.subtitle}</p>
        </div>
        <button type="button" class="close-btn" data-action="close">${Icon('x', { size: 18 })}</button>
      </header>
      <div class="modal-body">
        <div class="generator-description"><p>${info.description}</p></div>
        <div class="generator-loading" id="gen-loading">
          <div class="loader-spinner"></div>
          <p>Menganalisis data & membuat budget...</p>
        </div>
        <div class="generator-preview" id="gen-preview" style="display:none"></div>
        <div class="generator-error" id="gen-error" style="display:none"></div>
      </div>
      <footer class="modal-footer" id="gen-footer" style="display:none">
        <button type="button" class="btn-secondary" data-action="close">Batal</button>
        <button type="button" class="btn-primary" data-action="apply">${Icon('check', { size: 14 })} Terapkan Budget</button>
      </footer>
    </div>
  `;

  document.body.appendChild(modal);

  const close = () => modal.remove();
  modal.querySelectorAll('[data-action="close"]').forEach((b) => { b.onclick = close; });
  modal.onclick = (e) => { if (e.target === modal) close(); };

  /** @type {object|null} */
  let generatedResult = null;

  try {
    generatedResult = await generateBudget({ strategy });
    modal.querySelector('#gen-loading').style.display = 'none';
    modal.querySelector('#gen-preview').style.display = 'block';
    modal.querySelector('#gen-footer').style.display = 'flex';
    modal.querySelector('#gen-preview').innerHTML = renderPreview(generatedResult);
  } catch (e) {
    modal.querySelector('#gen-loading').style.display = 'none';
    modal.querySelector('#gen-error').style.display = 'block';
    modal.querySelector('#gen-error').innerHTML = `
      <div class="error-box">
        ${Icon('alertTriangle', { size: 32 })}
        <div class="error-title">Gagal Generate Budget</div>
        <div class="error-message">${escapeHtml(e.message)}</div>
      </div>
    `;
  }

  modal.querySelector('[data-action="apply"]')?.addEventListener('click', async () => {
    if (!generatedResult) return;
    const replace = confirm(
      'Ganti budget bulan ini yang sudah ada dengan yang baru?\n\nOK = Ganti semua\nCancel = Tambahkan saja'
    );
    try {
      await applyGeneratedBudgets(generatedResult.budgets, { replaceExisting: replace });
      showToast(`${generatedResult.budgets.length} budget berhasil diterapkan`);
      close();
      onGenerated?.();
      if (typeof window.renderBudgetPageView === 'function') await window.renderBudgetPageView();
    } catch (err) {
      showToast('Gagal apply: ' + err.message);
    }
  });
}

function renderPreview(result) {
  const total = result.summary.total;
  const byPriority = result.summary.by_priority;

  return `
    <div class="preview-summary">
      <div class="preview-total">
        <div class="preview-total-label">Total Budget Terbentuk</div>
        <div class="preview-total-amount">Rp ${fmt(total)}</div>
        <div class="preview-total-meta">${result.summary.count} kategori</div>
      </div>
      <div class="preview-priority-breakdown">
        ${Object.entries(byPriority).map(([key, amount]) => {
          const pl = PRIORITY_LEVELS[key.toUpperCase()];
          if (!pl || !amount) return '';
          const percent = total > 0 ? Math.round((amount / total) * 100) : 0;
          return `
            <div class="preview-priority-item">
              <span class="pp-dot" style="background:${pl.color}"></span>
              <span class="pp-label">${pl.label}</span>
              <span class="pp-amount">Rp ${fmt(amount)}</span>
              <span class="pp-percent">${percent}%</span>
            </div>
          `;
        }).join('')}
      </div>
    </div>
    <div class="preview-explanation">
      <div class="pe-header">${Icon('sparkles', { size: 14 })}<span>Penjelasan</span></div>
      <div class="pe-content">${escapeHtml(result.explanation).replace(/\n/g, '<br>')}</div>
    </div>
    ${result.improvements?.length ? `
      <div class="preview-improvements">
        <div class="pi-header">${Icon('trendingUp', { size: 14 })}<span>Penyesuaian</span></div>
        <ul class="pi-list">${result.improvements.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul>
      </div>` : ''}
    ${result.insights?.length ? `
      <div class="preview-insights">
        <div class="pi-header">${Icon('wand', { size: 14 })}<span>Insights</span></div>
        <ul class="pi-list">${result.insights.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul>
      </div>` : ''}
    <details class="preview-full-list">
      <summary>Lihat detail kategori (${result.budgets.length})</summary>
      <div class="pfl-list">
        ${result.budgets.map((b) => {
          const pl = PRIORITY_LEVELS[(b.priority || 'penting').toUpperCase()];
          return `
            <div class="pfl-item">
              <span class="pfl-dot" style="background:${pl?.color || '#6b7280'}"></span>
              <span class="pfl-name">${escapeHtml(b.name)}</span>
              <span class="pfl-amount">Rp ${fmt(b.amount)}</span>
            </div>
          `;
        }).join('')}
      </div>
    </details>
  `;
}

function showToast(msg) {
  if (typeof window.showToast === 'function') {
    window.showToast(msg, 'success');
    return;
  }
  const t = document.createElement('div');
  t.className = 'action-toast success';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

function fmt(num) {
  return new Intl.NumberFormat('id-ID').format(Math.round(num || 0));
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str || '');
  return div.innerHTML;
}

if (typeof window !== 'undefined') {
  window.monefyiBudgetGenModal = { showBudgetGeneratorModal };
}
