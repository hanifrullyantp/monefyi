// =====================================================
// PROJECT PLANNER — Topbar + Right Panel
// Phase 2.3.2
// =====================================================

const QUICK_ACTIONS = [
  { icon: "plus", label: "Transaksi", color: "var(--primary)", bg: "var(--primary-light)", action: "transaksi" },
  { icon: "folder-plus", label: "Project", color: "var(--purple)", bg: "var(--purple-light)", action: "project" },
  { icon: "receipt", label: "RAP Item", color: "var(--warning-dark)", bg: "var(--warning-light)", action: "rap" },
  { icon: "database", label: "Master", color: "var(--success)", bg: "var(--success-light)", action: "master" },
];

const NOTIFICATIONS = [
  { title: "Hutang Jatuh Tempo", desc: "Toko Besi Jaya — Rp 1.5jt", type: "danger" },
  { title: "Over Budget Material", desc: "Project Aloevera — Semen", type: "warning" },
];

const ACTIVITIES = [
  { text: "Pembelian Bahan — Aloevera", time: "14 Jun • 10:30" },
  { text: "Termin 1 — Melati", time: "13 Jun • 14:00" },
];

/**
 * Render right panel quick actions, notifications, activity.
 */
export function renderRightPanel() {
  const actionsEl = document.getElementById("quick-actions-grid");
  const notifEl = document.getElementById("right-panel-notif-list");
  const activityEl = document.getElementById("right-panel-activity-list");

  if (actionsEl) {
    actionsEl.innerHTML = QUICK_ACTIONS.map(
      (a) => `
      <button type="button" class="quick-action-card" data-quick-action="${a.action}">
        <div class="quick-action-icon" style="background:${a.bg};">
          <i data-lucide="${a.icon}" style="color:${a.color};width:18px;height:18px;"></i>
        </div>
        <span>${a.label}</span>
      </button>`
    ).join("");
  }

  if (notifEl) {
    notifEl.innerHTML = NOTIFICATIONS.map(
      (n) => `
      <div class="alert-card ${n.type}" style="margin-bottom:8px;font-size:12px;">
        <i data-lucide="${n.type === "danger" ? "alert-triangle" : "alert-octagon"}"></i>
        <div class="alert-card-content">
          <div class="alert-card-title">${n.title}</div>
          <div class="alert-card-desc">${n.desc}</div>
        </div>
      </div>`
    ).join("");
  }

  if (activityEl) {
    activityEl.innerHTML = ACTIVITIES.map(
      (a) => `
      <div style="padding:8px 0;border-bottom:1px solid var(--gray-100);font-size:12px;">
        <div style="font-weight:600;color:var(--gray-700);">${a.text}</div>
        <div style="color:var(--gray-400);margin-top:2px;">${a.time}</div>
      </div>`
    ).join("");
  }

  const panel = document.getElementById("right-panel");
  if (panel && window.lucide) {
    window.lucide.createIcons({ nodes: [panel] });
  }
}

/**
 * Wire quick action clicks and keyboard shortcuts.
 */
function setupTopbarEvents() {
  document.getElementById("quick-actions-grid")?.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    const btn = target.closest("[data-quick-action]");
    if (!(btn instanceof HTMLElement)) return;
    window.APP?.showToast?.(`Aksi "${btn.dataset.quickAction}" — Phase 2.5`, "info");
  });

  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      document.getElementById("global-search")?.focus();
    }
  });
}

/**
 * Initialize topbar right panel.
 */
export function initTopbar() {
  renderRightPanel();
  setupTopbarEvents();
}
