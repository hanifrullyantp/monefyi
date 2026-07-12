// =====================================================
// PROJECT PLANNER — Project Card Component
// Migrated from: src/lib/app.ts (renderProjectCard)
// =====================================================

import { formatRupiah, formatDate } from "../utils.js";

/**
 * Render a single project card.
 * @param {import('../data/mock-data.js').APP_DATA['projects'][0]} p
 * @returns {string}
 */
export function renderProjectCard(p) {
  const statusColor = p.status === "warning" ? "warning" : "success";
  const statusLabel = p.status === "warning" ? "Perlu Perhatian" : "Aktif";
  const totalRealisasi = (p.budget?.bahan?.actual || 0) + (p.budget?.tukang?.actual || 0);

  return `
  <div class="project-card" onclick="APP.navigate('project/${p.id}')">
    <div class="project-card-header">
      <div>
        <div class="project-card-name">${p.name}</div>
        <div class="project-card-client"><i data-lucide="user-circle"></i>${p.client}</div>
      </div>
      <span class="badge ${statusColor}"><i data-lucide="circle-dot"></i>${statusLabel}</span>
    </div>
    <div class="project-card-meta">
      <div class="meta-row">
        <span class="meta-label"><i data-lucide="wallet"></i>Nilai Kontrak</span>
        <span class="meta-value">${formatRupiah(p.contractValue, true)}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label"><i data-lucide="calendar"></i>Selesai</span>
        <span class="meta-value">${formatDate(p.endDate)}</span>
      </div>
    </div>
    <div>
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;">
        <span style="color:var(--gray-500)">Progress</span>
        <span style="font-weight:700;color:${p.progress.deviation < -3 ? "var(--danger)" : "var(--success)"}">
          ${p.progress.actual}%
        </span>
      </div>
      <div class="progress-bar-wrap">
        <div class="progress-bar ${p.progress.actual >= p.progress.plan ? "success" : "warning"}"
             style="width:${p.progress.actual}%"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--gray-400);margin-top:4px;">
        <span>Realisasi</span>
        <span>${formatRupiah(totalRealisasi, true)} / ${formatRupiah(p.contractValue, true)}</span>
      </div>
    </div>
  </div>`;
}
