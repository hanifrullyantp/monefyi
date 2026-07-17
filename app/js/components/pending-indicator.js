/**
 * Floating pending parse queue indicator + modal.
 * @module components/pending-indicator
 */

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
 * @returns {Promise<HTMLElement>}
 */
export async function renderPendingIndicator() {
  const container = document.createElement('div');
  container.className = 'pending-indicator-wrapper';
  container.style.cssText =
    'position:fixed;bottom:80px;right:16px;z-index:998;display:none;';

  async function update() {
    const pq = await getPendingModule();
    const count = await pq.getPendingCount();

    if (count === 0) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'block';
    const online = navigator.onLine;
    container.innerHTML = `
      <button type="button" class="pending-btn ${online ? 'processing' : 'waiting'}" data-action="show">
        <span class="pending-icon">${online ? '⏳' : '📴'}</span>
        <span class="pending-count">${count}</span>
        <span class="pending-label">${online ? 'diproses' : 'menunggu'}</span>
      </button>
    `;

    container.querySelector('[data-action="show"]').onclick = showPendingModal;
  }

  await update();
  const pq = await getPendingModule();
  pq.onPendingChange(update);
  window.addEventListener('online', update);
  window.addEventListener('offline', update);

  return container;
}

async function showPendingModal() {
  const pq = await getPendingModule();
  const items = await pq.getPendingItems();
  const online = navigator.onLine;

  const modal = document.createElement('div');
  modal.className = 'pending-modal-overlay';
  modal.innerHTML = `
    <div class="pending-modal">
      <header>
        <h3>Transaksi Menunggu (${items.length})</h3>
        <button type="button" class="close-btn" aria-label="Tutup">✕</button>
      </header>
      <p class="modal-info">
        ${online ? 'Sedang diproses AI di background...' : 'Akan diproses otomatis saat online kembali'}
      </p>
      <div class="pending-list">
        ${
          items.length === 0
            ? '<p class="empty">Tidak ada transaksi pending</p>'
            : items
                .map(
                  (item) => `
            <div class="pending-item" data-id="${escapeHtml(item.id)}">
              <div class="item-content">
                <div class="item-text">"${escapeHtml(item.rawText)}"</div>
                <div class="item-meta">
                  ${formatRelativeTime(item.createdAt)} •
                  Status: ${
                    item.status === 'pending'
                      ? 'Menunggu'
                      : item.status === 'processing'
                        ? 'Diproses'
                        : 'Gagal'
                  }
                  ${item.attempts ? `(${item.attempts}x)` : ''}
                </div>
                ${item.lastError ? `<div class="item-error">${escapeHtml(item.lastError)}</div>` : ''}
              </div>
              <div class="item-actions">
                ${online ? '<button type="button" class="btn-icon" data-action="retry" title="Coba lagi">🔄</button>' : ''}
                <button type="button" class="btn-icon danger" data-action="delete" title="Hapus">🗑️</button>
              </div>
            </div>
          `
                )
                .join('')
        }
      </div>
      ${
        online && items.filter((i) => i.status === 'pending').length > 0
          ? '<button type="button" class="btn-primary-full" data-action="process-all">Proses Semua Sekarang</button>'
          : ''
      }
    </div>
  `;

  modal.querySelector('.close-btn').onclick = () => modal.remove();
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };

  modal.querySelectorAll('[data-action="retry"]').forEach((btn) => {
    btn.onclick = async (e) => {
      const item = e.target.closest('.pending-item');
      await pq.retryPending(item.dataset.id);
      modal.remove();
    };
  });

  modal.querySelectorAll('[data-action="delete"]').forEach((btn) => {
    btn.onclick = async (e) => {
      if (!confirm('Hapus transaksi pending ini?')) return;
      const item = e.target.closest('.pending-item');
      await pq.deletePending(item.dataset.id);
      item.remove();
    };
  });

  modal.querySelector('[data-action="process-all"]')?.addEventListener('click', async () => {
    await pq.processPendingQueue();
    modal.remove();
  });

  document.body.appendChild(modal);
}
