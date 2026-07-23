/**
 * Top-right pending badge — parse queue + sync queue + soft deletes.
 * @module components/pending-badge
 */

import { getDb } from '../services/offline-db.js';

/** @type {object|null} */
let _pendingModule = null;

/**
 * @returns {Promise<object>}
 */
async function getPendingModule() {
  if (!_pendingModule) {
    _pendingModule = await import('../services/pending-queue.js');
  }
  return _pendingModule;
}

/**
 * @param {unknown} str
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str || '');
  return div.innerHTML;
}

/**
 * @param {string} iso
 */
function formatRelativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Baru saja';
  if (mins < 60) return `${mins}m lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}j lalu`;
  return new Date(iso).toLocaleDateString('id-ID');
}

/**
 * @returns {Promise<{parse: number, sync: number, deleted: number, total: number, parseItems: object[], syncItems: object[], deletedItems: object[]}>}
 */
export async function getPendingCounts() {
  let parseItems = [];
  let parse = 0;

  try {
    const pq = await getPendingModule();
    parseItems = await pq.getPendingItems();
    parse = parseItems.filter((i) => i.status === 'pending' || i.status === 'processing').length;
  } catch {
    /* ignore */
  }

  let syncItems = [];
  let deletedItems = [];
  let sync = 0;
  let deleted = 0;

  try {
    const db = await getDb();
    syncItems = await db.sync_queue.where('status').equals('pending').toArray();
    sync = syncItems.length;
    deletedItems = await db.transactions.where('_sync_status').equals('pending_delete').toArray();
    deleted = deletedItems.length;
  } catch {
    /* ignore */
  }

  return {
    parse,
    sync,
    deleted,
    total: parse + sync + deleted,
    parseItems,
    syncItems,
    deletedItems,
  };
}

/**
 * @returns {Promise<HTMLElement>}
 */
export async function renderPendingBadge() {
  const badge = document.createElement('button');
  badge.type = 'button';
  badge.className = 'pending-badge';
  badge.setAttribute('aria-label', 'Pending items');
  badge.style.display = 'none';

  async function update() {
    const counts = await getPendingCounts();
    if (counts.total === 0) {
      badge.style.display = 'none';
      return;
    }
    badge.style.display = 'flex';
    badge.innerHTML = `
      <span class="pending-badge__icon" aria-hidden="true">⚠️</span>
      <span class="pending-badge__count">${counts.total}</span>
    `;
  }

  badge.onclick = () => showPendingModal();

  await update();

  const pq = await getPendingModule();
  pq.onPendingChange(update);
  window.addEventListener('online', update);
  window.addEventListener('offline', update);
  window.addEventListener('monefyi-pending-change', update);
  window.addEventListener('monefyi-sync-complete', update);

  return badge;
}

