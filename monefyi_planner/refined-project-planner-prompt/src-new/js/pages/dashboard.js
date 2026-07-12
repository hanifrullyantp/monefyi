// =====================================================
// Dashboard Page — Phase 2.4.1 PENDING full migration
// =====================================================

import { getState } from "../store.js";
import { formatRupiah } from "../utils.js";

/**
 * Render dashboard placeholder (full UI in Phase 2.4.1).
 * @returns {string}
 */
export function render() {
  const { data } = getState();
  return `
    <div class="sandbox-placeholder">
      <h2>Dashboard</h2>
      <p>Foundation layer aktif. Halaman penuh dimigrasi di Step 2.4.1.</p>
      <p>Kas Bisnis: <strong>${formatRupiah(data.business.totalKas)}</strong></p>
      <p>Proyek aktif: <strong>${data.projects.length}</strong></p>
      <p style="margin-top:16px;font-size:13px;">
        Route: <code>#dashboard</code> ·
        <a href="#projects" style="color:var(--primary)">Projects</a> ·
        <a href="#finance" style="color:var(--primary)">Finance</a> ·
        <a href="#database" style="color:var(--primary)">Database</a> ·
        <a href="#project/1/overview" style="color:var(--primary)">Project 1</a>
      </p>
    </div>
  `;
}
