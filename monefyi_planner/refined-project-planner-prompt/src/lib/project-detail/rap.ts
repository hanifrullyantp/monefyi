// =====================================================
// Project Detail — Rap Tab (v2)
// =====================================================

import { formatRupiah, projectIdJs } from "../utils";
import { renderItemRow } from "./item-row";
import type { Project } from "./data-adapter";

export function renderTabRap(project: Project): string {
  const materials = project.rap?.materials || [];
  const workers = project.rap?.workers || [];
  const rapPct = ((project.rap?.totalRAP || 0) / project.contractValue * 100).toFixed(0);
  const realisasiPct = ((project.rap?.realisasi || 0) / project.contractValue * 100).toFixed(0);

  return `
  <div style="padding:20px;" class="tab-content">
    <!-- RAP Summary -->
    <div class="grid-4 section" style="gap:12px;">
      <div class="stat-card" onclick="APP.openPopup('kontrak', ${projectIdJs(project.id)})">
        <div class="stat-card-icon" style="background:var(--primary-light);margin-bottom:8px">
          <i data-lucide="file-signature" style="color:var(--primary)"></i>
        </div>
        <div class="stat-card-label">Nilai Kontrak</div>
        <div style="font-size:16px;font-weight:800;color:var(--primary);">${formatRupiah(project.contractValue, true)}</div>
      </div>
      <div class="stat-card" onclick="APP.openPopup('total-rap', ${projectIdJs(project.id)})">
        <div class="stat-card-icon" style="background:var(--gray-100);margin-bottom:8px">
          <i data-lucide="calculator" style="color:var(--gray-500)"></i>
        </div>
        <div class="stat-card-label">Total RAP</div>
        <div style="font-size:16px;font-weight:800;color:var(--gray-800);">${formatRupiah(project.rap?.totalRAP || 0, true)}</div>
      </div>
      <div class="stat-card" onclick="APP.openPopup('realisasi-rap', ${projectIdJs(project.id)})">
        <div class="stat-card-icon" style="background:var(--danger-light);margin-bottom:8px">
          <i data-lucide="wallet" style="color:var(--danger)"></i>
        </div>
        <div class="stat-card-label">Realisasi</div>
        <div style="font-size:16px;font-weight:800;color:var(--danger);">${formatRupiah(project.rap?.realisasi || 0, true)}</div>
      </div>
      <div class="stat-card" onclick="APP.openPopup('laba', ${projectIdJs(project.id)})">
        <div class="stat-card-icon" style="background:var(--success-light);margin-bottom:8px">
          <i data-lucide="trending-up" style="color:var(--success)"></i>
        </div>
        <div class="stat-card-label">Est. Laba</div>
        <div style="font-size:16px;font-weight:800;color:var(--success);">${formatRupiah(project.rap?.estLaba || 0, true)}</div>
      </div>
    </div>

    <!-- Comparison Bar -->
    <div class="card section">
      <div class="card-body">
        <div style="margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:600;margin-bottom:4px;">
            <span style="color:var(--primary)">RAP ${rapPct}%</span>
            <span style="color:var(--danger)">Realisasi ${realisasiPct}%</span>
          </div>
          <div style="position:relative;background:var(--gray-100);border-radius:999px;height:20px;overflow:hidden;">
            <div style="position:absolute;top:0;left:0;height:100%;width:${rapPct}%;background:rgba(37,99,235,0.3);border-radius:999px;border:2px solid var(--primary);"></div>
            <div style="position:absolute;top:0;left:0;height:100%;width:${realisasiPct}%;background:var(--danger);border-radius:999px;"></div>
          </div>
        </div>
        ${parseInt(realisasiPct) > parseInt(rapPct) ? `
          <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--danger-light);border-radius:var(--radius-md);font-size:13px;color:var(--danger-dark);">
            <i data-lucide="alert-triangle" style="width:16px;height:16px;"></i>
            Realisasi melebihi RAP ${(parseInt(realisasiPct) - parseInt(rapPct)).toFixed(0)}%
          </div>
        ` : `
          <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--success-light);border-radius:var(--radius-md);font-size:13px;color:var(--success-dark);">
            <i data-lucide="check-circle-2" style="width:16px;height:16px;"></i>
            Realisasi masih dalam batas RAP
          </div>
        `}
      </div>
    </div>

    <!-- Material Table -->
    <div class="card section">
      <div class="card-header">
        <div class="card-title"><i data-lucide="package"></i> Material</div>
        <div style="display:flex;gap:6px;">
          <div class="search-bar" style="width:160px;">
            <i data-lucide="search"></i>
            <input type="text" placeholder="Cari..." />
          </div>
          <button class="icon-btn" title="Filter"><i data-lucide="filter"></i></button>
        </div>
      </div>
      <div id="rap-materials-list">
        ${materials.map((item, idx) => renderItemRow(item as Record<string, unknown>, idx, project.id)).join("")}
      </div>
      <div style="padding:12px 16px;">
        <button class="btn btn-dashed" onclick="APP.openModal('tambah-item-rap')">
          <i data-lucide="plus"></i>Tambah Item Material
        </button>
      </div>
    </div>

    <!-- Worker Table -->
    <div class="card section">
      <div class="card-header">
        <div class="card-title"><i data-lucide="hard-hat"></i> Tenaga Kerja</div>
      </div>
      <div id="rap-workers-list">
        ${workers.map((item, idx) => renderItemRow(item as Record<string, unknown>, idx + 100, project.id)).join("")}
      </div>
      <div style="padding:12px 16px;">
        <button class="btn btn-dashed" onclick="APP.openModal('tambah-item-rap')">
          <i data-lucide="plus"></i>Tambah Item Tenaga
        </button>
      </div>
    </div>

    <!-- Generate from Template -->
    <div class="card section" style="padding:20px;text-align:center;">
      <i data-lucide="sparkles" style="width:32px;height:32px;color:var(--primary);margin-bottom:12px;"></i>
      <div style="font-size:15px;font-weight:700;margin-bottom:6px;">Generate RAP dari Template</div>
      <div style="font-size:13px;color:var(--gray-400);margin-bottom:16px;">
        Pilih kategori pekerjaan dan volume untuk auto-generate RAP
      </div>
      <button class="btn btn-primary" onclick="APP.openModal('generate-rap')">
        <i data-lucide="sparkles"></i>Generate RAP dari Template
      </button>
    </div>
  </div>

  <div class="bottom-action-bar">
    <button class="btn btn-outline" onclick="APP.openModal('tambah-item-rap')">
      <i data-lucide="package"></i>Material
    </button>
    <button class="btn btn-primary" onclick="APP.openModal('tambah-item-rap')">
      <i data-lucide="hard-hat"></i>Tenaga
    </button>
  </div>
  `;
}
