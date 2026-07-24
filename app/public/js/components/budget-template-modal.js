/**
 * Budget template management popup — expand details, composition bar, confirm load.
 * @module components/budget-template-modal
 */

import { Icon } from './icons.js';
import { PRIORITY_LEVELS, createBudgetItem, createBudgetRow } from '../services/budget-model.js';

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
 * @param {object} template
 * @param {ReturnType<typeof import('../services/budget-template.js').getTemplateComposition>} composition
 */
function renderCompositionBar(composition) {
  const parts = (composition || []).filter((c) => c.percent > 0);
  if (!parts.length) {
    return `<div class="btm-comp-empty">Belum ada komposisi</div>`;
  }
  return `
    <div class="btm-comp" title="Komposisi prioritas template">
      <div class="btm-comp-bar" role="img" aria-label="Komposisi budget">
        ${parts.map((c) => `
          <span class="btm-comp-seg" style="width:${c.percent}%;background:${c.color}" title="${escapeHtml(c.label)} ${c.percent}%"></span>
        `).join('')}
      </div>
      <div class="btm-comp-legend">
        ${parts.map((c) => `
          <span class="btm-comp-leg">
            <i style="background:${c.color}"></i>${escapeHtml(c.label)} ${c.percent}%
          </span>
        `).join('')}
      </div>
    </div>
  `;
}

/**
 * @param {object} template
 * @param {string|null} activeId
 * @param {number} _income
 * @param {(t: object) => object[]} getComposition
 */
function renderTemplateItem(template, activeId, _income, getComposition) {
  const composition = getComposition(template);
  const isActive = template.id === activeId;
  const rows = template.rows || [];
  const badge = template.builtin ? '<span class="btm-badge">bawaan</span>' : '';

  return `
    <li class="btm-item ${isActive ? 'is-active' : ''}" data-template-id="${escapeHtml(template.id)}">
      <button type="button" class="btm-item-toggle tap" data-action="toggle-detail" aria-expanded="false">
        <span class="btm-item-chevron">${Icon('chevronDown', { size: 14 })}</span>
        <span class="btm-item-main">
          <span class="btm-item-label">${escapeHtml(template.label || 'Tanpa nama')} ${badge}</span>
          <span class="btm-item-meta">
            ${rows.length} kategori
            ${template.source_month ? `· dari ${escapeHtml(template.source_month)}` : ''}
            ${template.description && template.builtin ? `· ${escapeHtml(template.description)}` : ''}
            ${isActive ? '· aktif' : ''}
          </span>
        </span>
      </button>
      <div class="btm-item-actions">
        ${!template.builtin ? `
          <button type="button" class="blc-tool tap" data-action="rename" title="Rename" aria-label="Rename">${Icon('edit', { size: 14 })}</button>
          <button type="button" class="blc-tool danger tap" data-action="delete" title="Hapus" aria-label="Hapus">${Icon('trash', { size: 14 })}</button>
        ` : ''}
        <button type="button" class="blc-tool tap" data-action="load" title="Load" aria-label="Load template">${Icon('check', { size: 14 })}</button>
      </div>
      ${renderCompositionBar(composition)}
      <div class="btm-detail" hidden>
        ${rows.length ? `
          <ul class="btm-detail-list">
            ${rows.map((r, i) => {
              const prio = PRIORITY_LEVELS[String(r.priority || 'penting').toUpperCase()]
                || Object.values(PRIORITY_LEVELS).find((p) => p.key === r.priority)
                || PRIORITY_LEVELS.PENTING;
              const items = r.items || [];
              const amt = items.length
                ? items.reduce((s, it) => s + Number(it.price || 0) * Number(it.qty || 1), 0)
                : Number(r.amount || 0);
              return `
                <li class="btm-detail-row">
                  <div class="btm-detail-head">
                    <span class="btm-detail-prio" style="background:${prio.color}"></span>
                    <strong>${escapeHtml(r.name || `Kategori ${i + 1}`)}</strong>
                    <span class="btm-detail-amt">Rp ${formatIDR(amt)}</span>
                  </div>
                  ${items.length ? `
                    <ul class="btm-detail-items">
                      ${items.map((it) => `
                        <li>
                          <span>${escapeHtml(it.name || 'Item')}</span>
                          <span>Rp ${formatIDR(Number(it.price || 0) * Number(it.qty || 1))}</span>
                        </li>
                      `).join('')}
                    </ul>
                  ` : ''}
                </li>
              `;
            }).join('')}
          </ul>
        ` : `<p class="btm-empty">Template kosong</p>`}
      </div>
    </li>
  `;
}

/**
 * Confirm which categories to load + edit nominals.
 * @param {object} opts
 * @returns {Promise<{ selectedIndexes: number[], amountOverrides: Record<number, number> }|null>}
 */
