/**
 * Notification bell + panel UI.
 * @module components/notification-bell
 */

import { Icon } from './icons.js';

/** @type {Promise<typeof import('../services/notification-center.js')>|null} */
let _notifModule = null;

/**
 * @returns {Promise<typeof import('../services/notification-center.js')>}
 */
async function getNotif() {
  if (!_notifModule) _notifModule = import('../services/notification-center.js');
  return _notifModule;
}

/**
 * @returns {Promise<HTMLButtonElement>}
 */
export async function renderNotificationBell() {
  const bell = document.createElement('button');
  bell.type = 'button';
  bell.className = 'notif-bell tap';
  bell.setAttribute('aria-label', 'Notifikasi');

  async function update() {
    const nm = await getNotif();
    const count = await nm.getUnreadCount();
    bell.innerHTML = `
      ${Icon('bell', { size: 20 })}
      ${count > 0 ? `<span class="notif-badge">${count > 99 ? '99+' : count}</span>` : ''}
    `;
    bell.classList.toggle('has-unread', count > 0);

    const desktopBadge = document.getElementById('notifBadgeDesktop');
    if (desktopBadge) {
      desktopBadge.classList.toggle('hidden', count <= 0);
      desktopBadge.textContent = count > 9 ? '9+' : String(count);
      desktopBadge.classList.toggle('notif-badge--count', count > 0);
    }
  }

  await update();
  const nm = await getNotif();
  nm.onNotificationChange(update);
  bell.onclick = () => showNotificationPanel(bell);
  return bell;
}

/**
 * Mount bell to mobile header (before user button).
 * @returns {Promise<HTMLButtonElement|null>}
 */
export async function mountNotificationBell() {
  if (document.getElementById('notifBellMobile')) {
    return document.getElementById('notifBellMobile');
  }

  const bell = await renderNotificationBell();
  bell.id = 'notifBellMobile';
  bell.classList.add('mobile-header-ghost', 'top-bar__icon-btn');

  const searchBtn = document.getElementById('btnTopSearchMobile');
  if (searchBtn?.parentElement) {
    searchBtn.parentElement.appendChild(bell);
    return bell;
  }

  const actions = document.querySelector('.mobile-header-actions');
  if (actions) {
    actions.appendChild(bell);
    return bell;
  }

  return bell;
}

/**
 * Wire existing desktop notification button.
 */
export async function wireDesktopNotificationBell() {
  const btn = document.getElementById('btnNotifDesktop');
  if (!btn || btn.dataset.notifWired) return;
  btn.dataset.notifWired = '1';

  async function updateDesktop() {
    const nm = await getNotif();
    const count = await nm.getUnreadCount();
    const badge = document.getElementById('notifBadgeDesktop');
    if (badge) {
      badge.classList.toggle('hidden', count <= 0);
      if (count > 0) {
        badge.textContent = count > 9 ? '9+' : String(count);
        badge.classList.add('notif-badge--count');
      }
    }
  }

  await updateDesktop();
  const nm = await getNotif();
  nm.onNotificationChange(updateDesktop);

  btn.onclick = (e) => {
    e.stopPropagation();
    showNotificationPanel(btn);
  };
}

/**
 * Position panel below anchor bell (top-right origin).
 * @param {HTMLElement} panel
 * @param {HTMLElement|null} anchor
 */
function positionNotifPanel(panel, anchor) {
  const pad = 12;
  const gap = 8;

  if (anchor) {
    const rect = anchor.getBoundingClientRect();
    const top = Math.round(rect.bottom + gap);
    const right = Math.max(pad, Math.round(window.innerWidth - rect.right));
    panel.style.setProperty('--notif-panel-top', `${top}px`);
    panel.style.setProperty('--notif-panel-right', `${right}px`);
    return;
  }

  panel.style.setProperty('--notif-panel-top', '56px');
  panel.style.setProperty('--notif-panel-right', `${pad}px`);
}

/**
 * @param {HTMLElement} overlay
 * @param {() => void} [onDone]
 */
function closeNotifPanel(overlay, onDone) {
  overlay.classList.remove('is-open');
  window.setTimeout(() => {
    overlay.remove();
    onDone?.();
  }, 280);
}

/**
 * Show notification panel anchored to bell icon.
 * @param {HTMLElement} [anchorEl]
 */
