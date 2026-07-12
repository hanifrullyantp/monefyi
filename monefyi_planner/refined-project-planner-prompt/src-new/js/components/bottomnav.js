// =====================================================
// PROJECT PLANNER — Bottom Navigation (Mobile)
// Migrated from: src/lib/app.ts (renderBottomNav)
// Phase 2.3.3
// =====================================================

import { getState, subscribe } from "../store.js";
import { navigate } from "../router.js";

const NAV_ITEMS = [
  { route: "dashboard", icon: "home", label: "Home" },
  { route: "projects", icon: "folder-kanban", label: "Project" },
  { route: "finance", icon: "landmark", label: "Keuangan" },
  { route: "database", icon: "database", label: "Data" },
  { route: "profile", icon: "user-circle", label: "Profile" },
];

/**
 * @param {string} route
 * @returns {boolean}
 */
function isNavActive(route) {
  const { currentRoute } = getState();
  return currentRoute === route || (currentRoute === "project-detail" && route === "projects");
}

/**
 * Render bottom navigation.
 */
export function renderBottomNav() {
  const nav = document.getElementById("bottom-nav-inner");
  if (!nav) return;

  nav.innerHTML = NAV_ITEMS.map(
    (item) => `
    <button type="button" class="bottom-nav-item ${isNavActive(item.route) ? "active" : ""}"
            data-route="${item.route}"
            data-bottom-route="${item.route}">
      <i data-lucide="${item.icon}"></i>
      <span>${item.label}</span>
    </button>`
  ).join("");

  if (window.lucide) window.lucide.createIcons({ nodes: [nav] });
}

/**
 * Wire bottom nav clicks.
 */
function setupBottomNavEvents() {
  const nav = document.getElementById("bottom-nav-inner");
  if (!nav) return;

  nav.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;

    const btn = target.closest("[data-bottom-route]");
    if (!(btn instanceof HTMLElement)) return;

    const route = btn.dataset.bottomRoute;
    if (route === "profile") {
      window.APP?.showToast?.("Profile coming soon", "info");
      return;
    }
    if (route) navigate(route);
  });
}

/**
 * Initialize bottom navigation.
 */
export function initBottomNav() {
  renderBottomNav();
  setupBottomNavEvents();
  subscribe(() => renderBottomNav());
}
