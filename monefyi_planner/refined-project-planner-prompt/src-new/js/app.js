/**
 * PROJECT PLANNER — App Entry (src-new sandbox)
 * Wires store, router, and global APP namespace.
 */

import { initRouter } from "./router.js";
import { initStore, syncFromServer, sidebarCollapsed } from "./store.js";
import { initToast, showToast } from "./components/toast.js";
import { initModal } from "./components/modal.js";
import { initCardPopup } from "./components/card-popup.js";
import { initAutosuggest } from "./components/autosuggest.js";
import { initSidebar } from "./components/sidebar.js";
import { initBottomNav } from "./components/bottomnav.js";
import { initTopbar } from "./components/topbar.js";

/**
 * Bootstrap the sandbox application.
 */
export async function initApp() {
  initStore();
  initToast();
  initModal();
  initCardPopup();
  initAutosuggest();
  initSidebar();
  initBottomNav();
  initTopbar();
  initRouter();

  setupSidebarControl();
  setupSyncButton();

  // Optional: merge PostgreSQL data when served via Next.js
  await syncFromServer();

  if (window.lucide) {
    window.lucide.createIcons();
  }

  console.info("[src-new] Visual shell ready — layout + dashboard (2.3 + 2.4.1)");
}

/**
 * Mobile sidebar drawer + desktop collapse toggle.
 */
function setupSidebarControl() {
  const menuBtn = document.getElementById("menu-btn");
  const overlay = document.getElementById("sidebar-overlay");
  const sidebar = document.getElementById("sidebar");

  menuBtn?.addEventListener("click", () => {
    if (window.innerWidth < 1024) {
      sidebar?.classList.add("open");
      overlay?.classList.add("visible");
    } else {
      document.body.classList.toggle("sidebar-collapsed");
      sidebarCollapsed(document.body.classList.contains("sidebar-collapsed"));
    }
  });

  overlay?.addEventListener("click", () => {
    sidebar?.classList.remove("open");
    overlay?.classList.remove("visible");
  });

  if (window.innerWidth >= 1024 && sidebarCollapsed()) {
    document.body.classList.add("sidebar-collapsed");
  }
}

/**
 * Wire sync button to PostgreSQL API.
 */
function setupSyncButton() {
  document.getElementById("sync-btn")?.addEventListener("click", async () => {
    const result = await syncFromServer();
    if (result.success) {
      showToast("Data tersinkronisasi dengan database", "success");
    } else {
      showToast("Gagal sinkronisasi. Menggunakan data lokal.", "warning");
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initApp();
});