export async function showNotificationPanel(anchorEl) {
  const existing = document.querySelector('.notif-modal-overlay');
  if (existing) existing.remove();

  const anchor = anchorEl
    || document.getElementById('notifBellMobile')
    || document.getElementById('btnNotifDesktop');

  const nm = await getNotif();
  const notifications = await nm.getNotifications();
  const unreadCount = notifications.filter((n) => !n.read).length;

  const modal = document.createElement('div');
  modal.className = 'notif-modal-overlay';
  modal.innerHTML = `
    <div class="notif-modal" role="dialog" aria-modal="true" aria-label="Notifikasi">
      <header class="notif-header">
        <div class="notif-header-title">
          <h3>🔔 Notifikasi</h3>
          ${unreadCount > 0 ? `<span class="notif-header-count">${unreadCount} baru</span>` : ''}
        </div>
        <div class="notif-header-actions">
          ${unreadCount > 0 ? '<button type="button" class="btn-notif-action" data-action="mark-all">Tandai dibaca</button>' : ''}
          <button type="button" class="close-btn" data-action="close" aria-label="Tutup">✕</button>
        </div>
      </header>
      <div class="notif-filter-tabs">
        <button type="button" class="notif-tab active" data-filter="all">Semua (${notifications.length})</button>
        <button type="button" class="notif-tab" data-filter="unread">Belum Dibaca (${unreadCount})</button>
        <button type="button" class="notif-tab" data-filter="budget">Budget</button>
        <button type="button" class="notif-tab" data-filter="ai">Monevisor</button>
      </div>
      <div class="notif-list" id="notif-list">${renderNotifList(notifications)}</div>
      ${notifications.length > 0 ? `
        <footer class="notif-footer">
          <button type="button" class="btn-danger-outline" data-action="clear-all">Hapus Semua</button>
        </footer>
      ` : ''}
    </div>
  `;

  document.body.appendChild(modal);
  const panel = modal.querySelector('.notif-modal');
  if (panel) positionNotifPanel(panel, anchor);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => modal.classList.add('is-open'));
  });

  wireHandlers(modal, notifications, anchor);
}

/**
 * @param {object[]} notifications
 * @returns {string}
 */
function renderNotifList(notifications) {
  if (!notifications.length) {
    return `
      <div class="notif-empty">
        <div class="notif-empty-icon">🔔</div>
        <div class="notif-empty-title">Tidak ada notifikasi</div>
        <div class="notif-empty-desc">Kamu up-to-date!</div>
      </div>
    `;
  }

  const grouped = groupByDate(notifications);
  return Object.entries(grouped).map(([date, items]) => `
    <div class="notif-group">
      <div class="notif-date">${formatDateLabel(date)}</div>
      ${items.map((n) => renderNotifItem(n)).join('')}
    </div>
  `).join('');
}

/**
 * @param {object} n
 * @returns {string}
 */
function renderNotifItem(n) {
  const time = new Date(n.timestamp).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `
    <div class="notif-item ${n.read ? '' : 'unread'} severity-${n.severity || 'info'}" data-id="${n.id}">
      <div class="notif-icon" style="color: ${getColor(n.type)}">${n.icon || '🔔'}</div>
      <div class="notif-content">
        <div class="notif-title">${escapeHtml(n.title)}</div>
        <div class="notif-message">${escapeHtml(n.message)}</div>
        ${n.actions?.length ? `
          <div class="notif-actions">
            ${n.actions.slice(0, 2).map((a) => `
              <button type="button" class="notif-action-btn"
                data-action="${a.action}"
                data-budget-id="${a.budgetId || ''}"
                data-priority="${a.priority || ''}"
                data-notif-id="${n.id}">
                ${escapeHtml(a.label)}
              </button>
            `).join('')}
          </div>
        ` : ''}
        <div class="notif-time">${time}</div>
      </div>
      <button type="button" class="notif-dismiss" data-action="dismiss" data-id="${n.id}" title="Hapus">✕</button>
    </div>
  `;
}

/**
 * @param {HTMLElement} modal
 * @param {object[]} notifications
 * @param {HTMLElement|null} [anchor]
 */
