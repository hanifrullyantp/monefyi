/**
 * Budget template management popup — save current / load custom / load builtin.
 * @module components/budget-template-modal
 */

import { Icon } from './icons.js';

/**
 * @param {unknown} str
 * @returns {string}
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str ?? '');
  return div.innerHTML;
}

/**
 * @param {number} num
 */
function formatIDR(num) {
  return new Intl.NumberFormat('id-ID').format(Math.round(num || 0));
}

function showToast(msg, kind = 'success') {
  if (typeof window.showToast === 'function') {
    window.showToast(msg, kind);
    return;
  }
  if (window.MonefyiUI?.showToast) window.MonefyiUI.showToast(msg, kind);
}

/**
 * @param {object} options
 * @param {string} options.month
 * @param {number} options.income
 * @param {object[]} options.rows
 * @param {() => void|Promise<void>} [options.onApplied]
 */
export async function showBudgetTemplateModal(options = {}) {
  const existing = document.querySelector('.btm-overlay');
  if (existing) existing.remove();

  const month = options.month
    || window.STATE?.budgetDraft?.month
    || window.STATE?.selectedMonth
    || '';
  const income = Number(options.income ?? window.STATE?.budgetDraft?.income ?? 0);
  const rows = Array.isArray(options.rows)
    ? options.rows
    : (window.STATE?.budgetDraft?.rows || []);

  const {
    listBudgetTemplates,
    getActiveTemplateId,
    applyTemplateById,
    saveBudgetTemplate,
    updateBudgetTemplate,
    deleteBudgetTemplate,
  } = await import('../services/budget-template.js');

  const templates = await listBudgetTemplates();
  const activeId = await getActiveTemplateId();
  const builtins = templates.filter((t) => t.builtin);
  const customs = templates.filter((t) => !t.builtin);

  const overlay = document.createElement('div');
  overlay.className = 'btm-overlay budget-modal-overlay';
  overlay.innerHTML = `
    <div class="budget-modal btm-modal" role="dialog" aria-modal="true" aria-label="Manajemen template budget">
      <header class="modal-header">
        <div>
          <h2>${Icon('template', { size: 18 })} Template Budget</h2>
          <p class="modal-subtitle">Simpan setup saat ini atau terapkan template</p>
        </div>
        <button type="button" class="close-btn sheet-close-btn" data-action="close" aria-label="Tutup">${Icon('x', { size: 18 })}</button>
      </header>
      <div class="modal-body btm-body">
        <section class="btm-section">
          <h3 class="btm-section-title">Simpan template saat ini</h3>
          <p class="btm-hint">${rows.length} kategori · Income Rp ${formatIDR(income)} · ${escapeHtml(month || '—')}</p>
          <div class="btm-save-row">
            <input type="text" class="form-input btm-save-name" id="btm-save-name" placeholder="Nama template" value="Template ${escapeHtml(month || '')}" ${rows.length === 0 ? 'disabled' : ''}>
            <button type="button" class="btc-btn primary tap" data-action="save-current" ${rows.length === 0 ? 'disabled' : ''}>
              ${Icon('save', { size: 14 })} Simpan
            </button>
          </div>
        </section>

        <section class="btm-section">
          <h3 class="btm-section-title">Template tersimpan</h3>
          ${customs.length ? `
            <ul class="btm-list">
              ${customs.map((t) => `
                <li class="btm-item ${t.id === activeId ? 'is-active' : ''}" data-template-id="${escapeHtml(t.id)}">
                  <div class="btm-item-main">
                    <div class="btm-item-label">${escapeHtml(t.label || 'Tanpa nama')}</div>
                    <div class="btm-item-meta">
                      ${(t.rows || []).length} kategori
                      ${t.source_month ? `· dari ${escapeHtml(t.source_month)}` : ''}
                      ${t.id === activeId ? '· aktif' : ''}
                    </div>
                  </div>
                  <div class="btm-item-actions">
                    <button type="button" class="blc-tool tap" data-action="apply" title="Terapkan" aria-label="Terapkan">${Icon('check', { size: 14 })}</button>
                    <button type="button" class="blc-tool tap" data-action="rename" title="Rename" aria-label="Rename">${Icon('edit', { size: 14 })}</button>
                    <button type="button" class="blc-tool danger tap" data-action="delete" title="Hapus" aria-label="Hapus">${Icon('trash', { size: 14 })}</button>
                  </div>
                </li>
              `).join('')}
            </ul>
          ` : `
            <p class="btm-empty">Belum ada template tersimpan. Simpan setup bulan ini di atas.</p>
          `}
        </section>

        <section class="btm-section">
          <h3 class="btm-section-title">Template bawaan</h3>
          <ul class="btm-list">
            ${builtins.map((t) => `
              <li class="btm-item ${t.id === activeId ? 'is-active' : ''}" data-template-id="${escapeHtml(t.id)}">
                <div class="btm-item-main">
                  <div class="btm-item-label">${escapeHtml(t.label)} <span class="btm-badge">bawaan</span></div>
                  <div class="btm-item-meta">${escapeHtml(t.description || `${(t.rows || []).length} kategori`)}</div>
                </div>
                <div class="btm-item-actions">
                  <button type="button" class="blc-tool tap" data-action="apply" title="Terapkan" aria-label="Terapkan">${Icon('check', { size: 14 })}</button>
                </div>
              </li>
            `).join('')}
          </ul>
        </section>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('show'));

  const close = () => {
    overlay.classList.remove('show');
    setTimeout(() => overlay.remove(), 220);
  };

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  overlay.querySelector('[data-action="close"]')?.addEventListener('click', close);

  overlay.querySelector('[data-action="save-current"]')?.addEventListener('click', async () => {
    if (!rows.length) {
      showToast('Belum ada budget untuk disimpan', 'error');
      return;
    }
    const input = overlay.querySelector('#btm-save-name');
    const label = (input?.value || '').trim() || `Template ${month}`;
    try {
      await saveBudgetTemplate(month, income, rows, { label });
      showToast('Template tersimpan');
      close();
      await options.onApplied?.();
    } catch (e) {
      showToast(e.message || 'Gagal simpan template', 'error');
    }
  });

  overlay.querySelectorAll('.btm-item').forEach((itemEl) => {
    const id = itemEl.dataset.templateId;

    itemEl.querySelector('[data-action="apply"]')?.addEventListener('click', async () => {
      if (!confirm('Terapkan template ini? Budget bulan ini akan diganti.')) return;
      try {
        const applied = await applyTemplateById(id, month);
        if (!applied?.rows?.length) {
          showToast('Template kosong atau income belum diisi', 'error');
          return;
        }
        if (window.STATE?.budgetDraft) {
          window.STATE.budgetDraft.rows = applied.rows;
          window.STATE.budgetDraft.income = applied.income || income || 0;
          window.STATE.budgetDraft.initialFrom = 'template';
          window.STATE.budgetDraft.month = month;
        }
        showToast(`Template "${applied.template_label || 'terpilih'}" diterapkan — klik Simpan untuk persist`);
        close();
        await options.onApplied?.();
      } catch (e) {
        showToast(e.message || 'Gagal terapkan', 'error');
      }
    });

    itemEl.querySelector('[data-action="rename"]')?.addEventListener('click', async () => {
      const label = prompt('Rename template');
      if (!label?.trim()) return;
      try {
        await updateBudgetTemplate(id, { label: label.trim() });
        showToast('Template diupdate');
        close();
        await showBudgetTemplateModal(options);
      } catch (e) {
        showToast(e.message || 'Gagal rename', 'error');
      }
    });

    itemEl.querySelector('[data-action="delete"]')?.addEventListener('click', async () => {
      if (!confirm('Hapus template ini?')) return;
      try {
        await deleteBudgetTemplate(id);
        showToast('Template dihapus');
        close();
        await showBudgetTemplateModal(options);
      } catch (e) {
        showToast(e.message || 'Gagal hapus', 'error');
      }
    });
  });
}

if (typeof window !== 'undefined') {
  window.monefyiBudgetTemplateModal = { showBudgetTemplateModal };
}
