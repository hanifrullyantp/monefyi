// =====================================================
// Dashboard Page — Phase 2.4.1
// Migrated from: src/lib/app.ts (renderDashboard)
// =====================================================

import { getState } from "../store.js";
import { formatRupiah } from "../utils.js";
import { renderSparkline } from "../components/sparkline.js";
import { renderProjectCard } from "../components/project-card.js";
import { renderDashboardChart } from "../components/chart.js";

/**
 * Render dashboard page HTML.
 * @returns {string}
 */
export function render() {
  const { data } = getState();
  const biz = data.business;
  const projects = data.projects;
  const activeProjects = projects.filter((p) => p.status !== "archived");

  const totalHutang = biz.hutangList.reduce((s, h) => s + h.amount, 0);
  const totalPiutang = biz.piutangList.reduce((s, p) => s + p.amount, 0);

  return `
  <div class="section">
    <div class="hero-card" onclick="APP.openPopup('kas-bisnis')" style="margin-bottom:20px;">
      <div class="hero-card-label">
        <i data-lucide="building-2"></i>
        ${biz.name}
      </div>
      <div class="hero-card-name" style="font-size:13px;opacity:0.7;">Kas Bisnis Total</div>
      <div class="hero-card-amount large" id="hero-kas">${formatRupiah(biz.totalKas)}</div>
      <span class="hero-card-badge success">
        <i data-lucide="trending-up"></i>
        +18% bulan ini
      </span>
    </div>

    <div class="grid-4 section">
      <div class="stat-card" onclick="APP.openPopup('aktiva')">
        <div class="stat-card-header">
          <div class="stat-card-icon" style="background:var(--purple-light)">
            <i data-lucide="scale" style="color:var(--purple)"></i>
          </div>
          <span class="stat-card-trend up"><i data-lucide="trending-up"></i>12%</span>
        </div>
        <div class="stat-card-label">Total Aktiva</div>
        <div class="stat-card-amount">${formatRupiah(biz.totalAktiva, true)}</div>
        ${renderSparkline([65, 72, 68, 80, 75, 85, 82], "purple")}
      </div>
      <div class="stat-card" onclick="APP.openPopup('pasiva')">
        <div class="stat-card-header">
          <div class="stat-card-icon" style="background:var(--danger-light)">
            <i data-lucide="landmark" style="color:var(--danger)"></i>
          </div>
          <span class="stat-card-trend down"><i data-lucide="trending-down"></i>5%</span>
        </div>
        <div class="stat-card-label">Total Pasiva</div>
        <div class="stat-card-amount">${formatRupiah(biz.totalHutang + biz.ekuitas, true)}</div>
        ${renderSparkline([85, 80, 75, 72, 70, 68, 65], "danger")}
      </div>
      <div class="stat-card" onclick="APP.openPopup('ekuitas')">
        <div class="stat-card-header">
          <div class="stat-card-icon" style="background:var(--primary-light)">
            <i data-lucide="wallet" style="color:var(--primary)"></i>
          </div>
          <span class="stat-card-trend up"><i data-lucide="trending-up"></i>8%</span>
        </div>
        <div class="stat-card-label">Ekuitas</div>
        <div class="stat-card-amount">${formatRupiah(biz.ekuitas, true)}</div>
        ${renderSparkline([62, 65, 68, 72, 70, 75, 78], "primary")}
      </div>
      <div class="stat-card" onclick="APP.openPopup('laba-bisnis')">
        <div class="stat-card-header">
          <div class="stat-card-icon" style="background:var(--success-light)">
            <i data-lucide="trending-up" style="color:var(--success)"></i>
          </div>
          <span class="stat-card-trend up"><i data-lucide="trending-up"></i>22%</span>
        </div>
        <div class="stat-card-label">Laba Ditahan</div>
        <div class="stat-card-amount">${formatRupiah(biz.labaDitahan, true)}</div>
        ${renderSparkline([45, 52, 58, 62, 68, 75, 82], "success")}
      </div>
    </div>

    <div class="section">
      <div class="section-header">
        <div class="section-title">
          <i data-lucide="folder-kanban"></i>
          Proyek Aktif
        </div>
        <button type="button" class="section-action" onclick="APP.navigate('projects')">Lihat Semua</button>
      </div>
      <div class="grid-3">
        ${activeProjects.map((p) => renderProjectCard(p)).join("")}
        <div class="project-card project-card-add" onclick="APP.showToast('Modal tambah project — Phase 2.5','info')">
          <i data-lucide="plus"></i>
          <span>Project Baru</span>
        </div>
      </div>
    </div>

    <div class="section card">
      <div class="card-header">
        <div class="card-title"><i data-lucide="bar-chart-3"></i> Cashflow 6 Bulan</div>
        <span class="badge success"><i data-lucide="trending-up"></i> Positif</span>
      </div>
      <div class="card-body">
        <canvas id="cashflow-chart" height="220" style="width:100%"></canvas>
      </div>
    </div>

    <div class="grid-2 section">
      <div class="stat-card" onclick="APP.openPopup('hutang-bisnis')">
        <div class="stat-card-header">
          <div class="stat-card-icon" style="background:var(--danger-light)">
            <i data-lucide="receipt" style="color:var(--danger)"></i>
          </div>
          <span class="badge danger">Hutang</span>
        </div>
        <div class="stat-card-label">Total Hutang</div>
        <div class="stat-card-amount" style="color:var(--danger)">${formatRupiah(totalHutang, true)}</div>
        <div class="progress-bar-wrap">
          <div class="progress-bar danger" style="width:${((totalHutang / biz.totalAktiva) * 100).toFixed(0)}%"></div>
        </div>
        <div class="progress-label">${biz.hutangList.length} hutang aktif</div>
      </div>
      <div class="stat-card" onclick="APP.openPopup('piutang-bisnis')">
        <div class="stat-card-header">
          <div class="stat-card-icon" style="background:var(--success-light)">
            <i data-lucide="file-check" style="color:var(--success)"></i>
          </div>
          <span class="badge success">Piutang</span>
        </div>
        <div class="stat-card-label">Total Piutang</div>
        <div class="stat-card-amount" style="color:var(--success)">${formatRupiah(totalPiutang, true)}</div>
        <div class="progress-bar-wrap">
          <div class="progress-bar success" style="width:${((totalPiutang / biz.totalAktiva) * 100).toFixed(0)}%"></div>
        </div>
        <div class="progress-label">${biz.piutangList.length} piutang aktif</div>
      </div>
    </div>

    <div class="section">
      <div class="section-title" style="margin-bottom:12px"><i data-lucide="bell"></i> Pusat Notifikasi</div>
      <div class="alert-card danger" onclick="APP.navigate('project/1/keuangan')">
        <i data-lucide="alert-triangle"></i>
        <div class="alert-card-content">
          <div class="alert-card-title">Hutang Jatuh Tempo</div>
          <div class="alert-card-desc">Toko Besi Jaya Rp 1.500.000 — jatuh tempo 20 Jun 2024</div>
        </div>
      </div>
      <div class="alert-card warning" onclick="APP.navigate('project/1/rap')">
        <i data-lucide="alert-octagon"></i>
        <div class="alert-card-content">
          <div class="alert-card-title">Over Budget — Material</div>
          <div class="alert-card-desc">Project Aloevera: Semen melebihi RAP Rp 325.000</div>
        </div>
      </div>
      <div class="alert-card warning" onclick="APP.navigate('project/1/progress')">
        <i data-lucide="clock"></i>
        <div class="alert-card-content">
          <div class="alert-card-title">Keterlambatan Progress</div>
          <div class="alert-card-desc">Project Aloevera: Realisasi 60% dari target 65%</div>
        </div>
      </div>
    </div>

    <div class="section card">
      <div class="card-header">
        <div class="card-title"><i data-lucide="activity"></i> Aktivitas Terkini</div>
        <button type="button" class="section-action">Lihat Semua</button>
      </div>
      <div class="card-body" style="padding:0 20px;">
        <div class="tx-item">
          <div class="tx-icon out"><i data-lucide="arrow-up-circle"></i></div>
          <div class="tx-info">
            <div class="tx-name">Pembelian Bahan — Aloevera</div>
            <div class="tx-date">14 Jun 2024 • 10:30</div>
          </div>
          <div class="tx-amount out">- ${formatRupiah(16500000)}</div>
        </div>
        <div class="tx-item">
          <div class="tx-icon in"><i data-lucide="arrow-down-circle"></i></div>
          <div class="tx-info">
            <div class="tx-name">Termin 1 — Melati</div>
            <div class="tx-date">13 Jun 2024 • 14:00</div>
          </div>
          <div class="tx-amount in">+ ${formatRupiah(25000000)}</div>
        </div>
        <div class="tx-item">
          <div class="tx-icon out"><i data-lucide="arrow-up-circle"></i></div>
          <div class="tx-info">
            <div class="tx-name">Upah Tukang — Anggrek</div>
            <div class="tx-date">12 Jun 2024 • 09:00</div>
          </div>
          <div class="tx-amount out">- ${formatRupiah(9500000)}</div>
        </div>
      </div>
    </div>
  </div>`;
}

/**
 * Post-render hooks — chart + resize listener.
 */
export function afterRender() {
  requestAnimationFrame(() => {
    renderDashboardChart();
  });

  if (!afterRender._resizeBound) {
    afterRender._resizeBound = true;
    window.addEventListener("resize", () => {
      if (getState().currentRoute === "dashboard") {
        renderDashboardChart();
      }
    });
  }
}

afterRender._resizeBound = false;
