/**
 * Activity history panel — last 100 local actions.
 * @module components/activity-history
 */

const ACTION_ICONS = {
  create: '➕',
  update: '✏️',
  delete: '🗑️',
  parse_pending: '⏳',
  sync_push: '🔄',
  undo: '↩️',
  redo: '↪️',
};

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
export async function renderActivityHistory() {
  const container = document.createElement('div');
  container.className = 'activity-history';

  async function render() {
    const items = (await window.monefyiActivity?.getActivityLog?.(100)) || [];
    if (items.length === 0) {
      container.innerHTML = '<p class="empty">Belum ada aktivitas</p>';
      return;
    }
    container.innerHTML = items
      .map(
        (item) => `
      <div class="activity-item">
        <span class="activity-item__icon">${ACTION_ICONS[item.action] || '•'}</span>
        <div class="activity-item__body">
          <div class="activity-item__summary">${escapeHtml(item.summary || item.action)}</div>
          <div class="activity-item__meta">${formatRelativeTime(item.createdAt)}</div>
        </div>
      </div>
    `
      )
      .join('');
  }

  await render();
  window.addEventListener('monefyi-activity-change', render);
  return container;
}

/**
 * @param {unknown} str
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str || '');
  return div.innerHTML;
}