function showLoadConfirmModal({ template, income, preview }) {
  return new Promise((resolve) => {
    const existing = document.querySelector('.btm-confirm-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'btm-confirm-overlay budget-modal-overlay show';
    overlay.innerHTML = `
      <div class="budget-modal btm-confirm-modal" role="dialog" aria-modal="true" aria-label="Konfirmasi load template">
        <header class="modal-header">
          <div>
            <h2>Load: ${escapeHtml(template.label || 'Template')}</h2>
            <p class="modal-subtitle">Pilih kategori · Wajib tetap nominal · lain × % income (Rp ${formatIDR(income)})</p>
          </div>
          <button type="button" class="close-btn sheet-close-btn" data-action="close" aria-label="Tutup">${Icon('x', { size: 18 })}</button>
        </header>
        <div class="modal-body btm-confirm-body">
          <div class="btm-confirm-tools">
            <button type="button" class="btc-btn ghost tap" data-action="select-all">Pilih semua</button>
            <button type="button" class="btc-btn ghost tap" data-action="select-none">Kosongkan</button>
          </div>
          <ul class="btm-confirm-list">
            ${preview.map((row) => {
              const prio = PRIORITY_LEVELS[String(row.priority || 'penting').toUpperCase()]
                || Object.values(PRIORITY_LEVELS).find((p) => p.key === row.priority)
                || PRIORITY_LEVELS.PENTING;
              return `
                <li class="btm-confirm-row" data-index="${row.index}">
                  <label class="btm-confirm-check">
                    <input type="checkbox" data-role="select" ${row.selected ? 'checked' : ''}>
                    <span class="btm-detail-prio" style="background:${prio.color}"></span>
                    <span class="btm-confirm-name">
                      ${escapeHtml(row.name)}
                      ${row.fixed ? '<span class="btm-badge">wajib</span>' : `<span class="btm-badge muted">%</span>`}
                    </span>
                  </label>
                  <div class="btm-confirm-amt">
                    <span class="btm-confirm-rp">Rp</span>
                    <input type="text" inputmode="numeric" data-role="amount" value="${formatIDR(row.amount)}" aria-label="Nominal ${escapeHtml(row.name)}">
                  </div>
                </li>
              `;
            }).join('')}
          </ul>
        </div>
        <footer class="modal-footer btm-confirm-footer">
          <button type="button" class="btc-btn ghost tap" data-action="close">Batal</button>
          <button type="button" class="btc-btn primary tap" data-action="confirm">Load ke draft</button>
        </footer>
      </div>
    `;

    document.body.appendChild(overlay);

    const close = (result = null) => {
      overlay.classList.remove('show');
      setTimeout(() => overlay.remove(), 200);
      resolve(result);
    };

    const parseAmount = (raw) => {
      const n = Number(String(raw || '').replace(/[^\d]/g, ''));
      return Number.isFinite(n) ? n : 0;
    };

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close(null);
    });
    overlay.querySelectorAll('[data-action="close"]').forEach((btn) => {
      btn.addEventListener('click', () => close(null));
    });
    overlay.querySelector('[data-action="select-all"]')?.addEventListener('click', () => {
      overlay.querySelectorAll('[data-role="select"]').forEach((el) => { el.checked = true; });
    });
    overlay.querySelector('[data-action="select-none"]')?.addEventListener('click', () => {
      overlay.querySelectorAll('[data-role="select"]').forEach((el) => { el.checked = false; });
    });
    overlay.querySelector('[data-action="confirm"]')?.addEventListener('click', () => {
      const selectedIndexes = [];
      const amountOverrides = {};
      overlay.querySelectorAll('.btm-confirm-row').forEach((rowEl) => {
        const idx = Number(rowEl.dataset.index);
        const checked = rowEl.querySelector('[data-role="select"]')?.checked;
        if (!checked) return;
        selectedIndexes.push(idx);
        amountOverrides[idx] = parseAmount(rowEl.querySelector('[data-role="amount"]')?.value);
      });
      if (!selectedIndexes.length) {
        showToast('Pilih minimal satu kategori', 'error');
        return;
      }
      close({ selectedIndexes, amountOverrides });
    });
  });
}

/**
 * Apply selected preview amounts into draft rows.
 * @param {object} template
 * @param {number} income
 * @param {number[]} selectedIndexes
 * @param {Record<number, number>} amountOverrides
 * @param {object[]} preview
 */