async function showPendingModal() {
  const counts = await getPendingCounts();
  const pq = await getPendingModule();
  const online = navigator.onLine;

  const modal = document.createElement('div');
  modal.className = 'pending-modal-overlay';
  modal.innerHTML = `
    <div class="pending-modal pending-modal--wide">
      <header>
        <h3>Menunggu (${counts.total})</h3>
        <button type="button" class="close-btn sheet-close-btn" aria-label="Tutup"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
      </header>

      <div class="pending-tabs">
        <button type="button" class="pending-tab active" data-tab="parse">Parse (${counts.parse})</button>
        <button type="button" class="pending-tab" data-tab="sync">Sync (${counts.sync})</button>
        <button type="button" class="pending-tab" data-tab="deleted">Dihapus (${counts.deleted})</button>
        <button type="button" class="pending-tab" data-tab="activity">Riwayat</button>
      </div>

      <div class="pending-tab-panel" data-panel="parse">
        <p class="modal-info">${online ? 'Input akan diproses AI saat online.' : 'Akan diproses otomatis saat online.'}</p>
        <div class="pending-list">
          ${counts.parseItems.length === 0 ? '<p class="empty">Tidak ada parse pending</p>' : counts.parseItems.map((item) => `
            <div class="pending-item" data-id="${escapeHtml(item.id)}">
              <div class="item-content">
                <div class="item-text">"${escapeHtml(item.rawText)}"</div>
                <div class="item-meta">${formatRelativeTime(item.createdAt)} • ${escapeHtml(item.status)}</div>
              </div>
              <div class="item-actions">
                ${online ? '<button type="button" class="btn-icon" data-action="retry-parse" title="Coba lagi">🔄</button>' : ''}
                <button type="button" class="btn-icon danger" data-action="delete-parse" title="Hapus">🗑️</button>
              </div>
            </div>
          `).join('')}
        </div>
        ${online && counts.parse > 0 ? '<button type="button" class="btn-primary-full" data-action="process-all-parse">Proses Semua Parse</button>' : ''}
      </div>

      <div class="pending-tab-panel hidden" data-panel="sync">
        <div class="pending-list">
          ${counts.syncItems.length === 0 ? '<p class="empty">Tidak ada sync pending</p>' : counts.syncItems.map((item) => `
            <div class="pending-item">
              <div class="item-content">
                <div class="item-text">${escapeHtml(item.operation)} ${escapeHtml(item.table)}</div>
                <div class="item-meta">${formatRelativeTime(item.created_at)} • ${escapeHtml(item.record_id)}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="pending-tab-panel hidden" data-panel="deleted">
        <div class="pending-list">
          ${counts.deletedItems.length === 0 ? '<p class="empty">Tidak ada hapus menunggu sync</p>' : counts.deletedItems.map((item) => `
            <div class="pending-item">
              <div class="item-content">
                <div class="item-text">${escapeHtml(item.merchant || item.category || item.notes || item.id)}</div>
                <div class="item-meta">${escapeHtml(item.amount)} • ${escapeHtml(item.date)}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="pending-tab-panel hidden" data-panel="activity">
        <div id="activityHistoryMount" class="activity-history-mount"></div>
      </div>
    </div>
  `;

  modal.querySelector('.close-btn').onclick = () => modal.remove();
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };

  modal.querySelectorAll('.pending-tab').forEach((tab) => {
    tab.onclick = () => {
      modal.querySelectorAll('.pending-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      const name = tab.dataset.tab;
      modal.querySelectorAll('.pending-tab-panel').forEach((p) => {
        p.classList.toggle('hidden', p.dataset.panel !== name);
      });
      if (name === 'activity') loadActivityPanel(modal);
    };
  });

  modal.querySelectorAll('[data-action="retry-parse"]').forEach((btn) => {
    btn.onclick = async (e) => {
      const item = e.target.closest('.pending-item');
      await pq.retryPending(item.dataset.id);
      modal.remove();
    };
  });

  modal.querySelectorAll('[data-action="delete-parse"]').forEach((btn) => {
    btn.onclick = async (e) => {
      const item = e.target.closest('.pending-item');
      await pq.deletePending(item.dataset.id);
      item.remove();
    };
  });

  modal.querySelector('[data-action="process-all-parse"]')?.addEventListener('click', async () => {
    await pq.processPendingQueue();
    modal.remove();
  });

  document.body.appendChild(modal);
}

/**
 * @param {HTMLElement} modal
 */
async function loadActivityPanel(modal) {
  const mount = modal.querySelector('#activityHistoryMount');
  if (!mount || mount.dataset.loaded) return;
  try {
    const { renderActivityHistory } = await import('./activity-history.js');
    mount.innerHTML = '';
    mount.appendChild(await renderActivityHistory());
    mount.dataset.loaded = '1';
  } catch (e) {
    mount.innerHTML = `<p class="empty">Gagal memuat riwayat</p>`;
  }
}

if (typeof window !== 'undefined') {
  window.monefyiPendingBadge = { getPendingCounts, renderPendingBadge };
}
