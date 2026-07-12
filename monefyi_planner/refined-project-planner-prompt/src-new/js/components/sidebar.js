// =====================================================
// PROJECT PLANNER — Sidebar Navigation
// Migrated from: src/lib/app.ts (renderSidebar)
// Phase 2.3.1
// =====================================================

import { getState, subscribe } from "../store.js";
import { navigate } from "../router.js";

const NAV_ITEMS = [
  { route: "dashboard", icon: "layout-dashboard", label: "Dashboard" },
  { route: "projects", icon: "folder-kanban", label: "Projects" },
  { route: "finance", icon: "landmark", label: "Keuangan Bisnis" },
  { route: "database", icon: "database", label: "Database" },
];

/**
 * Check if nav item should be active.
 * @param {string} route
 * @returns {boolean}
 */
function isNavActive(route) {
  const { currentRoute } = getState();
  return currentRoute === route || (currentRoute === "project-detail" && route === "projects");
}

/**
 * Render sidebar navigation HTML.
 */
export function renderSidebar() {
  const nav = document.getElementById("sidebar-nav");
  if (!nav) return;

  nav.innerHTML = `
    <div class="nav-section-label">Menu</div>
    ${NAV_ITEMS.map(
      (item) => `
      <button type="button" class="nav-item ${isNavActive(item.route) ? "active" : ""}"
              data-route="${item.route}"
              data-nav-route="${item.route}">
        <i data-lucide="${item.icon}"></i>
        <span>${item.label}</span>
      </button>`
    ).join("")}
    <div class="nav-section-label">Tools</div>
    <button type="button" class="nav-item" data-nav-action="analitik">
      <i data-lucide="bar-chart-3"></i>
      <span>Analitik</span>
    </button>
    <button type="button" class="nav-item" data-nav-action="settings">
      <i data-lucide="settings"></i>
      <span>Pengaturan</span>
    </button>
  `;

  if (window.lucide) window.lucide.createIcons({ nodes: [nav] });
}

/**
 * Wire sidebar click handlers.
 */
function setupSidebarEvents() {
  const nav = document.getElementById("sidebar-nav");
  if (!nav) return;

  nav.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;

    const routeBtn = target.closest("[data-nav-route]");
    if (routeBtn instanceof HTMLElement && routeBtn.dataset.navRoute) {
      navigate(routeBtn.dataset.navRoute);
      return;
    }

    const actionBtn = target.closest("[data-nav-action]");
    if (actionBtn instanceof HTMLElement) {
      const action = actionBtn.dataset.navAction;
      if (action === "analitik") {
        window.APP?.showToast?.("Analitik coming soon", "info");
      } else if (action === "settings") {
        window.APP?.showToast?.("Pengaturan coming soon", "info");
      }
    }
  });
}

/**
 * Initialize sidebar — render + subscribe to route changes.
 */
export function initSidebar() {
  renderSidebar();
  setupSidebarEvents();
  subscribe(() => renderSidebar());
}
