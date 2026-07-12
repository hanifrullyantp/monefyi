// =====================================================
// Project Detail — Overview Tab (v2)
// =====================================================

import { formatRupiah, formatDate, projectIdJs } from "../utils";
import { renderItemRow } from "./item-row";
import { normalizeProject, type Project } from "./data-adapter";

/**
 * Render Overview tab for project detail.
 * @param project
 */
export function renderTabOverview(project: Project): string {
  const view = normalizeProject(project);
  const p = view.project;
  const realisasiWidth = Math.min(
    (view.totalRealisasi / p.contractValue) * 100,
    100
  ).toFixed(0);

  return `
  <div style="padding:20px;" class="tab-content">
    <div class="project-overview-hero">
      <div class="overview-hero-top">
        <div>
          <div class="overview-hero-name">${p.name}</div>
          <div class="overview-hero-date">
            <i data-lucide="calendar"></i>
            ${formatDate(p.startDate)} - ${formatDate(p.endDate)} (${p.duration} hari)
          </div>
        </div>
        <div class="saldo-badge" onclick="APP.switchProjectTab('keuangan')" title="Lihat sumber dana ->">
          <i data-lucide="wallet"></i>
          Saldo: ${formatRupiah(p.saldo, true)}
        </div>
      </div>
      <div class="overview-hero-amount">${formatRupiah(p.contractValue)}</div>
      <div class="progress-bar-lg">
        <div class="progress-bar danger" id="overview-realisasi-bar" style="width:${realisasiWidth}%;min-width:120px;">
          ${formatRupiah(view.totalRealisasi, true)}
        </div>
      </div>
      <div style="text-align:center;font-size:13px;color:var(--gray-500);margin-top:6px;">
        Sisa: ${formatRupiah(view.sisaKontrak, true)}
      </div>
    </div>

    <div class="grid-3 section">
      <div class="stat-card" onclick="APP.openPopup('bahan', ${projectIdJs(p.id)})">
        <div class="stat-card-header">
          <div class="stat-card-icon" style="background:var(--danger-light)">
            <i data-lucide="package" style="color:var(--danger)"></i>
          </div>
          <span class="stat-card-label">Bahan</span>
        </div>
        <div style="font-size:15px;font-weight:700;margin-bottom:8px">${formatRupiah(p.budget?.bahan?.plan || 0)}</div>
        <div class="progress-bar-lg" style="height:22px;">
          <div class="progress-bar danger" style="width:${(((p.budget?.bahan?.actual || 0) / (p.budget?.bahan?.plan || 1)) * 100).toFixed(0)}%;min-width:80px;font-size:11px;">
            ${formatRupiah(p.budget?.bahan?.actual || 0, true)}
          </div>
        </div>
        <div class="progress-label">Sisa: ${formatRupiah((p.budget?.bahan?.plan || 0) - (p.budget?.bahan?.actual || 0), true)}</div>
      </div>

      <div class="stat-card" onclick="APP.openPopup('tukang', ${projectIdJs(p.id)})">
        <div class="stat-card-header">
          <div class="stat-card-icon" style="background:var(--success-light)">
            <i data-lucide="hard-hat" style="color:var(--success)"></i>
          </div>
          <span class="stat-card-label">Tukang</span>
        </div>
        <div style="font-size:15px;font-weight:700;margin-bottom:8px">${formatRupiah(p.budget?.tukang?.plan || 0)}</div>
        <div class="progress-bar-lg" style="height:22px;">
          <div class="progress-bar success" style="width:${(((p.budget?.tukang?.actual || 0) / (p.budget?.tukang?.plan || 1)) * 100).toFixed(0)}%;min-width:80px;font-size:11px;">
            ${formatRupiah(p.budget?.tukang?.actual || 0, true)}
          </div>
        </div>
        <div class="progress-label">Sisa: ${formatRupiah((p.budget?.tukang?.plan || 0) - (p.budget?.tukang?.actual || 0), true)}</div>
      </div>

      <div class="stat-card" onclick="APP.openPopup('piutang', ${projectIdJs(p.id)})">
        <div class="stat-card-header">
          <div class="stat-card-icon" style="background:var(--primary-light)">
            <i data-lucide="file-check" style="color:var(--primary)"></i>
          </div>
          <span class="stat-card-label">Piutang</span>
        </div>
        <div style="font-size:22px;font-weight:800;margin-bottom:8px">${formatRupiah(p.budget?.piutang || 0, true)}</div>
        <span class="badge danger"><i data-lucide="clock"></i>Belum Ditagih</span>
      </div>
    </div>

    <div class="section card">
      <div class="card-header">
        <div class="card-title">
          <i data-lucide="list-checks"></i>
          Item Pekerjaan
          <span class="badge gray">${view.checkedCount}/${view.totalWorkItems} terealisasi</span>
        </div>
        <div style="display:flex;gap:6px;">
          <button class="icon-btn" title="Filter"><i data-lucide="filter"></i></button>
          <button class="icon-btn" title="Sort"><i data-lucide="arrow-up-down"></i></button>
        </div>
      </div>
      <div id="item-pekerjaan-list">
        ${view.workItems.map((row) => renderItemRow(row.item, row.idx, p.id)).join("")}
      </div>
      <div style="padding:12px 16px;">
        <button class="btn btn-dashed" onclick="APP.openModal('tambah-item-rap')">
          <i data-lucide="plus"></i>Tambah Item
        </button>
      </div>
    </div>

    <div class="section card">
      <div class="card-header">
        <div class="card-title"><i data-lucide="clock"></i> Riwayat Transaksi</div>
        <button class="section-action" onclick="APP.switchProjectTab('keuangan')">Lihat Semua</button>
      </div>
      <div style="padding:0 20px;">
        ${p.expenses
          .map(
            (tx) => `
          <div class="tx-item">
            <div class="tx-icon ${tx.type}"><i data-lucide="${tx.icon}"></i></div>
            <div class="tx-info">
              <div class="tx-name">${tx.name}</div>
              <div class="tx-date">${formatDate(tx.date)} • ${tx.time}</div>
            </div>
            <div class="tx-amount ${tx.type}">
              ${tx.type === "out" ? "-" : "+"} ${formatRupiah(tx.amount)}
            </div>
            <i data-lucide="chevron-right" style="color:var(--gray-300);width:16px;height:16px;"></i>
          </div>`
          )
          .join("")}
      </div>
    </div>
  </div>

  <div class="bottom-action-bar">
    <button class="btn btn-outline" onclick="APP.openModal('edit-project')">
      <i data-lucide="pencil"></i>Edit Project
    </button>
    <button class="btn btn-primary" onclick="APP.openModal('tambah-transaksi')">
      <i data-lucide="plus"></i>Tambah Transaksi
    </button>
  </div>`;
}