function wireHandlers(modal, notifications, anchor) {
  const close = (onDone) => closeNotifPanel(modal, onDone);
  modal.querySelectorAll('[data-action="close"]').forEach((b) => { b.onclick = () => close(); });
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

  modal.querySelector('[data-action="mark-all"]')?.addEventListener('click', async () => {
    await window.monefyiNotif?.markAllAsRead();
    close(() => showNotificationPanel(anchor));
  });

  modal.querySelector('[data-action="clear-all"]')?.addEventListener('click', async () => {
    if (!confirm('Hapus semua notifikasi?')) return;
    await window.monefyiNotif?.clearAll();
    close();
  });

  modal.querySelectorAll('.notif-tab').forEach((tab) => {
    tab.onclick = () => {
      modal.querySelectorAll('.notif-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      const filter = tab.dataset.filter;
      let filtered = notifications;
      if (filter === 'unread') filtered = notifications.filter((n) => !n.read);
      else if (filter === 'budget') filtered = notifications.filter((n) => n.source === 'budget');
      else if (filter === 'ai') filtered = notifications.filter((n) => n.source === 'ai' || n.type === 'ai_recommendation');

      const list = modal.querySelector('#notif-list');
      if (list) list.innerHTML = renderNotifList(filtered);
      wireItemHandlers(modal);
    };
  });

  wireItemHandlers(modal);
}

/**
 * @param {HTMLElement} modal
 */
function wireItemHandlers(modal) {
  const nm = window.monefyiNotif;
  if (!nm) return;

  modal.querySelectorAll('.notif-item').forEach((item) => {
    item.onclick = async (e) => {
      if (e.target.closest('button')) return;
      await nm.markAsRead(item.dataset.id);
      item.classList.remove('unread');
    };
  });

  modal.querySelectorAll('[data-action="dismiss"]').forEach((btn) => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      await nm.dismissNotification(btn.dataset.id);
      btn.closest('.notif-item')?.remove();
    };
  });

  modal.querySelectorAll('.notif-action-btn').forEach((btn) => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      const action = btn.dataset.action;
      const budgetId = btn.dataset.budgetId;
      const priority = btn.dataset.priority;
      const notifId = btn.dataset.notifId;
      if (notifId) await nm.markAsRead(notifId);
      closeNotifPanel(modal);

      if (action === 'open_budget' || action === 'increase_budget' || action === 'increase_savings' || action === 'add_to_savings' || action === 'review_priority') {
        if (typeof window.openBudget === 'function') window.openBudget();
        setTimeout(async () => {
          const state = window.STATE;
          const rows = state?.budgetDraft?.rows || [];
          const budget = rows.find((b) => b.id === budgetId);
          const { showBudgetFormModal } = await import('./budget-form-modal.js');
          if (action === 'increase_budget' && budget) {
            showBudgetFormModal(budget, { onSaved: () => window.renderBudgetPageView?.() });
          } else if ((action === 'increase_savings' || action === 'add_to_savings') && state?.budgetDraft) {
            showBudgetFormModal({ priority: 'simpan', name: 'Tabungan', month: state.budgetDraft.month }, {
              onSaved: () => window.renderBudgetPageView?.(),
            });
          } else if (action === 'review_priority') {
            showBudgetFormModal(budget || { priority: priority || 'harus' }, {
              onSaved: () => window.renderBudgetPageView?.(),
            });
          } else if (budget) {
            showBudgetFormModal(budget, {
              showSummary: true,
              transactions: state?.transactions || [],
              month: state?.budgetDraft?.month,
              onSaved: () => window.renderBudgetPageView?.(),
            });
          }
        }, 400);
      } else if (action === 'ask_monevisor' || action === 'reallocate') {
        if (typeof window.openAdvisorAuto === 'function') {
          window.openAdvisorAuto({
            context: action === 'reallocate' ? 'over_budget' : 'budget',
            focus: 'over',
            prefillMessage: action === 'reallocate'
              ? 'Bantu saya realokasi budget yang over.'
              : 'Ada notifikasi budget — tolong analisa dan kasih langkah konkret.',
          });
        }
      }
    };
  });
}

/**
 * @param {string} type
 * @returns {string}
 */
function getColor(type) {
  const t = window.monefyiNotif?.NOTIF_TYPES;
  if (!t) return '#6b7280';
  for (const key of Object.keys(t)) {
    if (t[key].key === type) return t[key].color;
  }
  return '#6b7280';
}

/**
 * @param {object[]} notifications
 * @returns {Record<string, object[]>}
 */
function groupByDate(notifications) {
  /** @type {Record<string, object[]>} */
  const groups = {};
  for (const n of notifications) {
    const date = n.timestamp.split('T')[0];
    if (!groups[date]) groups[date] = [];
    groups[date].push(n);
  }
  return groups;
}

/**
 * @param {string} dateStr
 * @returns {string}
 */
function formatDateLabel(dateStr) {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (dateStr === today) return 'Hari Ini';
  if (dateStr === yesterday) return 'Kemarin';
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

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
 * Initialize notification UI (mobile + desktop).
 */
export async function initNotificationBell() {
  try {
    await mountNotificationBell();
    await wireDesktopNotificationBell();
  } catch (e) {
    console.warn('[notif-bell] init failed', e);
  }
}

if (typeof window !== 'undefined') {
  window.monefyiNotifBell = {
    renderNotificationBell,
    mountNotificationBell,
    wireDesktopNotificationBell,
    showNotificationPanel,
    initNotificationBell,
  };
}
