/**
 * What-if financial simulator — slider preview for savings/target timeline.
 * @module components/what-if-simulator
 */

import { Icon } from './icons.js';
import { computeTargetStats } from '../services/financial-targets.js';

/**
 * @param {object} [options]
 */
export async function showWhatIfSimulator(options = {}) {
  const target = options.target
    || window.STATE?.db?.primaryTargetDisplay
    || window.STATE?.db?.financialTargets?.find((t) => t.is_primary)
    || window.STATE?.db?.financialTargets?.[0];

  if (!target) {
    alert('Buat target finansial dulu untuk simulasi what-if.');
    options.onNeedTarget?.();
    return;
  }

  const stats = computeTargetStats(target);
  const baseMonthly = Number(stats.monthly || target.monthly_contribution || 200000);
  const remaining = stats.remaining;
  const overlay = document.createElement('div');
  overlay.className = 'budget-modal-overlay what-if-overlay';

  function renderPreview(extraMonthly) {
    const totalMonthly = baseMonthly + extraMonthly;
    const months = totalMonthly > 0 ? Math.ceil(remaining / totalMonthly) : null;
    const baseMonths = baseMonthly > 0 ? Math.ceil(remaining / baseMonthly) : null;
    const saved = baseMonths && months ? Math.max(0, baseMonths - months) : 0;
    const eta = months
      ? new Date(new Date().getFullYear(), new Date().getMonth() + months, 1)
          .toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
      : '—';

    return `
      <div class="what-if-preview">
        <div class="what-if-row">
          <span>Skenario saat ini</span>
          <strong>Rp ${fmt(baseMonthly)}/bln · ${baseMonths ?? '—'} bulan</strong>
        </div>
        <div class="what-if-row what-if-row--highlight">
          <span>Dengan +Rp ${fmt(extraMonthly)}/bln</span>
          <strong>${eta}${saved ? ` (${saved} bln lebih cepat)` : ''}</strong>
        </div>
      </div>
    `;
  }

  overlay.innerHTML = `
    <div class="budget-modal what-if-modal" role="dialog" aria-modal="true">
      <header class="modal-header">
        <div>
          <h2>Simulasi What-If</h2>
          <p class="modal-subtitle">${escapeHtml(target.name)} · sisa Rp ${fmt(remaining)}</p>
        </div>
        <button type="button" class="close-btn" data-action="close">${Icon('x', { size: 18 })}</button>
      </header>
      <div class="modal-body">
        <label class="tgt-label">Tambahan sisih per bulan</label>
        <input type="range" id="what-if-slider" min="0" max="2000000" step="50000" value="200000" />
        <div class="what-if-slider-val" id="what-if-val">+Rp ${fmt(200000)}/bulan</div>
        <div id="what-if-preview">${renderPreview(200000)}</div>
      </div>
      <footer class="modal-footer">
        <button type="button" class="btn-secondary-budget tap" data-action="close">Tutup</button>
        <button type="button" class="btn-primary-budget tap" data-action="apply">Terapkan ke target</button>
      </footer>
    </div>
  `;

  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelectorAll('[data-action="close"]').forEach((b) => { b.onclick = close; });
  overlay.onclick = (e) => { if (e.target === overlay) close(); };

  const slider = overlay.querySelector('#what-if-slider');
  const preview = overlay.querySelector('#what-if-preview');
  const valEl = overlay.querySelector('#what-if-val');

  slider?.addEventListener('input', () => {
    const extra = Number(slider.value || 0);
    if (valEl) valEl.textContent = `+Rp ${fmt(extra)}/bulan`;
    if (preview) preview.innerHTML = renderPreview(extra);
  });

  overlay.querySelector('[data-action="apply"]')?.addEventListener('click', async () => {
    const extra = Number(slider?.value || 0);
    try {
      const { saveFinancialTarget } = await import('../services/financial-targets.js');
      await saveFinancialTarget({
        id: target.id,
        name: target.name,
        target_amount: target.target_amount,
        current_amount: target.current_amount,
        monthly_contribution: baseMonthly + extra,
        target_date: target.target_date,
        is_primary: true,
      });
      options.onSaved?.();
      close();
    } catch (e) {
      console.error('[what-if]', e);
      alert('Gagal menyimpan simulasi.');
    }
  });
}

function fmt(n) {
  return new Intl.NumberFormat('id-ID').format(Math.round(Number(n) || 0));
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
