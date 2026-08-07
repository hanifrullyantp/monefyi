/**
 * Modal — manage financial targets.
 * @module components/target-manager-modal
 */

import { Icon } from './icons.js';
import {
  getPrimaryTarget,
  loadFinancialTargets,
  saveFinancialTarget,
  setPrimaryTarget,
} from '../services/financial-targets.js';

/**
 * @param {object} [options]
 */
export async function showTargetManagerModal(options = {}) {
  await loadFinancialTargets();
  const primary = getPrimaryTarget();
  const targets = window.STATE?.db?.financialTargets || [];

  const overlay = document.createElement('div');
  overlay.className = 'budget-modal-overlay target-manager-overlay';
  overlay.innerHTML = `
    <div class="budget-modal target-manager-modal" role="dialog" aria-modal="true">
      <header class="modal-header">
        <div>
          <h2>Target Finansial</h2>
          <p class="modal-subtitle">Satu target utama yang selalu terlihat di beranda</p>
        </div>
        <button type="button" class="close-btn" data-action="close">${Icon('x', { size: 18 })}</button>
      </header>
      <div class="modal-body">
        <form id="tgt-form" class="tgt-form">
          <label class="tgt-label">Nama target</label>
          <input type="text" name="name" required value="${escapeAttr(primary?.name || '')}" placeholder="Dana Darurat" />

          <label class="tgt-label">Nominal target (Rp)</label>
          <input type="number" name="target_amount" required min="1000" value="${Number(primary?.target_amount || 0) || ''}" />

          <label class="tgt-label">Sudah terkumpul (Rp)</label>
          <input type="number" name="current_amount" min="0" value="${Number(primary?.current_amount || 0)}" />

          <label class="tgt-label">Sisihkan per bulan (Rp)</label>
          <input type="number" name="monthly_contribution" min="0" value="${Number(primary?.monthly_contribution || 0) || ''}" />

          <label class="tgt-label">Tanggal target (opsional)</label>
          <input type="date" name="target_date" value="${primary?.target_date || ''}" />
        </form>

        ${targets.length > 1 ? `
          <div class="tgt-list">
            <div class="tgt-list-title">Target lain</div>
            ${targets.filter((t) => t.id !== primary?.id).map((t) => `
              <button type="button" class="tgt-list-item" data-set-primary="${t.id}">
                ${escapeHtml(t.name)} · ${Math.round((Number(t.current_amount) / Number(t.target_amount)) * 100) || 0}%
              </button>
            `).join('')}
          </div>
        ` : ''}
      </div>
      <footer class="modal-footer">
        <button type="button" class="btn-secondary-budget tap" data-action="close">Tutup</button>
        <button type="button" class="btn-primary-budget tap" data-action="save">${Icon('check', { size: 14 })} Simpan</button>
      </footer>
    </div>
  `;

  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelectorAll('[data-action="close"]').forEach((b) => { b.onclick = close; });
  overlay.onclick = (e) => { if (e.target === overlay) close(); };

  overlay.querySelector('[data-action="save"]')?.addEventListener('click', async () => {
    const form = overlay.querySelector('#tgt-form');
    const fd = new FormData(form);
    try {
      await saveFinancialTarget({
        id: primary?.id,
        name: fd.get('name'),
        target_amount: fd.get('target_amount'),
        current_amount: fd.get('current_amount'),
        monthly_contribution: fd.get('monthly_contribution') || null,
        target_date: fd.get('target_date') || null,
        is_primary: true,
      });
      if (typeof window.showToast === 'function') window.showToast('Target disimpan');
      options.onSaved?.();
      close();
    } catch (e) {
      if (typeof window.showToast === 'function') window.showToast(e.message || 'Gagal simpan', 'error');
    }
  });

  overlay.querySelectorAll('[data-set-primary]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-set-primary');
      if (!id) return;
      await setPrimaryTarget(id);
      close();
      showTargetManagerModal(options);
    });
  });
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/"/g, '&quot;');
}

if (typeof window !== 'undefined') {
  window.monefyiTargetManager = { showTargetManagerModal };
}
