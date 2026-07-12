// =====================================================
// PROJECT PLANNER — Hash Router
// Phase 2.2.1
// Routes: #dashboard | #projects | #project/:id/:tab? | #finance/:tab? | #database/:tab?
// =====================================================

import { getState, setState, subscribe } from "./store.js";

/** @type {Record<string, () => Promise<{ render: () => string }>>>} */
const routeHandlers = {
  dashboard: () => import("./pages/dashboard.js"),
  projects: () => import("./pages/projects.js"),
  "project-detail": () => import("./pages/project-detail.js"),
  finance: () => import("./pages/finance.js"),
  database: () => import("./pages/database.js"),
};

/**
 * Parse location hash into route state.
 * @returns {{ route: string; projectId: number | null; tab: string | null }}
 */
export function parseHash() {
  const raw = (location.hash.slice(1) || "dashboard").split("?");
  const parts = raw[0].split("/").filter(Boolean);

  if (parts[0] === "project" && parts[1]) {
    return {
      route: "project-detail",
      projectId: parseInt(parts[1], 10),
      tab: parts[2] || "overview",
    };
  }
  if (parts[0] === "finance") {
    return { route: "finance", projectId: null, tab: parts[1] || "overview" };
  }
  if (parts[0] === "database") {
    return { route: "database", projectId: null, tab: parts[1] || "bahan" };
  }

  const route = parts[0] || "dashboard";
  return { route, projectId: null, tab: null };
}

/**
 * Build hash string from route parts.
 * @param {string} route
 * @param {{ projectId?: number; tab?: string }} [params]
 * @returns {string}
 */
export function buildHash(route, params = {}) {
  if (route.startsWith("project/")) {
    const [, id, tab] = route.split("/");
    return tab ? `project/${id}/${tab}` : `project/${id}`;
  }
  if (params.tab && (route === "finance" || route === "database")) {
    return `${route}/${params.tab}`;
  }
  return route;
}

/**
 * Navigate to a route (updates hash).
 * @param {string} route
 * @param {{ tab?: string }} [params]
 */
export function navigate(route, params = {}) {
  if (route.startsWith("project/")) {
    const segments = route.split("/");
    const id = segments[1];
    const tab = params.tab || segments[2] || "overview";
    location.hash = `project/${id}/${tab}`;
    return;
  }
  location.hash = buildHash(route, params);
}

/**
 * Render current route into #page-view.
 */
async function renderCurrentRoute() {
  const view = document.getElementById("page-view");
  if (!view) return;

  const parsed = parseHash();
  const partial = { currentRoute: parsed.route };

  if (parsed.route === "project-detail") {
    partial.currentProjectId = parsed.projectId;
    partial.currentProjectTab = parsed.tab || "overview";
  }
  if (parsed.route === "finance") {
    partial.currentFinanceTab = parsed.tab || "overview";
  }
  if (parsed.route === "database") {
    partial.currentDatabaseTab = parsed.tab || "bahan";
  }

  setState(partial);

  const handler = routeHandlers[parsed.route] || routeHandlers.dashboard;
  const mod = await handler();
  view.innerHTML = mod.render();
  view.className = "tab-content anim-fade-in-up";

  updateBreadcrumb();
  updateNavActive();
  refreshIcons();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/**
 * Update breadcrumb in topbar.
 */
function updateBreadcrumb() {
  const bc = document.getElementById("topbar-breadcrumb");
  if (!bc) return;

  const state = getState();
  const names = {
    dashboard: "Dashboard",
    projects: "Semua Proyek",
    finance: "Keuangan Bisnis",
    database: "Database Master",
    "project-detail": "Detail Project",
  };

  if (state.currentRoute === "project-detail" && state.currentProjectId) {
    const proj = state.data.projects.find((p) => p.id === state.currentProjectId);
    bc.innerHTML = `<span>Proyek</span><span class="breadcrumb-sep"><i data-lucide="chevron-right"></i></span><span class="breadcrumb-current">${proj?.name || "Detail"}</span>`;
  } else {
    bc.innerHTML = `<span class="breadcrumb-current">${names[state.currentRoute] || "Halaman"}</span>`;
  }
}

/**
 * Update sidebar + bottom nav active states.
 */
function updateNavActive() {
  const state = getState();
  document.querySelectorAll(".nav-item, .bottom-nav-item").forEach((el) => {
    el.classList.remove("active");
    const navRoute = el.getAttribute("data-route");
    const isActive =
      navRoute === state.currentRoute ||
      (state.currentRoute === "project-detail" && navRoute === "projects");
    if (isActive) el.classList.add("active");
  });
}

/**
 * Re-init Lucide icons after DOM update.
 */
function refreshIcons() {
  if (window.lucide) window.lucide.createIcons();
}

/**
 * Initialize hash router and subscribe to hash changes.
 */
export function initRouter() {
  window.addEventListener("hashchange", () => renderCurrentRoute());
  subscribe(() => updateNavActive());

  if (!location.hash) {
    location.hash = "dashboard";
  } else {
    renderCurrentRoute();
  }

  window.APP = window.APP || {};
  window.APP.navigate = navigate;
}