function buildRowsFromConfirm(template, income, selectedIndexes, amountOverrides, preview) {
  const byIndex = new Map(preview.map((p) => [p.index, p]));
  return selectedIndexes.map((idx) => {
    const p = byIndex.get(idx);
    const amount = Math.max(0, Number(amountOverrides[idx] ?? p?.amount ?? 0));
    const source = (template.rows || [])[idx] || {};
    const itemsSrc = p?.items?.length
      ? p.items
      : (source.items || []);

    let items;
    if (itemsSrc.length === 1) {
      items = [createBudgetItem({
        ...itemsSrc[0],
        id: undefined,
        status: 'planned',
        linked_transactions: [],
        price: amount,
        qty: itemsSrc[0].qty || 1,
      })];
    } else if (itemsSrc.length > 1) {
      const total = itemsSrc.reduce((s, it) => s + Number(it.price || 0) * Number(it.qty || 1), 0) || 1;
      items = itemsSrc.map((it) => {
        const share = (Number(it.price || 0) * Number(it.qty || 1)) / total;
        const price = Math.round((amount * share) / Math.max(1, Number(it.qty || 1)) / 1000) * 1000;
        return createBudgetItem({
          ...it,
          id: undefined,
          status: 'planned',
          linked_transactions: [],
          price,
          qty: it.qty || 1,
        });
      });
    } else {
      items = [createBudgetItem({
        name: p?.name || source.name || 'Item',
        price: amount,
        qty: 1,
        status: 'planned',
      })];
    }

    const rowAmount = items.reduce((s, it) => s + Number(it.price || 0) * Number(it.qty || 1), 0);
    return createBudgetRow({
      ...source,
      id: undefined,
      name: p?.name || source.name,
      priority: p?.priority || source.priority || 'penting',
      amount: rowAmount || amount,
      items,
      last_month_actual: 0,
      three_month_avg: 0,
    });
  });
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
    setActiveTemplateId,
    saveBudgetTemplate,
    updateBudgetTemplate,
    deleteBudgetTemplate,
    getTemplateComposition,
    previewTemplateLoad,
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
          <p class="modal-subtitle">Tap template untuk detail · Load untuk pilih & edit nominal</p>
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
              ${customs.map((t) => renderTemplateItem(t, activeId, income, getTemplateComposition)).join('')}
            </ul>
          ` : `
            <p class="btm-empty">Belum ada template tersimpan. Simpan setup bulan ini di atas.</p>
          `}
        </section>

        <section class="btm-section">
          <h3 class="btm-section-title">Template bawaan</h3>
          <ul class="btm-list">
            ${builtins.map((t) => renderTemplateItem(t, activeId, income, getTemplateComposition)).join('')}
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

  const wireItem = (itemEl) => {
    const id = itemEl.dataset.templateId;
    const template = templates.find((t) => t.id === id);
    if (!template) return;

    itemEl.querySelector('[data-action="toggle-detail"]')?.addEventListener('click', () => {
      const detail = itemEl.querySelector('.btm-detail');
      const btn = itemEl.querySelector('[data-action="toggle-detail"]');
      const open = detail?.hasAttribute('hidden');
      overlay.querySelectorAll('.btm-item.is-open').forEach((el) => {
        if (el === itemEl) return;
        el.classList.remove('is-open');
        el.querySelector('.btm-detail')?.setAttribute('hidden', '');
        el.querySelector('[data-action="toggle-detail"]')?.setAttribute('aria-expanded', 'false');
      });
      if (open) {
        detail.removeAttribute('hidden');
        itemEl.classList.add('is-open');
        btn?.setAttribute('aria-expanded', 'true');
      } else {
        detail.setAttribute('hidden', '');
        itemEl.classList.remove('is-open');
        btn?.setAttribute('aria-expanded', 'false');
      }
    });

    itemEl.querySelector('[data-action="load"]')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      const preview = previewTemplateLoad(template, income);
      if (!preview.length || (income <= 0 && preview.every((p) => !p.amount))) {
        showToast('Template kosong atau income belum diisi', 'error');
        return;
      }
      const choice = await showLoadConfirmModal({ template, income, preview });
      if (!choice) return;
      try {
        const appliedRows = buildRowsFromConfirm(
          template,
          income,
          choice.selectedIndexes,
          choice.amountOverrides,
          preview,
        );
        await setActiveTemplateId(template.id);
        if (window.STATE?.budgetDraft) {
          window.STATE.budgetDraft.rows = appliedRows;
          window.STATE.budgetDraft.income = income || 0;
          window.STATE.budgetDraft.initialFrom = 'template';
          window.STATE.budgetDraft.month = month;
        }
        showToast(`Template "${template.label || 'terpilih'}" dimuat — klik Simpan untuk persist`);
        close();
        await options.onApplied?.();
      } catch (err) {
        showToast(err.message || 'Gagal load template', 'error');
      }
    });

    itemEl.querySelector('[data-action="rename"]')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      const label = prompt('Rename template');
      if (!label?.trim()) return;
      try {
        await updateBudgetTemplate(id, { label: label.trim() });
        showToast('Template diupdate');
        close();
        await showBudgetTemplateModal(options);
      } catch (err) {
        showToast(err.message || 'Gagal rename', 'error');
      }
    });

    itemEl.querySelector('[data-action="delete"]')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm('Hapus template ini?')) return;
      try {
        await deleteBudgetTemplate(id);
        showToast('Template dihapus');
        close();
        await showBudgetTemplateModal(options);
      } catch (err) {
        showToast(err.message || 'Gagal hapus', 'error');
      }
    });
  };

  overlay.querySelectorAll('.btm-item').forEach(wireItem);
}

if (typeof window !== 'undefined') {
  window.monefyiBudgetTemplateModal = { showBudgetTemplateModal };
}
