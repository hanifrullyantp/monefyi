// =====================================================
// PROJECT PLANNER — Main App Module
// =====================================================

import { APP_DATA } from "./mock-data";
import { formatRupiah, formatDate, fuzzyMatch, debounce, countUp, animateProgress } from "./utils";

// ===== GLOBAL STATE =====
interface AppState {
  currentRoute: string;
  currentProjectId: number | null;
  currentProjectTab: string;
  currentFinanceTab: string;
  currentDatabaseTab: string;
  pendingChanges: number;
  undoStack: unknown[];
  redoStack: unknown[];
  data: typeof APP_DATA;
}

const state: AppState = {
  currentRoute: "dashboard",
  currentProjectId: null,
  currentProjectTab: "overview",
  currentFinanceTab: "overview",
  currentDatabaseTab: "bahan",
  pendingChanges: 0,
  undoStack: [],
  redoStack: [],
  data: JSON.parse(JSON.stringify(APP_DATA)), // deep copy
};

// ===== ROUTER =====
function navigate(route: string, params?: Record<string, string>): void {
  if (route.startsWith("project/")) {
    const id = parseInt(route.split("/")[1]);
    state.currentProjectId = id;
    state.currentProjectTab = params?.tab || "overview";
    state.currentRoute = "project-detail";
  } else {
    state.currentRoute = route;
  }
  renderCurrentPage();
  updateNav();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateNav(): void {
  // Update sidebar active state
  document.querySelectorAll(".nav-item").forEach((el) => {
    el.classList.remove("active");
    const navRoute = el.getAttribute("data-route");
    if (navRoute === state.currentRoute || 
        (state.currentRoute === "project-detail" && navRoute === "projects")) {
      el.classList.add("active");
    }
  });

  // Update bottom nav active state
  document.querySelectorAll(".bottom-nav-item").forEach((el) => {
    el.classList.remove("active");
    const navRoute = el.getAttribute("data-route");
    if (navRoute === state.currentRoute || 
        (state.currentRoute === "project-detail" && navRoute === "projects")) {
      el.classList.add("active");
    }
  });

  // Update breadcrumb
  updateBreadcrumb();

  // Re-init icons after update
  if (typeof window !== "undefined" && (window as any).lucide) {
    (window as any).lucide.createIcons();
  }
}

function updateBreadcrumb(): void {
  const bc = document.getElementById("topbar-breadcrumb");
  if (!bc) return;
  
  const routeNames: Record<string, string> = {
    dashboard: "Dashboard",
    projects: "Semua Proyek",
    finance: "Keuangan Bisnis",
    database: "Database Master",
    "project-detail": "Detail Project",
  };

  let html = "";
  if (state.currentRoute === "project-detail" && state.currentProjectId) {
    const proj = state.data.projects.find((p) => p.id === state.currentProjectId);
    html = `<span>Proyek</span><span class="breadcrumb-sep"><i data-lucide="chevron-right"></i></span><span class="breadcrumb-current">${proj?.name || "Detail"}</span>`;
  } else {
    html = `<span class="breadcrumb-current">${routeNames[state.currentRoute] || "Halaman"}</span>`;
  }
  bc.innerHTML = html;
}

// ===== RENDER CURRENT PAGE =====
function renderCurrentPage(): void {
  const view = document.getElementById("page-view");
  if (!view) return;

  view.innerHTML = "";
  view.className = "tab-content";

  switch (state.currentRoute) {
    case "dashboard":
      view.innerHTML = renderDashboard();
      break;
    case "projects":
      view.innerHTML = renderProjects();
      break;
    case "project-detail":
      view.innerHTML = renderProjectDetail();
      break;
    case "finance":
      view.innerHTML = renderFinance();
      break;
    case "database":
      view.innerHTML = renderDatabase();
      break;
    default:
      view.innerHTML = renderDashboard();
  }

  // After rendering, setup interactions
  setTimeout(() => {
    setupPageInteractions();
    initLucideIcons();
    initAnimations();
    if (state.currentRoute === "project-detail") {
      renderProjectCharts();
    }
    if (state.currentRoute === "dashboard") {
      renderDashboardChart();
    }
  }, 50);
}

function initLucideIcons(): void {
  if (typeof window !== "undefined" && (window as any).lucide) {
    (window as any).lucide.createIcons();
  }
}

// ===== DASHBOARD =====
function renderDashboard(): string {
  const biz = state.data.business;
  const projects = state.data.projects;
  const activeProjects = projects.filter((p) => p.status !== "archived");

  const totalHutang = biz.hutangList.reduce((s, h) => s + h.amount, 0);
  const totalPiutang = biz.piutangList.reduce((s, p) => s + p.amount, 0);

  return `
  <div class="section">
    <!-- Hero Card -->
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

    <!-- Financial Summary 4 cards -->
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
        ${renderSparkline([65,72,68,80,75,85,82], "purple")}
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
        ${renderSparkline([85,80,75,72,70,68,65], "danger")}
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
        ${renderSparkline([62,65,68,72,70,75,78], "primary")}
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
        ${renderSparkline([45,52,58,62,68,75,82], "success")}
      </div>
    </div>

    <!-- Active Projects -->
    <div class="section">
      <div class="section-header">
        <div class="section-title">
          <i data-lucide="folder-kanban"></i>
          Proyek Aktif
        </div>
        <button class="section-action" onclick="APP.navigate('projects')">Lihat Semua</button>
      </div>
      <div class="grid-3">
        ${activeProjects.map(p => renderProjectCard(p)).join("")}
        <div class="project-card project-card-add" onclick="APP.openModal('tambah-project')">
          <i data-lucide="plus"></i>
          <span>Project Baru</span>
        </div>
      </div>
    </div>

    <!-- Cashflow Chart -->
    <div class="section card">
      <div class="card-header">
        <div class="card-title"><i data-lucide="bar-chart-3"></i> Cashflow 6 Bulan</div>
        <span class="badge success"><i data-lucide="trending-up"></i> Positif</span>
      </div>
      <div class="card-body">
        <canvas id="cashflow-chart" height="220" style="width:100%"></canvas>
      </div>
    </div>

    <!-- Hutang Piutang -->
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
          <div class="progress-bar danger" style="width:${(totalHutang/biz.totalAktiva*100).toFixed(0)}%"></div>
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
          <div class="progress-bar success" style="width:${(totalPiutang/biz.totalAktiva*100).toFixed(0)}%"></div>
        </div>
        <div class="progress-label">${biz.piutangList.length} piutang aktif</div>
      </div>
    </div>

    <!-- Alert Center -->
    <div class="section">
      <div class="section-title" style="margin-bottom:12px"><i data-lucide="bell"></i> Pusat Notifikasi</div>
      <div class="alert-card danger" onclick="APP.navigate('project/1', {tab:'keuangan'})">
        <i data-lucide="alert-triangle"></i>
        <div class="alert-card-content">
          <div class="alert-card-title">Hutang Jatuh Tempo</div>
          <div class="alert-card-desc">Toko Besi Jaya Rp 1.500.000 — jatuh tempo 20 Jun 2024</div>
        </div>
      </div>
      <div class="alert-card warning" onclick="APP.navigate('project/1', {tab:'rap'})">
        <i data-lucide="alert-octagon"></i>
        <div class="alert-card-content">
          <div class="alert-card-title">Over Budget — Material</div>
          <div class="alert-card-desc">Project Aloevera: Semen melebihi RAP Rp 325.000</div>
        </div>
      </div>
      <div class="alert-card warning" onclick="APP.navigate('project/1', {tab:'progress'})">
        <i data-lucide="clock"></i>
        <div class="alert-card-content">
          <div class="alert-card-title">Keterlambatan Progress</div>
          <div class="alert-card-desc">Project Aloevera: Realisasi 60% dari target 65%</div>
        </div>
      </div>
    </div>

    <!-- Recent Activities -->
    <div class="section card">
      <div class="card-header">
        <div class="card-title"><i data-lucide="activity"></i> Aktivitas Terkini</div>
        <button class="section-action">Lihat Semua</button>
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
  </div>
  `;
}

function renderProjectCard(p: typeof APP_DATA.projects[0]): string {
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
        <span style="font-weight:700;color:${p.progress.deviation < -3 ? 'var(--danger)' : 'var(--success)'}">
          ${p.progress.actual}%
        </span>
      </div>
      <div class="progress-bar-wrap">
        <div class="progress-bar ${p.progress.actual >= p.progress.plan ? 'success' : 'warning'}" 
             style="width:${p.progress.actual}%"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--gray-400);margin-top:4px;">
        <span>Realisasi</span>
        <span>${formatRupiah(totalRealisasi, true)} / ${formatRupiah(p.contractValue, true)}</span>
      </div>
    </div>
  </div>
  `;
}

// ===== PROJECTS LIST =====
function renderProjects(): string {
  const projects = state.data.projects;
  return `
  <div class="page-header">
    <div>
      <div class="page-title">Semua Proyek</div>
      <div class="page-subtitle">${projects.length} project total</div>
    </div>
    <div class="page-actions">
      <div class="search-bar" style="width:200px;">
        <i data-lucide="search"></i>
        <input type="text" placeholder="Cari proyek..." id="project-search" oninput="APP.filterProjects(this.value)" />
      </div>
      <div class="view-toggle">
        <button class="view-toggle-btn active" id="grid-view-btn" onclick="APP.setProjectView('grid')" title="Grid view">
          <i data-lucide="grid-3x3"></i>
        </button>
        <button class="view-toggle-btn" id="list-view-btn" onclick="APP.setProjectView('list')" title="List view">
          <i data-lucide="list"></i>
        </button>
      </div>
      <button class="btn btn-primary" onclick="APP.openModal('tambah-project')">
        <i data-lucide="plus"></i>
        New Project
      </button>
    </div>
  </div>

  <div id="projects-grid" class="grid-3">
    ${projects.map(p => renderProjectCard(p)).join("")}
    <div class="project-card project-card-add" onclick="APP.openModal('tambah-project')">
      <i data-lucide="plus"></i>
      <span>Project Baru</span>
    </div>
  </div>

  <div style="margin-top:20px;padding:16px;background:white;border-radius:var(--radius-lg);border:1px solid var(--gray-100);display:flex;gap:24px;flex-wrap:wrap;">
    <div style="font-size:13px;color:var(--gray-500);">Total: <strong style="color:var(--gray-800)">${projects.length} project</strong></div>
    <div style="font-size:13px;color:var(--gray-500);">Aktif: <strong style="color:var(--success)">${projects.filter(p=>p.status!=='archived').length}</strong></div>
    <div style="font-size:13px;color:var(--gray-500);">Nilai Total: <strong style="color:var(--gray-800)">${formatRupiah(projects.reduce((s,p)=>s+p.contractValue,0), true)}</strong></div>
    <div style="font-size:13px;color:var(--gray-500);">Est. Laba: <strong style="color:var(--success)">${formatRupiah(projects.reduce((s,p)=>s+(p.rap?.estLaba||0),0), true)}</strong></div>
  </div>
  `;
}

// ===== PROJECT DETAIL =====
function renderProjectDetail(): string {
  const project = state.data.projects.find((p) => p.id === state.currentProjectId);
  if (!project) return `<div class="page-header"><div class="page-title">Project tidak ditemukan</div></div>`;

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "keuangan", label: "Keuangan", badge: project.hutangPiutang.length || 0 },
    { id: "progress", label: "Progress" },
    { id: "rap", label: "RAP" },
    { id: "analisa", label: "Analisa" },
    { id: "laporan", label: "Laporan" },
  ];

  return `
  <div class="project-detail-header">
    <button class="back-btn" onclick="APP.navigate('projects')">
      <i data-lucide="arrow-left"></i>
    </button>
    <div style="flex:1">
      <div style="font-size:20px;font-weight:800;color:var(--gray-900);">${project.name}</div>
      <div style="font-size:12px;color:var(--gray-400);display:flex;align-items:center;gap:4px;">
        <i data-lucide="user-circle"></i>${project.client} &bull; ${project.type}
      </div>
    </div>
    <button class="icon-btn" onclick="APP.openItemMenu('project-options', this)">
      <i data-lucide="more-vertical"></i>
    </button>
  </div>

  <div class="card" style="margin-bottom:20px;">
    <div class="tab-nav" id="project-tab-nav">
      ${tabs.map(t => `
        <button class="tab-btn ${state.currentProjectTab === t.id ? "active" : ""}"
                onclick="APP.switchProjectTab('${t.id}')"
                data-tab="${t.id}">
          ${t.label}
          ${t.badge ? `<span class="tab-badge">${t.badge}</span>` : ""}
        </button>
      `).join("")}
    </div>
    <div id="project-tab-content">
      ${renderProjectTabContent(project)}
    </div>
  </div>
  `;
}

function renderProjectTabContent(project: typeof APP_DATA.projects[0]): string {
  switch (state.currentProjectTab) {
    case "overview": return renderTabOverview(project);
    case "keuangan": return renderTabKeuangan(project);
    case "progress": return renderTabProgress(project);
    case "rap": return renderTabRap(project);
    case "analisa": return renderTabAnalisa(project);
    case "laporan": return renderTabLaporan(project);
    default: return renderTabOverview(project);
  }
}

// ===== TAB: OVERVIEW =====
function renderTabOverview(p: typeof APP_DATA.projects[0]): string {
  const totalRealisasi = (p.budget?.bahan?.actual || 0) + (p.budget?.tukang?.actual || 0);
  const realisasiPct = (totalRealisasi / p.contractValue * 100).toFixed(1);
  const materials = p.rap?.materials || [];
  const workers = p.rap?.workers || [];
  const checkedItems = [...materials, ...workers].filter(i => i.checked).length;
  const totalItems = materials.length + workers.length;

  return `
  <div style="padding:20px;" class="tab-content">
    <!-- Hero -->
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
        <div class="progress-bar danger" id="overview-realisasi-bar" style="width:0%;min-width:120px;">
          ${formatRupiah(totalRealisasi, true)}
        </div>
      </div>
      <div style="text-align:center;font-size:13px;color:var(--gray-500);margin-top:6px;">
        Sisa: ${formatRupiah(p.contractValue - totalRealisasi, true)}
      </div>
    </div>

    <!-- Stat Cards -->
    <div class="grid-3 section">
      <div class="stat-card" onclick="APP.openPopup('bahan', ${p.id})">
        <div class="stat-card-header">
          <div class="stat-card-icon" style="background:var(--danger-light)">
            <i data-lucide="package" style="color:var(--danger)"></i>
          </div>
          <span class="stat-card-label">Bahan</span>
        </div>
        <div style="font-size:15px;font-weight:700;margin-bottom:8px">${formatRupiah(p.budget?.bahan?.plan || 0)}</div>
        <div class="progress-bar-lg" style="height:22px;">
          <div class="progress-bar danger" style="width:${((p.budget?.bahan?.actual||0)/(p.budget?.bahan?.plan||1)*100).toFixed(0)}%;min-width:80px;font-size:11px;">
            ${formatRupiah(p.budget?.bahan?.actual || 0, true)}
          </div>
        </div>
        <div class="progress-label">Sisa: ${formatRupiah((p.budget?.bahan?.plan||0) - (p.budget?.bahan?.actual||0), true)}</div>
      </div>

      <div class="stat-card" onclick="APP.openPopup('tukang', ${p.id})">
        <div class="stat-card-header">
          <div class="stat-card-icon" style="background:var(--success-light)">
            <i data-lucide="hard-hat" style="color:var(--success)"></i>
          </div>
          <span class="stat-card-label">Tukang</span>
        </div>
        <div style="font-size:15px;font-weight:700;margin-bottom:8px">${formatRupiah(p.budget?.tukang?.plan || 0)}</div>
        <div class="progress-bar-lg" style="height:22px;">
          <div class="progress-bar success" style="width:${((p.budget?.tukang?.actual||0)/(p.budget?.tukang?.plan||1)*100).toFixed(0)}%;min-width:80px;font-size:11px;">
            ${formatRupiah(p.budget?.tukang?.actual || 0, true)}
          </div>
        </div>
        <div class="progress-label">Sisa: ${formatRupiah((p.budget?.tukang?.plan||0) - (p.budget?.tukang?.actual||0), true)}</div>
      </div>

      <div class="stat-card" onclick="APP.openPopup('piutang', ${p.id})">
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

    <!-- Item Pekerjaan -->
    <div class="section card">
      <div class="card-header">
        <div class="card-title">
          <i data-lucide="list-checks"></i>
          Item Pekerjaan
          <span class="badge gray">${checkedItems}/${totalItems} terealisasi</span>
        </div>
        <div style="display:flex;gap:6px;">
          <button class="icon-btn" title="Filter"><i data-lucide="filter"></i></button>
          <button class="icon-btn" title="Sort"><i data-lucide="arrow-up-down"></i></button>
        </div>
      </div>
      <div id="item-pekerjaan-list">
        ${[...materials, ...workers].map((item, idx) => renderItemRow(item, idx, p.id)).join("")}
      </div>
      <div style="padding:12px 16px;">
        <button class="btn btn-dashed" onclick="APP.openModal('tambah-item-rap')">
          <i data-lucide="plus"></i>Tambah Item
        </button>
      </div>
    </div>

    <!-- Riwayat Transaksi -->
    <div class="section card">
      <div class="card-header">
        <div class="card-title"><i data-lucide="clock"></i> Riwayat Transaksi</div>
        <button class="section-action" onclick="APP.switchProjectTab('keuangan')">Lihat Semua</button>
      </div>
      <div style="padding:0 20px;">
        ${p.expenses.map(tx => `
          <div class="tx-item">
            <div class="tx-icon ${tx.type}"><i data-lucide="${tx.icon}"></i></div>
            <div class="tx-info">
              <div class="tx-name">${tx.name}</div>
              <div class="tx-date">${formatDate(tx.date)} • ${tx.time}</div>
            </div>
            <div class="tx-amount ${tx.type}">
              ${tx.type === 'out' ? '-' : '+'} ${formatRupiah(tx.amount)}
            </div>
            <i data-lucide="chevron-right" style="color:var(--gray-300);width:16px;height:16px;"></i>
          </div>
        `).join("")}
      </div>
    </div>
  </div>

  <!-- Bottom Bar -->
  <div class="bottom-action-bar">
    <button class="btn btn-outline" onclick="APP.openModal('edit-project')">
      <i data-lucide="pencil"></i>Edit Project
    </button>
    <button class="btn btn-primary" onclick="APP.openModal('tambah-transaksi')">
      <i data-lucide="plus"></i>Tambah Transaksi
    </button>
  </div>
  `;
}

function renderItemRow(item: Record<string, unknown>, idx: number, projectId: number): string {
  const isOver = item.status === "over";
  const isPending = item.status === "pending";
  const isChecked = Boolean(item.checked);
  
  return `
  <div class="item-row ${isChecked ? 'checked' : ''}" id="item-row-${idx}" data-idx="${idx}" data-project="${projectId}">
    <div class="item-drag-handle"><i data-lucide="grip-vertical"></i></div>
    <button class="item-check-btn ${isChecked ? 'checked' : ''}" onclick="APP.toggleItemCheck(${idx}, ${projectId})" title="${isChecked ? 'Tandai belum' : 'Tandai selesai'}">
      <i data-lucide="${isChecked ? 'square-check' : 'square'}"></i>
    </button>
    <div class="item-content">
      <div>
        <span class="item-name" onclick="APP.startInlineEdit(this, ${idx}, ${projectId}, 'name')">${String(item.name)}</span>
        ${isOver ? '<i data-lucide="alert-triangle" style="color:var(--danger);width:14px;height:14px;margin-left:6px;vertical-align:middle;"></i>' : ''}
      </div>
      <div class="item-meta">
        <span class="item-qty">
          <span class="qty-actual ${isOver ? 'over' : ''}">${String(item.qtyActual)}</span>
          <span class="qty-plan"> / ${String(item.qtyPlan)} ${String(item.unit)}</span>
        </span>
        <span style="margin-left:8px;">@${formatRupiah(Number(item.unitPrice), true)}</span>
        <span style="margin-left:8px;color:${isOver ? 'var(--danger)' : 'var(--gray-700)'}"> = ${formatRupiah(Number(item.total))}</span>
        ${!isPending ? `<span style="margin-left:6px;color:var(--gray-400);font-size:11px;">(RAP: ${formatRupiah(Number(item.rapTotal), true)})</span>` : ''}
      </div>
    </div>
    <div class="item-status-dot ${String(item.status)}"></div>
    <div class="dropdown">
      <button class="item-menu-btn" onclick="APP.toggleItemDropdown(this, ${idx}, ${projectId})">
        <i data-lucide="more-vertical"></i>
      </button>
    </div>
  </div>
  `;
}

// ===== TAB: KEUANGAN =====
function renderTabKeuangan(p: typeof APP_DATA.projects[0]): string {
  const totalPemasukan = p.payments.reduce((s, pay) => s + pay.amount, 0);
  const totalRealisasi = (p.budget?.bahan?.actual || 0) + (p.budget?.tukang?.actual || 0);

  return `
  <div style="padding:20px;" class="tab-content">
    <!-- Saldo Hero -->
    <div class="pasiva-hero" style="margin-bottom:20px;cursor:pointer;" onclick="APP.openPopup('saldo', ${p.id})">
      <div class="pasiva-hero-icon">
        <i data-lucide="wallet"></i>
        Saldo Project
      </div>
      <div style="font-size:36px;font-weight:900;letter-spacing:-1px;color:var(--gray-900);margin-bottom:12px;" id="saldo-amount">
        ${formatRupiah(p.saldo)}
      </div>
      <div class="progress-bar-lg" style="background:var(--gray-200)">
        <div class="progress-bar orange" style="width:${(totalPemasukan/(p.contractValue)*100).toFixed(0)}%;min-width:120px;">
          ${formatRupiah(totalPemasukan, true)}
        </div>
      </div>
      <div style="text-align:center;font-size:13px;color:var(--gray-500);margin-top:8px;">
        Sisa Pembayaran: ${formatRupiah(p.contractValue - totalPemasukan, true)}
      </div>
    </div>

    <!-- Financial Cards -->
    <div class="grid-3 section">
      <div class="stat-card" onclick="APP.openPopup('pembayaran', ${p.id})">
        <div class="stat-card-header">
          <div class="stat-card-icon" style="background:var(--primary-light)">
            <i data-lucide="credit-card" style="color:var(--primary)"></i>
          </div>
          <span class="stat-card-label">Pembayaran</span>
        </div>
        <div style="font-size:18px;font-weight:800;margin-bottom:8px">${formatRupiah(totalPemasukan)}</div>
        ${renderSparkline([40,55,45,70,60,80,85], "primary")}
        <div class="progress-bar-lg" style="height:20px;margin-top:8px;">
          <div class="progress-bar danger" style="width:${(totalRealisasi/totalPemasukan*100).toFixed(0)}%;min-width:80px;font-size:11px;">
            ${formatRupiah(totalRealisasi, true)}
          </div>
        </div>
        <div class="progress-label">Sisa ${formatRupiah(totalPemasukan - totalRealisasi, true)}</div>
      </div>

      <div class="stat-card" onclick="APP.openPopup('laba', ${p.id})">
        <div class="stat-card-header">
          <div class="stat-card-icon" style="background:var(--success-light)">
            <i data-lucide="trending-up" style="color:var(--success)"></i>
          </div>
          <span class="stat-card-label">Est. Laba</span>
        </div>
        <div style="font-size:18px;font-weight:800;margin-bottom:8px;">${formatRupiah(p.rap?.estLaba || 0)}</div>
        ${renderSparkline([30,35,42,38,45,52,58], "success")}
        <div class="progress-bar-lg" style="height:20px;margin-top:8px;">
          <div class="progress-bar success" style="width:${((p.rap?.estLaba||0)/(p.contractValue)*100).toFixed(0)}%;min-width:80px;font-size:11px;">
            ${formatRupiah((p.rap?.estLaba||0), true)}
          </div>
        </div>
        <div class="progress-label">Margin ${(((p.rap?.estLaba||0)/p.contractValue)*100).toFixed(1)}%</div>
      </div>

      <div class="stat-card" onclick="APP.openPopup('hutang', ${p.id})">
        <div class="stat-card-header">
          <div class="stat-card-icon" style="background:var(--danger-light)">
            <i data-lucide="receipt" style="color:var(--danger)"></i>
          </div>
          <span class="stat-card-label">Hutang</span>
        </div>
        <div style="font-size:22px;font-weight:800;margin-bottom:8px;color:var(--danger);">
          ${formatRupiah(p.budget?.hutang || 0, true)}
        </div>
        <span class="badge danger">${p.hutangPiutang.filter(h => h.type === 'hutang').length} item aktif</span>
      </div>
    </div>

    <!-- Neraca -->
    <div class="card section">
      <div class="card-header">
        <div class="card-title"><i data-lucide="scale"></i> Neraca Posisi Keuangan</div>
      </div>
      <div class="neraca-grid">
        <div class="neraca-col">
          <div class="neraca-col-title">Aktiva (Penggunaan)</div>
          <div class="neraca-row">
            <span class="neraca-row-label"><i data-lucide="package"></i>Bahan</span>
            <span class="neraca-row-value">${formatRupiah(p.budget?.bahan?.actual || 0, true)}</span>
          </div>
          <div class="neraca-row">
            <span class="neraca-row-label"><i data-lucide="hard-hat"></i>Tukang</span>
            <span class="neraca-row-value">${formatRupiah(p.budget?.tukang?.actual || 0, true)}</span>
          </div>
          <div class="neraca-row">
            <span class="neraca-row-label"><i data-lucide="file-check"></i>Piutang</span>
            <span class="neraca-row-value">${formatRupiah(p.budget?.piutang || 0, true)}</span>
          </div>
          <div class="neraca-row">
            <span class="neraca-row-label"><i data-lucide="wallet"></i>Saldo Kas</span>
            <span class="neraca-row-value">${formatRupiah(p.saldo, true)}</span>
          </div>
          <div class="neraca-row neraca-total">
            <span>TOTAL AKTIVA</span>
            <span>${formatRupiah((p.budget?.bahan?.actual||0)+(p.budget?.tukang?.actual||0)+(p.budget?.piutang||0)+p.saldo, true)}</span>
          </div>
        </div>
        <div class="neraca-col">
          <div class="neraca-col-title">Pasiva (Sumber)</div>
          ${p.payments.map(pay => `
            <div class="neraca-row">
              <span class="neraca-row-label"><i data-lucide="credit-card"></i>${pay.name}</span>
              <span class="neraca-row-value">${formatRupiah(pay.amount, true)}</span>
            </div>
          `).join("")}
          <div class="neraca-row">
            <span class="neraca-row-label"><i data-lucide="receipt"></i>Hutang</span>
            <span class="neraca-row-value" style="color:var(--danger)">-${formatRupiah(p.budget?.hutang || 0, true)}</span>
          </div>
          <div class="neraca-row">
            <span class="neraca-row-label"><i data-lucide="trending-up"></i>Est. Laba</span>
            <span class="neraca-row-value" style="color:var(--success)">${formatRupiah(p.rap?.estLaba || 0, true)}</span>
          </div>
          <div class="neraca-row neraca-total">
            <span>TOTAL PASIVA</span>
            <span>${formatRupiah(p.payments.reduce((s,pay)=>s+pay.amount,0)-(p.budget?.hutang||0)+(p.rap?.estLaba||0), true)}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Hutang Piutang -->
    <div class="grid-2 section">
      <div class="stat-card" onclick="APP.openPopup('hutang', ${p.id})">
        <div class="stat-card-header">
          <div class="stat-card-icon" style="background:var(--danger-light)">
            <i data-lucide="receipt" style="color:var(--danger)"></i>
          </div>
          <span class="badge danger">Hutang</span>
        </div>
        <div style="font-size:20px;font-weight:800;color:var(--danger);margin-bottom:12px;">${formatRupiah(p.budget?.hutang||0)}</div>
        ${p.hutangPiutang.filter(h => h.type === 'hutang').map(h => `
          <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--gray-100);font-size:12px;">
            <span style="color:var(--gray-700)">${h.name}</span>
            <span style="font-weight:700;color:var(--danger)">${formatRupiah(h.amount, true)}</span>
          </div>
        `).join("")}
      </div>
      <div class="stat-card" onclick="APP.openPopup('piutang', ${p.id})">
        <div class="stat-card-header">
          <div class="stat-card-icon" style="background:var(--success-light)">
            <i data-lucide="file-check" style="color:var(--success)"></i>
          </div>
          <span class="badge success">Piutang</span>
        </div>
        <div style="font-size:20px;font-weight:800;color:var(--success);margin-bottom:12px;">${formatRupiah(p.budget?.piutang||0)}</div>
        ${p.hutangPiutang.filter(h => h.type === 'piutang').map(h => `
          <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--gray-100);font-size:12px;">
            <span style="color:var(--gray-700)">${h.name}</span>
            <span style="font-weight:700;color:var(--success)">${formatRupiah(h.amount, true)}</span>
          </div>
        `).join("")}
      </div>
    </div>

    <!-- All Transactions -->
    <div class="card section">
      <div class="card-header">
        <div class="card-title"><i data-lucide="clock"></i> Semua Transaksi</div>
        <button class="btn btn-sm btn-outline" onclick="APP.openModal('tambah-transaksi')">
          <i data-lucide="plus"></i>Tambah
        </button>
      </div>
      <div style="padding:0 20px;">
        ${[...p.payments, ...p.expenses].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(tx => `
          <div class="tx-item">
            <div class="tx-icon ${tx.type}"><i data-lucide="${tx.icon}"></i></div>
            <div class="tx-info">
              <div class="tx-name">${tx.name}</div>
              <div class="tx-date">${formatDate(tx.date)} ${'time' in tx ? '• ' + (tx as {time?:string}).time : ''}</div>
            </div>
            <div class="tx-amount ${tx.type}">
              ${tx.type === 'out' ? '-' : '+'} ${formatRupiah(tx.amount)}
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  </div>

  <div class="bottom-action-bar">
    <button class="btn btn-outline" onclick="APP.openModal('tambah-transaksi')">
      <i data-lucide="plus"></i>Tambah Transaksi
    </button>
    <button class="btn btn-primary" onclick="APP.openModal('transfer-bahan')">
      <i data-lucide="arrow-left-right"></i>Transfer
    </button>
  </div>
  `;
}

// ===== TAB: PROGRESS =====
function renderTabProgress(p: typeof APP_DATA.projects[0]): string {
  return `
  <div style="padding:20px;" class="tab-content">
    <!-- Hero -->
    <div style="background:linear-gradient(135deg,#064E3B,#065F46,#059669);border-radius:var(--radius-xl);padding:24px;color:white;margin-bottom:20px;">
      <div style="font-size:12px;font-weight:600;opacity:0.7;text-transform:uppercase;letter-spacing:0.5px;display:flex;align-items:center;gap:6px;margin-bottom:8px;">
        <i data-lucide="activity"></i>Progress Keseluruhan
      </div>
      <div style="font-size:48px;font-weight:900;letter-spacing:-2px;line-height:1;">${p.progress.actual}%</div>
      <div style="margin:12px 0;">
        <span style="background:rgba(245,158,11,0.2);color:#FDE68A;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:600;">
          ${p.progress.deviation}% Deviasi dari Rencana
        </span>
      </div>
      <div style="position:relative;background:rgba(255,255,255,0.15);border-radius:999px;height:20px;overflow:hidden;">
        <div style="position:absolute;top:0;left:0;height:100%;width:${p.progress.plan}%;background:rgba(255,255,255,0.25);border-radius:999px;"></div>
        <div style="position:absolute;top:0;left:0;height:100%;width:${p.progress.actual}%;background:white;border-radius:999px;"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px;opacity:0.8;margin-top:6px;">
        <span>Rencana: ${p.progress.plan}%</span>
        <span>Realisasi: ${p.progress.actual}%</span>
      </div>
    </div>

    <!-- Week Selector -->
    <div class="week-selector">
      <button class="week-nav-btn"><i data-lucide="chevron-left"></i></button>
      <span class="week-label">Minggu ke-2 (10-16 Jun 2024)</span>
      <button class="week-nav-btn"><i data-lucide="chevron-right"></i></button>
    </div>

    <!-- Donut Charts -->
    <div class="grid-2 section">
      <div class="card" style="padding:20px;text-align:center;">
        <div style="font-size:13px;font-weight:700;margin-bottom:12px;color:var(--gray-500);text-transform:uppercase;letter-spacing:0.5px;">Rencana</div>
        ${renderDonutChart(p.progress.plan, "#2563EB", "Rencana", `${p.progress.plan}%`)}
      </div>
      <div class="card" style="padding:20px;text-align:center;">
        <div style="font-size:13px;font-weight:700;margin-bottom:12px;color:var(--gray-500);text-transform:uppercase;letter-spacing:0.5px;">Realisasi</div>
        ${renderDonutChart(p.progress.actual, "#10B981", "Realisasi", `${p.progress.actual}%`)}
      </div>
    </div>

    <!-- S-Curve Chart -->
    <div class="card section">
      <div class="card-header">
        <div class="card-title"><i data-lucide="trending-up"></i> S-Curve Progress</div>
        <div style="display:flex;gap:12px;font-size:12px;">
          <span style="display:flex;align-items:center;gap:4px;"><span style="width:20px;height:3px;background:var(--primary);display:inline-block;border-radius:99px;"></span>Rencana</span>
          <span style="display:flex;align-items:center;gap:4px;"><span style="width:20px;height:3px;background:var(--success);display:inline-block;border-radius:99px;"></span>Aktual</span>
        </div>
      </div>
      <div class="card-body">
        <canvas id="scurve-chart" height="200" style="width:100%;"></canvas>
      </div>
    </div>

    <!-- Timeline -->
    <div class="card section">
      <div class="card-header">
        <div class="card-title"><i data-lucide="calendar"></i> Timeline Pekerjaan</div>
      </div>
      <div class="card-body">
        <div class="timeline">
          ${p.timeline.map(item => `
            <div class="timeline-item">
              <div class="timeline-dot ${item.status}">
                ${item.status === 'done' ? '<i data-lucide="check" style="width:10px;height:10px;color:white;"></i>' : ''}
              </div>
              <div class="timeline-content">
                <div class="timeline-title">
                  ${item.name}
                  <span class="badge ${item.status === 'done' ? 'success' : item.status === 'active' ? 'primary' : 'gray'}">
                    Bobot ${item.weight}%
                  </span>
                  ${item.status === 'active' && (item.progress||0) < (item.planProgress||0) ? 
                    `<span class="badge danger"><i data-lucide="alert-triangle"></i>${item.progress - (item.planProgress||0)}%</span>` : ''}
                </div>
                <div class="timeline-meta">
                  ${formatDate(item.start)} - ${formatDate(item.end)}
                  ${item.progress > 0 ? `• <strong>${item.progress}% selesai</strong>` : '• Belum dimulai'}
                  ${item.planProgress ? `(Target: ${item.planProgress}%)` : ''}
                </div>
                ${item.progress > 0 ? `
                  <div class="progress-bar-wrap" style="margin-top:6px;">
                    <div class="progress-bar ${item.status === 'done' ? 'success' : item.progress < (item.planProgress||item.progress) ? 'warning' : 'primary'}" 
                         style="width:${item.progress}%"></div>
                  </div>
                ` : ''}
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    </div>

    <!-- Heatmap -->
    <div class="card section">
      <div class="card-header">
        <div class="card-title"><i data-lucide="grid-3x3"></i> Heat Map Aktivitas</div>
      </div>
      <div class="card-body">
        <div style="font-size:11px;color:var(--gray-400);margin-bottom:6px;display:flex;gap:4px;">
          ${['Sen','Sel','Rab','Kam','Jum','Sab','Min'].map(d => `<div style="flex:1;text-align:center;">${d}</div>`).join('')}
        </div>
        <div class="heatmap">
          ${Array.from({length: 35}, (_, i) => {
            const level = Math.floor(Math.random() * 5);
            return `<div class="heatmap-cell level-${level}" title="Aktivitas level ${level}"></div>`;
          }).join("")}
        </div>
        <div class="heatmap-legend">
          <span>Kurang</span>
          <div class="heatmap-swatch" style="background:var(--gray-100)"></div>
          <div class="heatmap-swatch" style="background:#BBF7D0"></div>
          <div class="heatmap-swatch" style="background:#4ADE80"></div>
          <div class="heatmap-swatch" style="background:#22C55E"></div>
          <div class="heatmap-swatch" style="background:#15803D"></div>
          <span>Banyak</span>
        </div>
      </div>
    </div>
  </div>

  <div class="bottom-action-bar">
    <button class="btn btn-outline" onclick="APP.openModal('tambah-pekerjaan')">
      <i data-lucide="hammer"></i>Tambah Pekerjaan
    </button>
    <button class="btn btn-success" onclick="APP.openModal('lapor-progress')">
      <i data-lucide="check-circle-2"></i>Lapor Progress
    </button>
  </div>
  `;
}

// ===== TAB: RAP =====
function renderTabRap(p: typeof APP_DATA.projects[0]): string {
  const materials = p.rap?.materials || [];
  const workers = p.rap?.workers || [];
  const rapPct = ((p.rap?.totalRAP || 0) / p.contractValue * 100).toFixed(0);
  const realisasiPct = ((p.rap?.realisasi || 0) / p.contractValue * 100).toFixed(0);

  return `
  <div style="padding:20px;" class="tab-content">
    <!-- RAP Summary -->
    <div class="grid-4 section" style="gap:12px;">
      <div class="stat-card" onclick="APP.openPopup('kontrak', ${p.id})">
        <div class="stat-card-icon" style="background:var(--primary-light);margin-bottom:8px">
          <i data-lucide="file-signature" style="color:var(--primary)"></i>
        </div>
        <div class="stat-card-label">Nilai Kontrak</div>
        <div style="font-size:16px;font-weight:800;color:var(--primary);">${formatRupiah(p.contractValue, true)}</div>
      </div>
      <div class="stat-card" onclick="APP.openPopup('total-rap', ${p.id})">
        <div class="stat-card-icon" style="background:var(--gray-100);margin-bottom:8px">
          <i data-lucide="calculator" style="color:var(--gray-500)"></i>
        </div>
        <div class="stat-card-label">Total RAP</div>
        <div style="font-size:16px;font-weight:800;color:var(--gray-800);">${formatRupiah(p.rap?.totalRAP || 0, true)}</div>
      </div>
      <div class="stat-card" onclick="APP.openPopup('realisasi-rap', ${p.id})">
        <div class="stat-card-icon" style="background:var(--danger-light);margin-bottom:8px">
          <i data-lucide="wallet" style="color:var(--danger)"></i>
        </div>
        <div class="stat-card-label">Realisasi</div>
        <div style="font-size:16px;font-weight:800;color:var(--danger);">${formatRupiah(p.rap?.realisasi || 0, true)}</div>
      </div>
      <div class="stat-card" onclick="APP.openPopup('laba', ${p.id})">
        <div class="stat-card-icon" style="background:var(--success-light);margin-bottom:8px">
          <i data-lucide="trending-up" style="color:var(--success)"></i>
        </div>
        <div class="stat-card-label">Est. Laba</div>
        <div style="font-size:16px;font-weight:800;color:var(--success);">${formatRupiah(p.rap?.estLaba || 0, true)}</div>
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
        ${materials.map((item, idx) => renderItemRow(item as Record<string, unknown>, idx, p.id)).join("")}
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
        ${workers.map((item, idx) => renderItemRow(item as Record<string, unknown>, idx + 100, p.id)).join("")}
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

// ===== TAB: ANALISA =====
function renderTabAnalisa(p: typeof APP_DATA.projects[0]): string {
  const healthScore = 72;
  const rapPct = ((p.rap?.realisasi || 0) / (p.rap?.totalRAP || 1) * 100);
  
  return `
  <div style="padding:20px;" class="tab-content">
    <!-- Health Score -->
    <div class="card section" style="padding:24px;text-align:center;">
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--gray-400);margin-bottom:16px;">Health Score Project</div>
      <div style="position:relative;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="50" fill="none" stroke="var(--gray-200)" stroke-width="10"/>
          <circle cx="60" cy="60" r="50" fill="none" stroke="${healthScore >= 80 ? 'var(--success)' : healthScore >= 60 ? 'var(--warning)' : 'var(--danger)'}" 
                  stroke-width="10" stroke-linecap="round"
                  stroke-dasharray="${healthScore / 100 * 314} 314" 
                  transform="rotate(-90 60 60)"/>
        </svg>
        <div style="position:absolute;text-align:center;">
          <div style="font-size:32px;font-weight:900;color:var(--warning);">${healthScore}</div>
          <div style="font-size:10px;color:var(--gray-400);">/ 100</div>
        </div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;">
        <span class="badge success"><i data-lucide="check-circle-2"></i>Keuangan: Baik</span>
        <span class="badge warning"><i data-lucide="alert-triangle"></i>Progress: Terlambat</span>
        <span class="badge danger"><i data-lucide="alert-octagon"></i>Material: Over Budget</span>
      </div>
    </div>

    <!-- Analisa Keuangan -->
    <div class="section">
      <div class="section-title" style="margin-bottom:12px"><i data-lucide="wallet"></i> Analisa Keuangan</div>
      <div class="alert-card success">
        <i data-lucide="check-circle-2"></i>
        <div class="alert-card-content">
          <div class="alert-card-title">Cashflow Positif</div>
          <div class="alert-card-desc">Saldo ${formatRupiah(p.saldo, true)} dalam kondisi sehat untuk operasional</div>
        </div>
      </div>
      <div class="alert-card warning">
        <i data-lucide="alert-triangle"></i>
        <div class="alert-card-content">
          <div class="alert-card-title">Material Over Budget 22%</div>
          <div class="alert-card-desc">Semen Tiga Roda melebihi RAP ${formatRupiah(325000)}. Total realisasi ${formatRupiah(p.rap?.realisasi||0, true)} vs RAP ${formatRupiah(p.rap?.totalRAP||0, true)}</div>
        </div>
      </div>
      <div class="alert-card info">
        <i data-lucide="info"></i>
        <div class="alert-card-content">
          <div class="alert-card-title">Rekomendasi</div>
          <div class="alert-card-desc">Beli semen dalam jumlah besar (bulk) untuk menghemat Rp 150.000 - 200.000</div>
        </div>
      </div>
      <div class="alert-card danger">
        <i data-lucide="alert-octagon"></i>
        <div class="alert-card-content">
          <div class="alert-card-title">Hutang Jatuh Tempo</div>
          <div class="alert-card-desc">Toko Besi Jaya ${formatRupiah(1500000)} — 6 hari lagi (20 Jun 2024)</div>
        </div>
      </div>
    </div>

    <!-- Analisa Progress -->
    <div class="section">
      <div class="section-title" style="margin-bottom:12px"><i data-lucide="activity"></i> Analisa Progress</div>
      <div class="alert-card warning">
        <i data-lucide="clock"></i>
        <div class="alert-card-content">
          <div class="alert-card-title">Keterlambatan -5%</div>
          <div class="alert-card-desc">Struktur & Sloof baru 60% dari target 75%. Perlu percepatan</div>
        </div>
      </div>
      <div class="alert-card info">
        <i data-lucide="info"></i>
        <div class="alert-card-content">
          <div class="alert-card-title">Rekomendasi</div>
          <div class="alert-card-desc">Tambah 1 tukang besi selama 3 hari, tambahkan lembur Sabtu. Estimasi biaya tambahan: ${formatRupiah(975000)}</div>
        </div>
      </div>
      <div class="alert-card success">
        <i data-lucide="check-circle-2"></i>
        <div class="alert-card-content">
          <div class="alert-card-title">2/5 Item Selesai Tepat Waktu</div>
          <div class="alert-card-desc">Persiapan dan Galian & Pondasi selesai sesuai jadwal</div>
        </div>
      </div>
    </div>

    <!-- Proyeksi -->
    <div class="card section">
      <div class="card-header">
        <div class="card-title"><i data-lucide="calendar"></i> Proyeksi Akhir Project</div>
      </div>
      <div class="grid-4" style="padding:16px;gap:12px;">
        <div style="text-align:center;padding:16px;background:var(--gray-50);border-radius:var(--radius-lg);">
          <i data-lucide="calendar" style="width:24px;height:24px;color:var(--warning);margin-bottom:8px;"></i>
          <div style="font-size:14px;font-weight:800;color:var(--gray-800);">2 Juli</div>
          <div style="font-size:11px;color:var(--gray-400);">Est. Selesai (+2 hari)</div>
        </div>
        <div style="text-align:center;padding:16px;background:var(--gray-50);border-radius:var(--radius-lg);">
          <i data-lucide="wallet" style="width:24px;height:24px;color:var(--danger);margin-bottom:8px;"></i>
          <div style="font-size:14px;font-weight:800;color:var(--danger);">${formatRupiah(24200000, true)}</div>
          <div style="font-size:11px;color:var(--gray-400);">Est. Biaya Total (+Rp1.7jt)</div>
        </div>
        <div style="text-align:center;padding:16px;background:var(--gray-50);border-radius:var(--radius-lg);">
          <i data-lucide="trending-up" style="width:24px;height:24px;color:var(--success);margin-bottom:8px;"></i>
          <div style="font-size:14px;font-weight:800;color:var(--success);">${formatRupiah(13800000, true)}</div>
          <div style="font-size:11px;color:var(--gray-400);">Est. Laba Bersih</div>
        </div>
        <div style="text-align:center;padding:16px;background:var(--gray-50);border-radius:var(--radius-lg);">
          <i data-lucide="percent" style="width:24px;height:24px;color:var(--primary);margin-bottom:8px;"></i>
          <div style="font-size:14px;font-weight:800;color:var(--primary);">36.3%</div>
          <div style="font-size:11px;color:var(--gray-400);">Margin Bersih</div>
        </div>
      </div>
    </div>
  </div>
  `;
}

// ===== TAB: LAPORAN =====
function renderTabLaporan(p: typeof APP_DATA.projects[0]): string {
  return `
  <div style="padding:20px;" class="tab-content">
    <!-- Generator -->
    <div class="card section">
      <div class="card-header">
        <div class="card-title"><i data-lucide="sparkles"></i> Generate Laporan</div>
      </div>
      <div class="card-body">
        <div class="grid-2" style="gap:12px;margin-bottom:16px;">
          <div class="input-group" style="margin:0">
            <label class="input-label">Jenis Laporan</label>
            <select class="input select">
              <option>Laporan Mingguan</option>
              <option>Laporan Keuangan</option>
              <option>Laporan Progress</option>
              <option>Laporan Lengkap</option>
            </select>
          </div>
          <div class="input-group" style="margin:0">
            <label class="input-label">Periode</label>
            <input type="date" class="input" value="2024-06-10" />
          </div>
        </div>
        <button class="btn btn-primary w-full">
          <i data-lucide="sparkles"></i>Generate Laporan
        </button>
      </div>
    </div>

    <!-- Riwayat -->
    <div class="card section">
      <div class="card-header">
        <div class="card-title"><i data-lucide="clock"></i> Riwayat Laporan</div>
      </div>
      <div style="padding:0 4px;">
        ${[
          { icon: "file-bar-chart", name: "Laporan Mingguan W2", date: "21 Jun 2024" },
          { icon: "wallet", name: "Laporan Keuangan Juni W1", date: "20 Jun 2024" },
          { icon: "activity", name: "Laporan Progress W1", date: "14 Jun 2024" },
        ].map(r => `
          <div style="display:flex;align-items:center;gap:12px;padding:14px 16px;border-bottom:1px solid var(--gray-100);">
            <div style="width:36px;height:36px;background:var(--primary-light);border-radius:var(--radius-md);display:flex;align-items:center;justify-content:center;">
              <i data-lucide="${r.icon}" style="width:16px;height:16px;color:var(--primary);"></i>
            </div>
            <div style="flex:1;">
              <div style="font-size:14px;font-weight:600;">${r.name}</div>
              <div style="font-size:12px;color:var(--gray-400);">${r.date}</div>
            </div>
            <button class="btn btn-sm btn-outline"><i data-lucide="download"></i>Unduh</button>
            <button class="btn btn-sm btn-ghost"><i data-lucide="share-2"></i></button>
          </div>
        `).join("")}
      </div>
    </div>

    <!-- Preview -->
    <div class="card section">
      <div class="card-header">
        <div class="card-title"><i data-lucide="eye"></i> Preview Laporan</div>
      </div>
      <div class="card-body" style="background:var(--gray-50);border-radius:var(--radius-md);">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--gray-400);font-weight:700;margin-bottom:12px;">LAPORAN MINGGUAN — ${p.name} — Minggu ke-2</div>
        
        <div style="margin-bottom:12px;">
          <div style="font-size:12px;font-weight:700;color:var(--gray-600);margin-bottom:6px;">1. PROGRESS</div>
          <div class="grid-3" style="gap:8px;">
            <div style="text-align:center;padding:8px;background:white;border-radius:var(--radius-md);">
              <div style="font-size:16px;font-weight:900;color:var(--primary)">${p.progress.plan}%</div>
              <div style="font-size:10px;color:var(--gray-400)">Rencana</div>
            </div>
            <div style="text-align:center;padding:8px;background:white;border-radius:var(--radius-md);">
              <div style="font-size:16px;font-weight:900;color:var(--success)">${p.progress.actual}%</div>
              <div style="font-size:10px;color:var(--gray-400)">Realisasi</div>
            </div>
            <div style="text-align:center;padding:8px;background:white;border-radius:var(--radius-md);">
              <div style="font-size:16px;font-weight:900;color:var(--danger)">${p.progress.deviation}%</div>
              <div style="font-size:10px;color:var(--gray-400)">Deviasi</div>
            </div>
          </div>
        </div>

        <div style="margin-bottom:12px;">
          <div style="font-size:12px;font-weight:700;color:var(--gray-600);margin-bottom:6px;">2. KEUANGAN</div>
          <div style="font-size:13px;color:var(--gray-700);">
            Pengeluaran minggu ini: ${formatRupiah(12400000)} | Total: ${formatRupiah(p.rap?.realisasi||0)} | Saldo: ${formatRupiah(p.saldo, true)}
          </div>
        </div>

        <div style="margin-bottom:12px;">
          <div style="font-size:12px;font-weight:700;color:var(--gray-600);margin-bottom:6px;">3. KENDALA</div>
          <div style="font-size:13px;color:var(--gray-700);">Semen over budget Rp 325.000, keterlambatan pengiriman bata merah</div>
        </div>

        <div>
          <div style="font-size:12px;font-weight:700;color:var(--gray-600);margin-bottom:6px;">4. RENCANA MINGGU DEPAN</div>
          <div style="font-size:13px;color:var(--gray-700);">Selesaikan struktur & sloof, mulai pekerjaan dinding</div>
        </div>
      </div>
    </div>
  </div>

  <div class="bottom-action-bar">
    <button class="btn btn-outline"><i data-lucide="download"></i>Unduh PDF</button>
    <button class="btn btn-primary"><i data-lucide="share-2"></i>Kirim Laporan</button>
  </div>
  `;
}

// ===== FINANCE BUSINESS =====
function renderFinance(): string {
  const biz = state.data.business;
  const tabs = ["Overview", "Kas & Bank", "Hutang Piutang", "Laba Rugi", "Operasional", "Aset", "Laporan"];
  const activeTab = state.currentFinanceTab;

  return `
  <div class="page-header">
    <div>
      <div class="page-title">Keuangan Bisnis</div>
      <div class="page-subtitle">CV Berkah Konstruksi</div>
    </div>
    <button class="btn btn-primary" onclick="APP.openModal('tambah-transaksi')">
      <i data-lucide="plus"></i>Transaksi Baru
    </button>
  </div>

  <div class="card" style="margin-bottom:20px;">
    <div class="tab-nav">
      ${tabs.map((t, i) => `
        <button class="tab-btn ${activeTab === t.toLowerCase().replace(/\s+/g,'').replace('&','') ? 'active' : ''}"
                onclick="APP.switchFinanceTab('${t.toLowerCase().replace(/\s+/g,'').replace('&','')}')" >
          ${t}
        </button>
      `).join("")}
    </div>
    <div id="finance-tab-content" style="padding:20px;">
      ${renderFinanceTabContent()}
    </div>
  </div>
  `;
}

function renderFinanceTabContent(): string {
  const biz = state.data.business;
  const tab = state.currentFinanceTab;

  if (tab === "overview" || tab === "") {
    return `
    <!-- Neraca -->
    <div style="margin-bottom:20px;">
      <div class="finance-hero" onclick="APP.openPopup('kas-bisnis')">
        <div style="font-size:12px;opacity:0.7;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">
          <i data-lucide="building-2" style="display:inline;width:14px;height:14px;"></i>
          Total Kas Bisnis
        </div>
        <div style="font-size:40px;font-weight:900;letter-spacing:-1.5px;margin-bottom:8px;">${formatRupiah(biz.totalKas)}</div>
        ${renderSparkline([65,72,68,80,75,85,88], "white")}
        <span style="background:rgba(16,185,129,0.2);color:#6EE7B7;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:600;margin-top:8px;display:inline-flex;align-items:center;gap:4px;">
          <i data-lucide="trending-up" style="width:13px;height:13px;"></i>+18% bulan ini
        </span>
      </div>
    </div>

    <!-- Neraca Bisnis -->
    <div class="card section">
      <div class="card-header">
        <div class="card-title"><i data-lucide="scale"></i> Neraca Bisnis</div>
      </div>
      <div class="neraca-grid">
        <div class="neraca-col">
          <div class="neraca-col-title">Aktiva</div>
          <div class="neraca-row"><span class="neraca-row-label"><i data-lucide="wallet"></i>Kas & Bank</span><span class="neraca-row-value">${formatRupiah(biz.totalKas, true)}</span></div>
          <div class="neraca-row"><span class="neraca-row-label"><i data-lucide="file-check"></i>Piutang Klien</span><span class="neraca-row-value">${formatRupiah(biz.piutangList.reduce((s,p)=>s+p.amount,0), true)}</span></div>
          <div class="neraca-row"><span class="neraca-row-label"><i data-lucide="package"></i>Persediaan</span><span class="neraca-row-value">${formatRupiah(15000000, true)}</span></div>
          <div class="neraca-row"><span class="neraca-row-label"><i data-lucide="building-2"></i>Aset Tetap</span><span class="neraca-row-value">${formatRupiah(biz.asetTetap, true)}</span></div>
          <div class="neraca-row neraca-total"><span>TOTAL AKTIVA</span><span>${formatRupiah(biz.totalAktiva, true)}</span></div>
        </div>
        <div class="neraca-col">
          <div class="neraca-col-title">Pasiva</div>
          <div class="neraca-row"><span class="neraca-row-label"><i data-lucide="receipt"></i>Total Hutang</span><span class="neraca-row-value" style="color:var(--danger)">${formatRupiah(biz.totalHutang, true)}</span></div>
          <div class="neraca-row"><span class="neraca-row-label"><i data-lucide="wallet"></i>Modal</span><span class="neraca-row-value">${formatRupiah(biz.modal, true)}</span></div>
          <div class="neraca-row"><span class="neraca-row-label"><i data-lucide="trending-up"></i>Laba Ditahan</span><span class="neraca-row-value" style="color:var(--success)">${formatRupiah(biz.labaDitahan, true)}</span></div>
          <div class="neraca-row neraca-total"><span>TOTAL PASIVA</span><span>${formatRupiah(biz.totalHutang + biz.modal + biz.labaDitahan, true)}</span></div>
        </div>
      </div>
    </div>

    <!-- Projects Summary Table -->
    <div class="card section">
      <div class="card-header">
        <div class="card-title"><i data-lucide="folder-kanban"></i> Ringkasan Per Project</div>
      </div>
      <div style="overflow-x:auto;">
        <table class="data-table">
          <thead>
            <tr>
              <th>Proyek</th><th>Nilai Kontrak</th><th>Realisasi</th><th>Est. Laba</th><th>Progress</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${state.data.projects.map(p => `
              <tr onclick="APP.navigate('project/${p.id}')" style="cursor:pointer;">
                <td><strong>${p.name}</strong><br><span style="font-size:11px;color:var(--gray-400)">${p.client}</span></td>
                <td>${formatRupiah(p.contractValue, true)}</td>
                <td style="color:var(--danger)">${formatRupiah((p.rap?.realisasi||0), true)}</td>
                <td style="color:var(--success)">${formatRupiah((p.rap?.estLaba||0), true)}</td>
                <td>
                  <div style="display:flex;align-items:center;gap:8px;">
                    <div class="progress-bar-wrap" style="flex:1;margin:0">
                      <div class="progress-bar success" style="width:${p.progress.actual}%"></div>
                    </div>
                    <span style="font-size:12px;font-weight:700;">${p.progress.actual}%</span>
                  </div>
                </td>
                <td><span class="badge ${p.status === 'ok' ? 'success' : 'warning'}">${p.status === 'ok' ? 'Aktif' : 'Perhatian'}</span></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
    `;
  }

  if (tab === "kasbank") {
    return `
    <div class="grid-2 section">
      ${biz.accounts.map(acc => `
        <div class="stat-card" onclick="APP.openPopup('mutasi-${acc.id}')">
          <div class="stat-card-header">
            <div class="stat-card-icon" style="background:var(--primary-light)">
              <i data-lucide="${acc.icon}" style="color:var(--primary)"></i>
            </div>
            <span class="badge primary">Aktif</span>
          </div>
          <div class="stat-card-label">${acc.name}</div>
          <div style="font-size:22px;font-weight:800;color:var(--gray-900);margin:6px 0">${formatRupiah(acc.balance)}</div>
          ${renderSparkline([40,55,50,65,60,72,80], "primary")}
        </div>
      `).join("")}
    </div>
    `;
  }

  if (tab === "hutangpiutang") {
    const totalHutang = biz.hutangList.reduce((s, h) => s + h.amount, 0);
    const totalPiutang = biz.piutangList.reduce((s, p) => s + p.amount, 0);
    return `
    <div class="grid-2 section">
      <div>
        <div style="font-size:14px;font-weight:700;color:var(--danger);margin-bottom:12px;">Hutang — ${formatRupiah(totalHutang, true)}</div>
        ${biz.hutangList.map(h => `
          <div class="vendor-card" style="margin-bottom:8px;">
            <div class="vendor-icon" style="background:var(--danger-light)"><i data-lucide="${h.icon}" style="color:var(--danger);"></i></div>
            <div class="vendor-info">
              <div class="vendor-name">${h.name}</div>
              <div class="vendor-meta">${h.category} • Jatuh tempo: ${formatDate(h.due)}</div>
            </div>
            <div style="font-weight:800;color:var(--danger);">${formatRupiah(h.amount, true)}</div>
          </div>
        `).join("")}
      </div>
      <div>
        <div style="font-size:14px;font-weight:700;color:var(--success);margin-bottom:12px;">Piutang — ${formatRupiah(totalPiutang, true)}</div>
        ${biz.piutangList.map(p => `
          <div class="vendor-card" style="margin-bottom:8px;">
            <div class="vendor-icon" style="background:var(--success-light)"><i data-lucide="${p.icon}" style="color:var(--success);"></i></div>
            <div class="vendor-info">
              <div class="vendor-name">${p.name}</div>
              <div class="vendor-meta">${p.category} • Jatuh tempo: ${formatDate(p.due)}</div>
            </div>
            <div style="font-weight:800;color:var(--success);">${formatRupiah(p.amount, true)}</div>
          </div>
        `).join("")}
      </div>
    </div>
    `;
  }

  if (tab === "operasional") {
    return `
    <div class="card section">
      <div class="card-header">
        <div class="card-title"><i data-lucide="landmark"></i> Biaya Operasional Bulan Ini</div>
      </div>
      <div style="padding:0 20px;">
        ${biz.operational.map(op => `
          <div style="padding:12px 0;border-bottom:1px solid var(--gray-100);">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
              <div style="display:flex;align-items:center;gap:8px;">
                <div style="width:32px;height:32px;border-radius:var(--radius-md);background:var(--gray-100);display:flex;align-items:center;justify-content:center;">
                  <i data-lucide="${op.icon}" style="width:15px;height:15px;color:var(--gray-500);"></i>
                </div>
                <span style="font-size:14px;font-weight:600;">${op.name}</span>
              </div>
              <div style="text-align:right;">
                <div style="font-size:14px;font-weight:700;">${formatRupiah(op.actual, true)}</div>
                <div style="font-size:11px;color:var(--gray-400);">Budget: ${formatRupiah(op.budget, true)}</div>
              </div>
            </div>
            <div class="progress-bar-wrap">
              <div class="progress-bar ${op.actual <= op.budget ? 'success' : 'danger'}" 
                   style="width:${Math.min(op.actual/op.budget*100, 100)}%"></div>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
    `;
  }

  if (tab === "aset") {
    return `
    <div class="card section">
      <div class="card-header">
        <div class="card-title"><i data-lucide="wrench"></i> Inventaris Aset</div>
        <button class="btn btn-sm btn-primary"><i data-lucide="plus"></i>Tambah Aset</button>
      </div>
      <div style="overflow-x:auto;">
        <table class="data-table">
          <thead>
            <tr><th>Nama Aset</th><th>Kondisi</th><th>Nilai</th><th>Digunakan Di</th><th>Aksi</th></tr>
          </thead>
          <tbody>
            ${biz.assets.map(a => `
              <tr>
                <td style="display:flex;align-items:center;gap:10px;">
                  <div style="width:32px;height:32px;border-radius:var(--radius-md);background:var(--gray-100);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    <i data-lucide="${a.icon}" style="width:15px;height:15px;color:var(--gray-500);"></i>
                  </div>
                  <strong>${a.name}</strong>
                </td>
                <td><span class="badge ${a.condition === 'Baik' ? 'success' : 'warning'}">${a.condition}</span></td>
                <td>${formatRupiah(a.value, true)}</td>
                <td>${a.assignedTo ? `<span class="badge primary">${a.assignedTo}</span>` : '<span style="color:var(--gray-400)">-</span>'}</td>
                <td>
                  <button class="btn btn-sm btn-ghost"><i data-lucide="pencil"></i></button>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
    `;
  }

  if (tab === "labarugi") {
    const totalRevenue = state.data.projects.reduce((s, p) => s + p.contractValue, 0);
    const totalCost = state.data.projects.reduce((s, p) => s + (p.rap?.realisasi || 0), 0);
    const totalOpex = biz.operational.reduce((s, o) => s + o.actual, 0);
    const grossProfit = totalRevenue - totalCost;
    const netProfit = grossProfit - totalOpex;

    return `
    <div class="card section">
      <div class="card-header">
        <div class="card-title"><i data-lucide="file-bar-chart"></i> Laba Rugi Konsolidasi</div>
        <span class="badge success">Juni 2024</span>
      </div>
      <div class="card-body">
        <div style="display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--gray-100);">
          <span style="font-weight:600;color:var(--gray-700);">Pendapatan</span>
          <span style="font-weight:800;color:var(--success);">${formatRupiah(totalRevenue, true)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--gray-100);">
          <span style="font-weight:600;color:var(--gray-700);">HPP (Biaya Proyek)</span>
          <span style="font-weight:800;color:var(--danger);">- ${formatRupiah(totalCost, true)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:12px 0;border-bottom:2px solid var(--gray-200);">
          <span style="font-weight:700;">Laba Kotor</span>
          <span style="font-weight:800;color:var(--primary);">${formatRupiah(grossProfit, true)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--gray-100);">
          <span style="font-weight:600;color:var(--gray-700);">Beban Operasional</span>
          <span style="font-weight:800;color:var(--danger);">- ${formatRupiah(totalOpex, true)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:12px 0;border-top:2px solid var(--gray-800);background:var(--success-light);margin:0 -20px;padding:16px 20px;border-radius:0 0 var(--radius-md) var(--radius-md);">
          <span style="font-size:16px;font-weight:800;">LABA BERSIH</span>
          <span style="font-size:16px;font-weight:900;color:var(--success);">${formatRupiah(netProfit, true)}</span>
        </div>
      </div>
    </div>
    `;
  }

  if (tab === "laporan") {
    return `
    <div class="card section">
      <div class="card-header">
        <div class="card-title"><i data-lucide="file-bar-chart"></i> Laporan Keuangan</div>
      </div>
      <div class="card-body">
        <div class="grid-2" style="gap:12px;">
          ${[
            { label: "Neraca", icon: "scale", desc: "Aset, kewajiban, ekuitas" },
            { label: "Laba Rugi", icon: "trending-up", desc: "Pendapatan, beban, laba" },
            { label: "Arus Kas", icon: "arrow-left-right", desc: "Cash in & out flow" },
            { label: "Per Project", icon: "folder-kanban", desc: "Konsolidasi semua project" },
          ].map(r => `
            <div class="vendor-card" style="cursor:pointer;">
              <div class="vendor-icon" style="background:var(--primary-light)"><i data-lucide="${r.icon}" style="color:var(--primary);width:18px;height:18px;"></i></div>
              <div class="vendor-info">
                <div class="vendor-name">${r.label}</div>
                <div class="vendor-meta">${r.desc}</div>
              </div>
              <button class="btn btn-sm btn-ghost"><i data-lucide="download"></i></button>
            </div>
          `).join("")}
        </div>
      </div>
    </div>
    `;
  }

  return `<div style="padding:20px;color:var(--gray-400);text-align:center;">Pilih tab untuk melihat data</div>`;
}

// ===== DATABASE =====
function renderDatabase(): string {
  const db = state.data.database;
  const tabs = ["Bahan", "Tenaga", "Alat", "Vendor", "Klien", "Template"];
  const activeTab = state.currentDatabaseTab;

  return `
  <div class="page-header">
    <div>
      <div class="page-title">Database Master</div>
      <div class="page-subtitle">Master data material, tenaga, template</div>
    </div>
    <div class="page-actions">
      <div class="search-bar" style="width:200px;">
        <i data-lucide="search"></i>
        <input type="text" placeholder="Cari..." id="db-search" oninput="APP.filterDatabase(this.value)" />
      </div>
      <button class="btn btn-primary" onclick="APP.openModal('tambah-database')">
        <i data-lucide="plus"></i>Tambah
      </button>
    </div>
  </div>

  <div class="card">
    <div class="tab-nav">
      ${tabs.map(t => `
        <button class="tab-btn ${activeTab === t.toLowerCase() ? 'active' : ''}"
                onclick="APP.switchDatabaseTab('${t.toLowerCase()}')">
          ${t}
        </button>
      `).join("")}
    </div>
    <div id="db-tab-content" style="padding:20px;">
      ${renderDatabaseTabContent()}
    </div>
  </div>
  `;
}

function renderDatabaseTabContent(): string {
  const db = state.data.database;
  const tab = state.currentDatabaseTab;

  if (tab === "bahan") {
    return `
    <div style="overflow-x:auto;">
      <table class="data-table">
        <thead>
          <tr>
            <th>Nama Bahan</th><th>Kategori</th><th>Satuan</th><th>Harga</th>
            <th>Harga Terakhir</th><th>Trend</th><th>Stock</th><th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          ${db.materials.map(m => `
            <tr>
              <td>
                <div style="display:flex;align-items:center;gap:8px;">
                  <div style="width:30px;height:30px;border-radius:var(--radius-sm);background:var(--gray-100);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    <i data-lucide="${m.icon}" style="width:14px;height:14px;color:var(--gray-500);"></i>
                  </div>
                  <div>
                    <div style="font-weight:600;font-size:13px;">${m.name}</div>
                    <div style="font-size:11px;color:var(--gray-400);">Dipakai di ${m.usedIn} project</div>
                  </div>
                </div>
              </td>
              <td><span class="badge gray">${m.category}</span></td>
              <td style="color:var(--gray-600)">${m.unit}</td>
              <td><strong>${formatRupiah(m.price)}</strong></td>
              <td style="color:var(--gray-500)">${formatRupiah(m.lastPrice)}</td>
              <td>
                <span style="color:${m.trend === 'up' ? 'var(--danger)' : m.trend === 'down' ? 'var(--success)' : 'var(--gray-400)'};">
                  <i data-lucide="${m.trend === 'up' ? 'trending-up' : m.trend === 'down' ? 'trending-down' : 'minus'}" style="width:16px;height:16px;"></i>
                </span>
              </td>
              <td>
                ${m.stock > 0 ? `<span class="badge success">${m.stock} ${m.unit}</span>` : '<span class="badge gray">Habis</span>'}
              </td>
              <td>
                <div style="display:flex;gap:4px;">
                  <button class="icon-btn" title="Edit"><i data-lucide="pencil"></i></button>
                  <button class="icon-btn" title="Hapus" style="color:var(--danger)"><i data-lucide="trash-2"></i></button>
                </div>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
    `;
  }

  if (tab === "tenaga") {
    return `
    <div class="grid-2">
      ${db.workers.map(w => `
        <div class="vendor-card">
          <div class="vendor-icon" style="background:var(--warning-light)">
            <i data-lucide="hard-hat" style="color:var(--warning-dark);width:20px;height:20px;"></i>
          </div>
          <div class="vendor-info">
            <div class="vendor-name">${w.name}</div>
            <div class="vendor-meta">
              <span class="badge ${w.level === 'Ahli' ? 'primary' : w.level === 'Mandor' ? 'purple' : w.level === 'Menengah' ? 'info' : 'gray'}" style="font-size:10px;">${w.level}</span>
              <span style="margin-left:6px;">${formatRupiah(w.rate, true)}/hari</span>
            </div>
          </div>
          <div class="stars">
            ${Array.from({length: 5}, (_, i) => `<i data-lucide="${i < w.rating ? 'star' : 'star'}" style="width:12px;height:12px;${i < w.rating ? 'fill:var(--warning);' : 'opacity:0.2;'}"></i>`).join("")}
          </div>
          <div style="display:flex;gap:4px;">
            <button class="icon-btn" title="Edit"><i data-lucide="pencil"></i></button>
            <button class="icon-btn" title="Hapus" style="color:var(--danger)"><i data-lucide="trash-2"></i></button>
          </div>
        </div>
      `).join("")}
    </div>
    `;
  }

  if (tab === "alat") {
    return `
    <div class="grid-2">
      ${db.tools.map(t => `
        <div class="vendor-card">
          <div class="vendor-icon" style="background:var(--gray-100)">
            <i data-lucide="wrench" style="color:var(--gray-600);width:20px;height:20px;"></i>
          </div>
          <div class="vendor-info">
            <div class="vendor-name">${t.name}</div>
            <div class="vendor-meta">
              <span class="badge ${t.type === 'owned' ? 'success' : 'info'}">${t.type === 'owned' ? 'Milik' : 'Sewa'}</span>
              ${t.condition !== 'Baik' ? `<span class="badge warning" style="margin-left:4px;">${t.condition}</span>` : ''}
            </div>
          </div>
          ${t.assignedTo ? `<span class="badge primary">${t.assignedTo}</span>` : ''}
          <div style="display:flex;gap:4px;">
            <button class="icon-btn"><i data-lucide="pencil"></i></button>
          </div>
        </div>
      `).join("")}
    </div>
    `;
  }

  if (tab === "vendor") {
    return `
    <div class="grid-2">
      ${db.vendors.map(v => `
        <div class="vendor-card">
          <div class="vendor-icon"><i data-lucide="store" style="width:20px;height:20px;color:var(--gray-500);"></i></div>
          <div class="vendor-info">
            <div class="vendor-name">${v.name}</div>
            <div class="vendor-meta">${v.category} • ${v.phone}</div>
            <div style="margin-top:4px;">
              <span class="badge gray">${v.productCount} produk</span>
              <span class="badge info" style="margin-left:4px;">${v.terms}</span>
              ${v.activeHutang > 0 ? `<span class="badge danger" style="margin-left:4px;">Hutang ${formatRupiah(v.activeHutang, true)}</span>` : ''}
            </div>
          </div>
          <div style="display:flex;gap:4px;">
            <button class="icon-btn"><i data-lucide="pencil"></i></button>
          </div>
        </div>
      `).join("")}
    </div>
    `;
  }

  if (tab === "klien") {
    return `
    <div class="grid-2">
      ${db.clients.map(c => `
        <div class="vendor-card">
          <div class="vendor-icon"><i data-lucide="user-circle" style="width:20px;height:20px;color:var(--gray-500);"></i></div>
          <div class="vendor-info">
            <div class="vendor-name">${c.name}</div>
            <div class="vendor-meta">${c.phone} • ${c.projectCount} project</div>
            ${c.activePiutang > 0 ? `<span class="badge warning" style="margin-top:4px;display:inline-flex;">Piutang ${formatRupiah(c.activePiutang, true)}</span>` : ''}
          </div>
          <div class="stars">
            ${Array.from({length: 5}, (_, i) => `<i data-lucide="star" style="width:12px;height:12px;${i < c.rating ? 'fill:var(--warning);color:var(--warning);' : 'opacity:0.2;'}"></i>`).join("")}
          </div>
          <button class="icon-btn"><i data-lucide="pencil"></i></button>
        </div>
      `).join("")}
    </div>
    `;
  }

  if (tab === "template") {
    const categories = ["Interior", "Konstruksi", "Renovasi"];
    return `
    <div class="section">
      ${categories.map(cat => {
        const catTemplates = db.templates.filter(t => t.category === cat);
        const catIcon = cat === "Interior" ? "sofa" : cat === "Konstruksi" ? "building-2" : "hammer";
        return `
        <div class="card" style="margin-bottom:16px;">
          <div class="card-header" onclick="this.parentElement.querySelector('.template-body').classList.toggle('expanded')" style="cursor:pointer;">
            <div class="card-title">
              <i data-lucide="${catIcon}"></i> ${cat}
              <span class="badge gray">${catTemplates.length} template</span>
            </div>
            <i data-lucide="chevron-down"></i>
          </div>
          <div class="template-body">
            ${catTemplates.map(t => `
              <div style="padding:14px 20px;border-bottom:1px solid var(--gray-100);">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                  <div>
                    <div style="font-size:14px;font-weight:700;">${t.name}</div>
                    <div style="font-size:12px;color:var(--gray-400);">Per ${t.baseUnit}</div>
                  </div>
                  <div style="text-align:right;">
                    <div style="font-size:13px;font-weight:700;color:var(--success);">${formatRupiah(t.estSellPerUnit, true)}/unit</div>
                    <div style="font-size:11px;color:var(--gray-400);">Margin ${t.margin}%</div>
                  </div>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
                  <span class="badge gray">${t.materials.length} bahan</span>
                  <span class="badge gray">${t.workers.length} tenaga</span>
                  <span class="badge success">Biaya ${formatRupiah(t.estCostPerUnit, true)}/unit</span>
                </div>
                <div style="display:flex;gap:8px;">
                  <button class="btn btn-sm btn-outline" onclick="APP.openModal('generate-rap')">
                    <i data-lucide="sparkles"></i>Gunakan
                  </button>
                  <button class="btn btn-sm btn-ghost"><i data-lucide="pencil"></i>Edit</button>
                  <button class="btn btn-sm btn-ghost"><i data-lucide="copy"></i>Duplikat</button>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
        `;
      }).join("")}
    </div>
    `;
  }

  return "";
}

// ===== SPARKLINE HELPER =====
function renderSparkline(data: number[], color: string): string {
  const max = Math.max(...data);
  const colorMap: Record<string, string> = {
    primary: "var(--primary)",
    success: "var(--success)",
    danger: "var(--danger)",
    warning: "var(--warning)",
    purple: "var(--purple)",
    white: "rgba(255,255,255,0.5)",
    green: "var(--success)",
  };
  const c = colorMap[color] || color;
  return `
  <div class="sparkline">
    ${data.map(v => `
      <div class="sparkline-bar" style="height:${Math.round((v/max)*28)}px;background:${c};opacity:0.6;"></div>
    `).join("")}
  </div>
  `;
}

// ===== DONUT CHART SVG =====
function renderDonutChart(pct: number, color: string, label: string, displayValue: string): string {
  const r = 48;
  const circ = 2 * Math.PI * r;
  const dashArr = (pct / 100) * circ;
  return `
  <div class="donut-wrap">
    <svg width="120" height="120" viewBox="0 0 120 120" class="donut-svg">
      <circle cx="60" cy="60" r="${r}" fill="none" stroke="var(--gray-200)" stroke-width="10"/>
      <circle cx="60" cy="60" r="${r}" fill="none" stroke="${color}" 
              stroke-width="10" stroke-linecap="round"
              stroke-dasharray="${dashArr.toFixed(2)} ${circ.toFixed(2)}" 
              transform="rotate(-90 60 60)"/>
    </svg>
    <div style="position:absolute;text-align:center;">
      <div style="font-size:24px;font-weight:900;color:${color}">${displayValue}</div>
      <div style="font-size:11px;color:var(--gray-400)">${label}</div>
    </div>
  </div>
  `;
}

// ===== CHARTS =====
function renderDashboardChart(): void {
  const canvas = document.getElementById("cashflow-chart") as HTMLCanvasElement;
  if (!canvas) return;
  
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  canvas.width = canvas.offsetWidth * window.devicePixelRatio || 800;
  canvas.height = 220 * window.devicePixelRatio || 440;
  ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);

  const w = canvas.offsetWidth;
  const h = 220;
  const pd = 40;
  const data = state.data.business;
  const inData = data.cashflowData;
  const outData = data.cashflowOut;
  const labels = data.cashflowMonths;
  const max = Math.max(...inData, ...outData) * 1.1;

  ctx.clearRect(0, 0, w, h);

  // Grid lines
  ctx.strokeStyle = "rgba(0,0,0,0.05)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pd + (h - 2 * pd) * (i / 4);
    ctx.beginPath();
    ctx.moveTo(pd, y);
    ctx.lineTo(w - pd, y);
    ctx.stroke();
  }

  const drawLine = (dataset: number[], color: string, fillColor: string) => {
    const pts = dataset.map((v, i) => ({
      x: pd + i * ((w - 2 * pd) / (dataset.length - 1)),
      y: h - pd - (v / max) * (h - 2 * pd),
    }));

    // Fill
    ctx.beginPath();
    ctx.moveTo(pts[0].x, h - pd);
    pts.forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.lineTo(pts[pts.length - 1].x, h - pd);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.stroke();

    // Dots
    pts.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  };

  drawLine(outData, "#EF4444", "rgba(239,68,68,0.08)");
  drawLine(inData, "#10B981", "rgba(16,185,129,0.08)");

  // Labels
  ctx.fillStyle = "#9CA3AF";
  ctx.font = `11px Inter, sans-serif`;
  ctx.textAlign = "center";
  labels.forEach((l, i) => {
    const x = pd + i * ((w - 2 * pd) / (labels.length - 1));
    ctx.fillText(l, x, h - 10);
  });
}

function renderProjectCharts(): void {
  const project = state.data.projects.find(p => p.id === state.currentProjectId);
  if (!project || state.currentProjectTab !== "progress") return;

  const canvas = document.getElementById("scurve-chart") as HTMLCanvasElement;
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  canvas.width = canvas.offsetWidth * window.devicePixelRatio || 600;
  canvas.height = 200 * window.devicePixelRatio || 400;
  ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);

  const w = canvas.offsetWidth;
  const h = 200;
  const pd = 30;

  // S-curve data points
  const planData = [0, 8, 20, 38, 58, 72, 82, 88, 92, 95, 100];
  const actualData = [0, 7, 18, 35, 55, 68, 78, null, null, null, null];

  ctx.clearRect(0, 0, w, h);

  // Grid
  ctx.strokeStyle = "rgba(0,0,0,0.05)";
  for (let i = 0; i <= 4; i++) {
    const y = pd + (h - 2 * pd) * (i / 4);
    ctx.beginPath();
    ctx.moveTo(pd, y);
    ctx.lineTo(w - pd, y);
    ctx.stroke();
  }

  const drawCurve = (data: (number | null)[], color: string) => {
    const pts = data.map((v, i) => v !== null ? {
      x: pd + i * ((w - 2 * pd) / (data.length - 1)),
      y: h - pd - ((v as number) / 100) * (h - 2 * pd),
    } : null).filter(Boolean) as {x: number; y: number}[];

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.stroke();
  };

  drawCurve(planData, "#2563EB");
  drawCurve(actualData, "#10B981");
}

// ===== INTERACTIONS =====
function setupPageInteractions(): void {
  // Close dropdowns when clicking overlay
  const overlay = document.getElementById("dropdown-overlay");
  if (overlay) {
    overlay.onclick = () => {
      closeAllDropdowns();
      overlay.style.display = "none";
    };
  }

  // Animate progress bars
  document.querySelectorAll<HTMLElement>(".progress-bar").forEach((bar) => {
    const w = bar.style.width;
    bar.style.width = "0%";
    setTimeout(() => {
      bar.style.width = w;
    }, 200);
  });
}

function initAnimations(): void {
  // Count up numbers
  document.querySelectorAll("[data-count]").forEach((el) => {
    const target = parseInt(el.getAttribute("data-count") || "0");
    if (el instanceof HTMLElement) {
      countUp(el, target, 800, (n) => formatRupiah(n, true));
    }
  });
}

// ===== POPUP SYSTEM =====
let currentPopup: HTMLElement | null = null;

function openPopup(type: string, projectId?: number): void {
  closeModal();
  
  const project = projectId ? state.data.projects.find(p => p.id === projectId) : null;
  let popupConfig = getPopupConfig(type, project);
  
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.id = "popup-modal";
  modal.innerHTML = `
  <div class="modal-dialog" onclick="event.stopPropagation()">
    <div class="modal-header">
      <div class="modal-title">${popupConfig.icon ? `<i data-lucide="${popupConfig.icon}"></i>` : ''} ${popupConfig.title}</div>
      <button class="modal-close" onclick="APP.closePopup()"><i data-lucide="x"></i></button>
    </div>
    <div class="modal-body">
      <div class="popup-3cards">
        ${popupConfig.cards.map(c => `
          <div class="popup-3card">
            <div class="popup-3card-icon" style="background:${c.bg};">
              <i data-lucide="${c.icon}" style="color:${c.color};"></i>
            </div>
            <div class="popup-3card-value">${c.value}</div>
            <div class="popup-3card-label">${c.label}</div>
          </div>
        `).join("")}
      </div>
      <div style="display:flex;gap:8px;margin-bottom:16px;">
        <div class="search-bar" style="flex:1;">
          <i data-lucide="search"></i>
          <input type="text" placeholder="Cari..." />
        </div>
        <button class="btn btn-sm btn-outline"><i data-lucide="filter"></i>Filter</button>
      </div>
      <div style="border:1px solid var(--gray-100);border-radius:var(--radius-lg);overflow:hidden;">
        ${popupConfig.list.map(item => `
          <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--gray-50);">
            <div style="width:32px;height:32px;border-radius:var(--radius-md);background:${item.bg||'var(--gray-100)'};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <i data-lucide="${item.icon||'box'}" style="width:15px;height:15px;color:${item.color||'var(--gray-500)'};"></i>
            </div>
            <div style="flex:1;min-width:0;">
              <div style="font-size:13px;font-weight:600;">${item.title}</div>
              <div style="font-size:11px;color:var(--gray-400);">${item.meta}</div>
            </div>
            <div style="font-weight:700;color:${item.valueColor||'var(--gray-800)'};white-space:nowrap;">${item.value}</div>
          </div>
        `).join("")}
      </div>
      ${popupConfig.detailRoute ? `
        <div style="margin-top:16px;">
          <button class="btn btn-outline-primary w-full" onclick="APP.navigate('${popupConfig.detailRoute}');APP.closePopup();">
            <i data-lucide="external-link"></i>Buka Detail Lengkap
          </button>
        </div>
      ` : ''}
    </div>
  </div>
  `;

  modal.onclick = (e) => {
    if (e.target === modal) closePopup();
  };

  document.body.appendChild(modal);
  currentPopup = modal;
  initLucideIcons();
}

function getPopupConfig(type: string, project: typeof APP_DATA.projects[0] | null | undefined) {
  const biz = state.data.business;

  const configs: Record<string, {
    title: string; icon?: string;
    cards: {icon: string; value: string; label: string; bg: string; color: string}[];
    list: {icon?: string; title: string; meta: string; value: string; bg?: string; color?: string; valueColor?: string}[];
    detailRoute?: string;
  }> = {
    "bahan": {
      title: "Material / Bahan",
      icon: "package",
      cards: [
        { icon: "package", value: `${project?.rap?.materials?.length || 0} item`, label: "Jumlah Item", bg: "var(--primary-light)", color: "var(--primary)" },
        { icon: "wallet", value: formatRupiah(project?.budget?.bahan?.actual || 0, true), label: "Total Nominal", bg: "var(--danger-light)", color: "var(--danger)" },
        { icon: "store", value: "3 vendor", label: "Vendor Terlibat", bg: "var(--success-light)", color: "var(--success)" },
      ],
      list: (project?.rap?.materials || []).map(m => ({
        icon: "package",
        title: String(m.name),
        meta: `${m.qtyActual} ${m.unit} x ${formatRupiah(m.unitPrice)} = ${formatRupiah(m.total)}`,
        value: formatRupiah(m.total, true),
        bg: "var(--gray-100)",
        valueColor: m.status === 'over' ? "var(--danger)" : "var(--gray-800)",
      })),
      detailRoute: project ? `project/${project.id}` : undefined,
    },
    "tukang": {
      title: "Tenaga Kerja",
      icon: "hard-hat",
      cards: [
        { icon: "hard-hat", value: `${project?.rap?.workers?.length || 0} tukang`, label: "Jumlah Tenaga", bg: "var(--warning-light)", color: "var(--warning-dark)" },
        { icon: "wallet", value: formatRupiah(project?.budget?.tukang?.actual || 0, true), label: "Total Upah", bg: "var(--success-light)", color: "var(--success)" },
        { icon: "calendar", value: "15 hari", label: "Total Hari", bg: "var(--primary-light)", color: "var(--primary)" },
      ],
      list: (project?.rap?.workers || []).map(w => ({
        icon: "hard-hat",
        title: String(w.name),
        meta: `${w.qtyActual} hari x ${formatRupiah(w.unitPrice)}`,
        value: formatRupiah(w.total, true),
        bg: "var(--warning-light)",
        color: "var(--warning-dark)",
      })),
      detailRoute: project ? `project/${project.id}` : undefined,
    },
    "piutang": {
      title: "Piutang Project",
      icon: "file-check",
      cards: [
        { icon: "file-check", value: `${project?.hutangPiutang?.filter(h=>h.type==='piutang').length || 0} item`, label: "Jumlah Piutang", bg: "var(--success-light)", color: "var(--success)" },
        { icon: "wallet", value: formatRupiah(project?.budget?.piutang || 0, true), label: "Total Piutang", bg: "var(--primary-light)", color: "var(--primary)" },
        { icon: "clock", value: "Belum Ditagih", label: "Status", bg: "var(--warning-light)", color: "var(--warning-dark)" },
      ],
      list: (project?.hutangPiutang?.filter(h => h.type === 'piutang') || []).map(p => ({
        icon: "file-check",
        title: String(p.name),
        meta: `Jatuh tempo: ${formatDate(p.due)}`,
        value: formatRupiah(p.amount, true),
        bg: "var(--success-light)",
        color: "var(--success)",
        valueColor: "var(--success)",
      })),
      detailRoute: project ? `project/${project.id}` : undefined,
    },
    "hutang": {
      title: "Hutang Project",
      icon: "receipt",
      cards: [
        { icon: "receipt", value: `${project?.hutangPiutang?.filter(h=>h.type==='hutang').length || 0} item`, label: "Jumlah Hutang", bg: "var(--danger-light)", color: "var(--danger)" },
        { icon: "wallet", value: formatRupiah(project?.budget?.hutang || 0, true), label: "Total Hutang", bg: "var(--danger-light)", color: "var(--danger)" },
        { icon: "clock", value: "Segera", label: "Jatuh Tempo", bg: "var(--warning-light)", color: "var(--warning-dark)" },
      ],
      list: (project?.hutangPiutang?.filter(h => h.type === 'hutang') || []).map(h => ({
        icon: "receipt",
        title: String(h.name),
        meta: `Jatuh tempo: ${formatDate(h.due)} • ${h.status === 'overdue' ? 'OVERDUE' : 'Upcoming'}`,
        value: formatRupiah(h.amount, true),
        bg: "var(--danger-light)",
        color: "var(--danger)",
        valueColor: "var(--danger)",
      })),
    },
    "pembayaran": {
      title: "Riwayat Pembayaran / Termin",
      icon: "credit-card",
      cards: [
        { icon: "credit-card", value: `${project?.payments?.length || 0} termin`, label: "Jumlah Termin", bg: "var(--primary-light)", color: "var(--primary)" },
        { icon: "wallet", value: formatRupiah(project?.payments?.reduce((s,p)=>s+p.amount,0)||0, true), label: "Total Diterima", bg: "var(--success-light)", color: "var(--success)" },
        { icon: "trending-up", value: `${(((project?.payments?.reduce((s,p)=>s+p.amount,0)||0)/((project?.contractValue||1))*100)).toFixed(0)}%`, label: "Dari Kontrak", bg: "var(--info-light)", color: "var(--info)" },
      ],
      list: (project?.payments || []).map(p => ({
        icon: "arrow-down-circle",
        title: String(p.name),
        meta: formatDate(p.date),
        value: formatRupiah(p.amount, true),
        bg: "var(--success-light)",
        color: "var(--success)",
        valueColor: "var(--success)",
      })),
    },
    "laba": {
      title: "Estimasi Laba Project",
      icon: "trending-up",
      cards: [
        { icon: "wallet", value: formatRupiah(project?.contractValue||0, true), label: "Nilai Kontrak", bg: "var(--primary-light)", color: "var(--primary)" },
        { icon: "receipt", value: formatRupiah(project?.rap?.realisasi||0, true), label: "Total Biaya", bg: "var(--danger-light)", color: "var(--danger)" },
        { icon: "trending-up", value: formatRupiah(project?.rap?.estLaba||0, true), label: "Est. Laba", bg: "var(--success-light)", color: "var(--success)" },
      ],
      list: [
        { icon: "wallet", title: "Nilai Kontrak", meta: "Pendapatan bruto", value: formatRupiah(project?.contractValue||0, true), valueColor: "var(--primary)" },
        { icon: "package", title: "Biaya Material", meta: "Total pengeluaran bahan", value: `- ${formatRupiah(project?.budget?.bahan?.actual||0, true)}`, valueColor: "var(--danger)" },
        { icon: "hard-hat", title: "Biaya Tenaga", meta: "Total upah tukang", value: `- ${formatRupiah(project?.budget?.tukang?.actual||0, true)}`, valueColor: "var(--danger)" },
        { icon: "trending-up", title: "Estimasi Laba", meta: "Margin bersih", value: formatRupiah(project?.rap?.estLaba||0, true), valueColor: "var(--success)" },
      ],
    },
    "saldo": {
      title: "Saldo Project",
      icon: "wallet",
      cards: [
        { icon: "wallet", value: formatRupiah(project?.saldo||0, true), label: "Saldo Tersedia", bg: "var(--success-light)", color: "var(--success)" },
        { icon: "arrow-down-circle", value: formatRupiah(project?.payments?.reduce((s,p)=>s+p.amount,0)||0, true), label: "Total Masuk", bg: "var(--primary-light)", color: "var(--primary)" },
        { icon: "arrow-up-circle", value: formatRupiah((project?.budget?.bahan?.actual||0)+(project?.budget?.tukang?.actual||0), true), label: "Total Keluar", bg: "var(--danger-light)", color: "var(--danger)" },
      ],
      list: [...(project?.payments||[]), ...(project?.expenses||[])].slice(0,5).map(tx => ({
        icon: tx.type === 'in' ? 'arrow-down-circle' : 'arrow-up-circle',
        title: String(tx.name),
        meta: formatDate(tx.date),
        value: `${tx.type === 'in' ? '+' : '-'} ${formatRupiah(tx.amount, true)}`,
        bg: tx.type === 'in' ? "var(--success-light)" : "var(--danger-light)",
        color: tx.type === 'in' ? "var(--success)" : "var(--danger)",
        valueColor: tx.type === 'in' ? "var(--success)" : "var(--danger)",
      })),
    },
    "kas-bisnis": {
      title: "Kas Bisnis",
      icon: "wallet",
      cards: [
        { icon: "wallet", value: formatRupiah(biz.totalKas, true), label: "Total Kas", bg: "var(--primary-light)", color: "var(--primary)" },
        { icon: "landmark", value: `${biz.accounts.length} akun`, label: "Jumlah Akun", bg: "var(--success-light)", color: "var(--success)" },
        { icon: "trending-up", value: "+18%", label: "Pertumbuhan", bg: "var(--info-light)", color: "var(--info)" },
      ],
      list: biz.accounts.map(acc => ({
        icon: acc.icon,
        title: acc.name,
        meta: "Akun aktif",
        value: formatRupiah(acc.balance, true),
        bg: "var(--primary-light)",
        color: "var(--primary)",
        valueColor: "var(--primary)",
      })),
      detailRoute: "finance",
    },
    "hutang-bisnis": {
      title: "Hutang Bisnis",
      icon: "receipt",
      cards: [
        { icon: "receipt", value: `${biz.hutangList.length} item`, label: "Jumlah Hutang", bg: "var(--danger-light)", color: "var(--danger)" },
        { icon: "wallet", value: formatRupiah(biz.hutangList.reduce((s,h)=>s+h.amount,0), true), label: "Total Hutang", bg: "var(--danger-light)", color: "var(--danger)" },
        { icon: "clock", value: "3 jatuh tempo", label: "Segera Bayar", bg: "var(--warning-light)", color: "var(--warning-dark)" },
      ],
      list: biz.hutangList.map(h => ({
        icon: h.icon,
        title: h.name,
        meta: `${h.category} • Jatuh tempo: ${formatDate(h.due)}`,
        value: formatRupiah(h.amount, true),
        bg: "var(--danger-light)",
        color: "var(--danger)",
        valueColor: "var(--danger)",
      })),
      detailRoute: "finance",
    },
    "piutang-bisnis": {
      title: "Piutang Bisnis",
      icon: "file-check",
      cards: [
        { icon: "file-check", value: `${biz.piutangList.length} item`, label: "Jumlah Piutang", bg: "var(--success-light)", color: "var(--success)" },
        { icon: "wallet", value: formatRupiah(biz.piutangList.reduce((s,p)=>s+p.amount,0), true), label: "Total Piutang", bg: "var(--success-light)", color: "var(--success)" },
        { icon: "clock", value: "2 aktif", label: "Menunggu", bg: "var(--info-light)", color: "var(--info)" },
      ],
      list: biz.piutangList.map(p => ({
        icon: p.icon,
        title: p.name,
        meta: `${p.category} • Jatuh tempo: ${formatDate(p.due)}`,
        value: formatRupiah(p.amount, true),
        bg: "var(--success-light)",
        color: "var(--success)",
        valueColor: "var(--success)",
      })),
      detailRoute: "finance",
    },
    "aktiva": {
      title: "Total Aktiva",
      icon: "scale",
      cards: [
        { icon: "wallet", value: formatRupiah(biz.totalKas, true), label: "Kas & Bank", bg: "var(--primary-light)", color: "var(--primary)" },
        { icon: "building-2", value: formatRupiah(biz.asetTetap, true), label: "Aset Tetap", bg: "var(--purple-light)", color: "var(--purple)" },
        { icon: "package", value: "15 jt", label: "Persediaan", bg: "var(--success-light)", color: "var(--success)" },
      ],
      list: [
        { icon: "wallet", title: "Kas & Bank", meta: "4 akun", value: formatRupiah(biz.totalKas, true), valueColor: "var(--primary)" },
        { icon: "file-check", title: "Piutang Klien", meta: "2 klien", value: formatRupiah(biz.piutangList.reduce((s,p)=>s+p.amount,0), true), valueColor: "var(--success)" },
        { icon: "package", title: "Persediaan", meta: "Sisa material", value: "Rp 15jt", valueColor: "var(--gray-800)" },
        { icon: "building-2", title: "Aset Tetap", meta: "5 item", value: formatRupiah(biz.asetTetap, true), valueColor: "var(--purple)" },
      ],
      detailRoute: "finance",
    },
    "pasiva": {
      title: "Total Pasiva",
      icon: "landmark",
      cards: [
        { icon: "receipt", value: formatRupiah(biz.totalHutang, true), label: "Total Hutang", bg: "var(--danger-light)", color: "var(--danger)" },
        { icon: "wallet", value: formatRupiah(biz.ekuitas, true), label: "Ekuitas", bg: "var(--success-light)", color: "var(--success)" },
        { icon: "trending-up", value: formatRupiah(biz.labaDitahan, true), label: "Laba Ditahan", bg: "var(--primary-light)", color: "var(--primary)" },
      ],
      list: [
        { icon: "receipt", title: "Total Hutang", meta: "Kewajiban", value: formatRupiah(biz.totalHutang, true), valueColor: "var(--danger)" },
        { icon: "wallet", title: "Modal Disetor", meta: "Ekuitas awal", value: formatRupiah(biz.modal, true), valueColor: "var(--primary)" },
        { icon: "trending-up", title: "Laba Ditahan", meta: "Akumulasi", value: formatRupiah(biz.labaDitahan, true), valueColor: "var(--success)" },
      ],
      detailRoute: "finance",
    },
    "ekuitas": {
      title: "Ekuitas",
      icon: "wallet",
      cards: [
        { icon: "wallet", value: formatRupiah(biz.modal, true), label: "Modal", bg: "var(--primary-light)", color: "var(--primary)" },
        { icon: "trending-up", value: formatRupiah(biz.labaDitahan, true), label: "Laba Ditahan", bg: "var(--success-light)", color: "var(--success)" },
        { icon: "scale", value: formatRupiah(biz.ekuitas, true), label: "Total Ekuitas", bg: "var(--purple-light)", color: "var(--purple)" },
      ],
      list: [
        { icon: "wallet", title: "Modal Awal", meta: "Setoran modal", value: formatRupiah(biz.modal, true), valueColor: "var(--primary)" },
        { icon: "trending-up", title: "Laba Ditahan", meta: "Akumulasi laba", value: formatRupiah(biz.labaDitahan, true), valueColor: "var(--success)" },
      ],
      detailRoute: "finance",
    },
    "laba-bisnis": {
      title: "Laba Ditahan Bisnis",
      icon: "trending-up",
      cards: [
        { icon: "trending-up", value: formatRupiah(biz.labaDitahan, true), label: "Laba Ditahan", bg: "var(--success-light)", color: "var(--success)" },
        { icon: "percent", value: `${(biz.labaDitahan/biz.totalAktiva*100).toFixed(1)}%`, label: "Margin", bg: "var(--primary-light)", color: "var(--primary)" },
        { icon: "folder-kanban", value: `${state.data.projects.length} project`, label: "Dari Proyek", bg: "var(--info-light)", color: "var(--info)" },
      ],
      list: state.data.projects.map(p => ({
        icon: "briefcase",
        title: p.name,
        meta: p.client,
        value: formatRupiah(p.rap?.estLaba||0, true),
        valueColor: "var(--success)",
      })),
      detailRoute: "finance",
    },
  };

  return configs[type] || {
    title: "Detail",
    icon: "info",
    cards: [],
    list: [],
  };
}

function closePopup(): void {
  if (currentPopup) {
    currentPopup.remove();
    currentPopup = null;
  }
}

// ===== MODAL SYSTEM =====
let currentModal: HTMLElement | null = null;

function openModal(type: string): void {
  closeModal();
  closePopup();

  let html = "";
  switch (type) {
    case "tambah-transaksi": html = modalTambahTransaksi(); break;
    case "tambah-item-rap": html = modalTambahItemRap(); break;
    case "lapor-progress": html = modalLaporProgress(); break;
    case "generate-rap": html = modalGenerateRap(); break;
    case "transfer-bahan": html = modalTransferBahan(); break;
    case "tambah-database": html = modalTambahDatabase(); break;
    case "tambah-project": html = modalTambahProject(); break;
    default: html = `<div class="modal-backdrop" id="main-modal" onclick="if(event.target===this)APP.closeModal()">
      <div class="modal-dialog" onclick="event.stopPropagation()">
        <div class="modal-header">
          <div class="modal-title">${type}</div>
          <button class="modal-close" onclick="APP.closeModal()"><i data-lucide="x"></i></button>
        </div>
        <div class="modal-body"><p>Modal ${type} coming soon</p></div>
      </div>
    </div>`;
  }

  const container = document.getElementById("modal-container");
  if (container) {
    container.innerHTML = html;
    currentModal = container.firstElementChild as HTMLElement;
    initLucideIcons();
    setupModalInteractions(type);
  }
}

function closeModal(): void {
  const container = document.getElementById("modal-container");
  if (container) container.innerHTML = "";
  currentModal = null;
}

function setupModalInteractions(type: string): void {
  if (type === "tambah-project") {
    setupMultiStepModal();
  }
  if (type === "generate-rap") {
    setupGenerateRapModal();
  }
  if (type === "tambah-transaksi") {
    setupTransaksiToggle();
  }
  if (type === "tambah-item-rap") {
    setupAutoSuggest();
  }
}

// ===== MODALS =====
function modalTambahTransaksi(): string {
  return `
  <div class="modal-backdrop" id="main-modal" onclick="if(event.target===this)APP.closeModal()">
    <div class="modal-dialog" onclick="event.stopPropagation()">
      <div class="modal-header">
        <div class="modal-title"><i data-lucide="arrow-left-right"></i> Tambah Transaksi</div>
        <button class="modal-close" onclick="APP.closeModal()"><i data-lucide="x"></i></button>
      </div>
      <div class="modal-body">
        <div style="display:flex;gap:8px;margin-bottom:20px;background:var(--gray-100);border-radius:var(--radius-md);padding:4px;">
          <button id="tx-out-btn" class="btn" style="flex:1;background:var(--danger);color:white;border-radius:var(--radius-sm);" onclick="APP.setTxType('out')">
            <i data-lucide="arrow-up-circle"></i>Pengeluaran
          </button>
          <button id="tx-in-btn" class="btn btn-ghost" style="flex:1;" onclick="APP.setTxType('in')">
            <i data-lucide="arrow-down-circle"></i>Pemasukan
          </button>
        </div>
        <div class="input-group">
          <label class="input-label">Kategori</label>
          <select class="input select">
            <option>Material / Bahan</option>
            <option>Tukang / Tenaga</option>
            <option>Operasional</option>
            <option>Termin / Pembayaran</option>
            <option>Sewa Alat</option>
            <option>Lainnya</option>
          </select>
        </div>
        <div class="input-group autosuggest-wrap" id="tx-nama-wrap">
          <label class="input-label">Deskripsi</label>
          <input class="input" type="text" id="tx-nama" placeholder="Ketik nama bahan/pekerjaan..." oninput="APP.handleAutoSuggest(this.value, 'tx-suggest')" autocomplete="off" />
          <div id="tx-suggest" class="autosuggest-dropdown" style="display:none;"></div>
        </div>
        <div class="input-group">
          <label class="input-label">Nominal (Rp)</label>
          <div class="input-with-icon">
            <div class="input-icon"><i data-lucide="wallet"></i></div>
            <input class="input" type="number" placeholder="0" id="tx-nominal" />
          </div>
        </div>
        <div class="input-group">
          <label class="input-label">Tanggal</label>
          <input class="input" type="date" value="${new Date().toISOString().split('T')[0]}" />
        </div>
        <div class="input-group">
          <label class="input-label">Catatan (opsional)</label>
          <input class="input" type="text" placeholder="Catatan tambahan..." />
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="APP.closeModal()">Batal</button>
        <button class="btn btn-primary" onclick="APP.saveTransaksi()">
          <i data-lucide="save"></i>Simpan Transaksi
        </button>
      </div>
    </div>
  </div>
  `;
}

function modalTambahItemRap(): string {
  return `
  <div class="modal-backdrop" id="main-modal" onclick="if(event.target===this)APP.closeModal()">
    <div class="modal-dialog" onclick="event.stopPropagation()">
      <div class="modal-header">
        <div class="modal-title"><i data-lucide="plus"></i> Tambah Item RAP</div>
        <button class="modal-close" onclick="APP.closeModal()"><i data-lucide="x"></i></button>
      </div>
      <div class="modal-body">
        <div class="input-group autosuggest-wrap">
          <label class="input-label">Nama Item</label>
          <input class="input" type="text" id="rap-nama" placeholder="Ketik nama bahan/tenaga..." 
                 oninput="APP.handleAutoSuggest(this.value, 'rap-suggest')" autocomplete="off" />
          <div id="rap-suggest" class="autosuggest-dropdown" style="display:none;"></div>
        </div>
        <div class="grid-2" style="gap:12px;">
          <div class="input-group">
            <label class="input-label">Satuan</label>
            <input class="input" type="text" id="rap-satuan" placeholder="Sak, m3, hari..." />
          </div>
          <div class="input-group">
            <label class="input-label">Jumlah (Plan)</label>
            <input class="input" type="number" id="rap-qty" placeholder="0" oninput="APP.calcRapSubtotal()" />
          </div>
        </div>
        <div class="grid-2" style="gap:12px;">
          <div class="input-group">
            <label class="input-label">Harga Satuan (Rp)</label>
            <input class="input" type="number" id="rap-harga" placeholder="0" oninput="APP.calcRapSubtotal()" />
          </div>
          <div class="input-group">
            <label class="input-label">Subtotal</label>
            <div class="input" id="rap-subtotal" style="background:var(--gray-50);font-weight:800;color:var(--primary);">Rp 0</div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="APP.closeModal()">Batal</button>
        <button class="btn btn-primary" onclick="APP.showToast('Item berhasil ditambahkan!', 'success');APP.closeModal()">
          <i data-lucide="save"></i>Simpan Item
        </button>
      </div>
    </div>
  </div>
  `;
}

function modalLaporProgress(): string {
  return `
  <div class="modal-backdrop" id="main-modal" onclick="if(event.target===this)APP.closeModal()">
    <div class="modal-dialog" onclick="event.stopPropagation()">
      <div class="modal-header">
        <div class="modal-title"><i data-lucide="activity"></i> Lapor Progress</div>
        <button class="modal-close" onclick="APP.closeModal()"><i data-lucide="x"></i></button>
      </div>
      <div class="modal-body">
        <div class="input-group">
          <label class="input-label">Item Pekerjaan</label>
          <select class="input select">
            <option>Struktur & Sloof</option>
            <option>Dinding & Plester</option>
            <option>Finishing</option>
          </select>
        </div>
        <div class="input-group">
          <label class="input-label">Progress (%)</label>
          <div style="text-align:center;margin-bottom:12px;">
            <div id="progress-value" style="font-size:48px;font-weight:900;color:var(--primary);">65</div>
            <div style="font-size:12px;color:var(--gray-400)">%</div>
          </div>
          <input type="range" min="0" max="100" value="65" style="width:100%;accent-color:var(--primary);" 
                 oninput="document.getElementById('progress-value').textContent=this.value" />
        </div>
        <div class="input-group">
          <label class="input-label">Catatan</label>
          <textarea class="input" rows="3" placeholder="Deskripsi pekerjaan hari ini..."></textarea>
        </div>
        <div class="input-group">
          <label class="input-label">Kendala (opsional)</label>
          <input class="input" type="text" placeholder="Kendala yang dihadapi..." />
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="APP.closeModal()">Batal</button>
        <button class="btn btn-success" onclick="APP.showToast('Progress berhasil dilaporkan!', 'success');APP.closeModal()">
          <i data-lucide="check-circle-2"></i>Simpan Progress
        </button>
      </div>
    </div>
  </div>
  `;
}

function modalGenerateRap(): string {
  const db = state.data.database;
  const categories = ["Interior", "Konstruksi", "Renovasi"];
  
  return `
  <div class="modal-backdrop" id="main-modal" onclick="if(event.target===this)APP.closeModal()">
    <div class="modal-dialog" onclick="event.stopPropagation()" style="max-width:640px;">
      <div class="modal-header">
        <div class="modal-title"><i data-lucide="sparkles"></i> Generate RAP dari Template</div>
        <button class="modal-close" onclick="APP.closeModal()"><i data-lucide="x"></i></button>
      </div>
      <div class="modal-body">
        <div class="input-group">
          <label class="input-label">Pilih Kategori</label>
          <select class="input select" id="gen-category" onchange="APP.updateGenProducts()">
            <option value="">-- Pilih Kategori --</option>
            ${categories.map(c => `<option value="${c}">${c}</option>`).join("")}
          </select>
        </div>
        <div class="input-group">
          <label class="input-label">Pilih Produk / Pekerjaan</label>
          <select class="input select" id="gen-product" onchange="APP.updateGenPreview()">
            <option value="">-- Pilih Produk --</option>
          </select>
        </div>
        <div class="grid-2" style="gap:12px;">
          <div class="input-group">
            <label class="input-label">Volume / Jumlah</label>
            <input class="input" type="number" id="gen-volume" placeholder="0" oninput="APP.updateGenPreview()" />
          </div>
          <div class="input-group">
            <label class="input-label">Satuan</label>
            <div class="input" id="gen-unit" style="background:var(--gray-50);color:var(--gray-500);">-</div>
          </div>
        </div>
        <div id="gen-preview" style="display:none;">
          <div style="font-weight:700;margin-bottom:10px;display:flex;align-items:center;gap:8px;">
            <i data-lucide="list" style="width:16px;height:16px;"></i>
            Preview Item (toggle ON/OFF)
          </div>
          <div id="gen-items-list" style="border:1px solid var(--gray-200);border-radius:var(--radius-lg);overflow:hidden;"></div>
          <div id="gen-summary" style="margin-top:16px;padding:14px;background:var(--success-light);border-radius:var(--radius-lg);"></div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="APP.closeModal()">Batal</button>
        <button class="btn btn-primary" onclick="APP.executeGenerateRap()">
          <i data-lucide="sparkles"></i>Generate RAP
        </button>
      </div>
    </div>
  </div>
  `;
}

function modalTransferBahan(): string {
  return `
  <div class="modal-backdrop" id="main-modal" onclick="if(event.target===this)APP.closeModal()">
    <div class="modal-dialog" onclick="event.stopPropagation()">
      <div class="modal-header">
        <div class="modal-title"><i data-lucide="arrow-left-right"></i> Transfer Bahan</div>
        <button class="modal-close" onclick="APP.closeModal()"><i data-lucide="x"></i></button>
      </div>
      <div class="modal-body">
        <div class="input-group">
          <label class="input-label">Dari Project</label>
          <div class="input" style="background:var(--gray-50);">
            ${state.data.projects.find(p => p.id === state.currentProjectId)?.name || 'Project'}
          </div>
        </div>
        <div style="text-align:center;margin:8px 0;"><i data-lucide="arrow-down" style="color:var(--gray-400);"></i></div>
        <div class="input-group">
          <label class="input-label">Ke Project</label>
          <select class="input select">
            ${state.data.projects.filter(p => p.id !== state.currentProjectId).map(p => `<option>${p.name}</option>`).join("")}
          </select>
        </div>
        <div class="input-group autosuggest-wrap">
          <label class="input-label">Bahan / Material</label>
          <input class="input" type="text" id="transfer-bahan" placeholder="Pilih bahan..." 
                 oninput="APP.handleAutoSuggest(this.value, 'transfer-suggest')" autocomplete="off" />
          <div id="transfer-suggest" class="autosuggest-dropdown" style="display:none;"></div>
        </div>
        <div class="grid-2" style="gap:12px;">
          <div class="input-group">
            <label class="input-label">Jumlah</label>
            <input class="input" type="number" placeholder="0" />
          </div>
          <div class="input-group">
            <label class="input-label">Harga / unit</label>
            <input class="input" type="number" placeholder="0" />
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="APP.closeModal()">Batal</button>
        <button class="btn btn-primary" onclick="APP.showToast('Transfer berhasil dicatat!', 'success');APP.closeModal()">
          <i data-lucide="arrow-left-right"></i>Transfer
        </button>
      </div>
    </div>
  </div>
  `;
}

function modalTambahDatabase(): string {
  return `
  <div class="modal-backdrop" id="main-modal" onclick="if(event.target===this)APP.closeModal()">
    <div class="modal-dialog" onclick="event.stopPropagation()">
      <div class="modal-header">
        <div class="modal-title"><i data-lucide="database"></i> Tambah ke Database</div>
        <button class="modal-close" onclick="APP.closeModal()"><i data-lucide="x"></i></button>
      </div>
      <div class="modal-body">
        <div class="input-group">
          <label class="input-label">Nama Bahan</label>
          <input class="input" type="text" placeholder="Nama bahan material..." />
        </div>
        <div class="grid-2" style="gap:12px;">
          <div class="input-group">
            <label class="input-label">Kategori</label>
            <select class="input select">
              <option>Struktur</option><option>Penutup</option><option>Finishing</option>
              <option>Campuran</option><option>Perekat</option><option>Hardware</option>
              <option>Plumbing</option>
            </select>
          </div>
          <div class="input-group">
            <label class="input-label">Satuan</label>
            <select class="input select">
              <option>Sak</option><option>m2</option><option>m3</option>
              <option>Pcs</option><option>Batang</option><option>Lembar</option>
              <option>Kg</option><option>Kaleng</option><option>Unit</option>
            </select>
          </div>
        </div>
        <div class="input-group">
          <label class="input-label">Harga Standar (Rp)</label>
          <input class="input" type="number" placeholder="0" />
        </div>
        <div class="input-group">
          <label class="input-label">Vendor (opsional)</label>
          <input class="input" type="text" placeholder="Nama toko/supplier..." />
        </div>
        <div class="input-group">
          <label class="input-label">Spesifikasi (opsional)</label>
          <textarea class="input" rows="2" placeholder="Detail spesifikasi..."></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="APP.closeModal()">Batal</button>
        <button class="btn btn-primary" onclick="APP.showToast('Data berhasil disimpan!', 'success');APP.closeModal()">
          <i data-lucide="save"></i>Simpan ke Database
        </button>
      </div>
    </div>
  </div>
  `;
}

function modalTambahProject(): string {
  return `
  <div class="modal-backdrop" id="main-modal" onclick="if(event.target===this)APP.closeModal()">
    <div class="modal-dialog" onclick="event.stopPropagation()" style="max-width:640px;">
      <div class="modal-header">
        <div class="modal-title"><i data-lucide="plus"></i> Tambah Project Baru</div>
        <button class="modal-close" onclick="APP.closeModal()"><i data-lucide="x"></i></button>
      </div>
      <div class="modal-body">
        <!-- Step Indicator -->
        <div class="step-indicator" id="step-indicator">
          <div class="step-item">
            <div class="step-circle active" id="step-1-circle">1</div>
            <span class="step-label active" id="step-1-label">Info Dasar</span>
          </div>
          <div class="step-line" id="step-line-1"></div>
          <div class="step-item">
            <div class="step-circle" id="step-2-circle">2</div>
            <span class="step-label" id="step-2-label">Produk</span>
          </div>
          <div class="step-line" id="step-line-2"></div>
          <div class="step-item">
            <div class="step-circle" id="step-3-circle">3</div>
            <span class="step-label" id="step-3-label">Preview</span>
          </div>
        </div>

        <!-- Step 1 -->
        <div id="modal-step-1">
          <div class="input-group">
            <label class="input-label">Nama Project</label>
            <input class="input" type="text" id="new-proj-name" placeholder="cth: Project Anggrek..." />
          </div>
          <div class="input-group autosuggest-wrap">
            <label class="input-label">Klien</label>
            <input class="input" type="text" id="new-proj-client" placeholder="Nama klien..." />
          </div>
          <div class="grid-2" style="gap:12px;">
            <div class="input-group">
              <label class="input-label">Tanggal Mulai</label>
              <input class="input" type="date" id="new-proj-start" value="${new Date().toISOString().split('T')[0]}" />
            </div>
            <div class="input-group">
              <label class="input-label">Tanggal Selesai</label>
              <input class="input" type="date" id="new-proj-end" />
            </div>
          </div>
          <div class="input-group">
            <label class="input-label">Nilai Kontrak (Rp)</label>
            <div class="input-with-icon">
              <div class="input-icon"><i data-lucide="wallet"></i></div>
              <input class="input" type="number" id="new-proj-nilai" placeholder="0" />
            </div>
          </div>
          <div class="input-group">
            <label class="input-label">Catatan (opsional)</label>
            <textarea class="input" rows="2" placeholder="Deskripsi atau catatan project..."></textarea>
          </div>
        </div>

        <!-- Step 2 -->
        <div id="modal-step-2" style="display:none;">
          <div style="font-size:13px;color:var(--gray-400);margin-bottom:16px;">
            Pilih kategori dan produk pekerjaan untuk generate RAP & Progress secara otomatis
          </div>
          <div class="category-grid" id="modal-category-grid">
            ${[
              { id: "Interior", icon: "sofa" },
              { id: "Konstruksi", icon: "building-2" },
              { id: "Renovasi", icon: "hammer" },
            ].map(c => `
              <div class="category-check-item" id="cat-${c.id}" onclick="APP.toggleCategory('${c.id}')">
                <i data-lucide="${c.icon}"></i>
                <span>${c.id}</span>
              </div>
            `).join("")}
          </div>
          <div id="modal-products-list"></div>
        </div>

        <!-- Step 3 -->
        <div id="modal-step-3" style="display:none;">
          <div style="margin-bottom:16px;">
            <div style="font-size:14px;font-weight:700;margin-bottom:8px;">Preview RAP yang akan di-generate:</div>
            <div id="modal-rap-preview" style="border:1px solid var(--gray-200);border-radius:var(--radius-lg);overflow:hidden;max-height:300px;overflow-y:auto;"></div>
          </div>
          <div id="modal-rap-summary" style="padding:14px;background:var(--success-light);border-radius:var(--radius-lg);"></div>
        </div>
      </div>
      <div class="modal-footer" id="modal-project-footer">
        <button class="btn btn-outline" onclick="APP.closeModal()">Batal</button>
        <button class="btn btn-primary" id="modal-next-btn" onclick="APP.nextProjectStep()">
          <i data-lucide="arrow-right"></i>Lanjut
        </button>
      </div>
    </div>
  </div>
  `;
}

// ===== MULTI-STEP MODAL =====
let projectStep = 1;
const selectedCategories: Set<string> = new Set();
const selectedProducts: Map<string, {templateId: number; volume: number}> = new Map();

function setupMultiStepModal(): void {
  projectStep = 1;
  selectedCategories.clear();
  selectedProducts.clear();
}

function toggleCategory(catId: string): void {
  const el = document.getElementById(`cat-${catId}`);
  if (selectedCategories.has(catId)) {
    selectedCategories.delete(catId);
    el?.classList.remove("selected");
  } else {
    selectedCategories.add(catId);
    el?.classList.add("selected");
  }
  renderProductsList();
  initLucideIcons();
}

function renderProductsList(): void {
  const container = document.getElementById("modal-products-list");
  if (!container) return;

  const templates = state.data.database.templates;
  let html = "";

  selectedCategories.forEach(cat => {
    const catTemplates = templates.filter(t => t.category === cat);
    if (catTemplates.length === 0) return;
    html += `<div style="margin-bottom:12px;">
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--gray-500);margin-bottom:6px;">${cat}</div>
      <div class="product-list">
        ${catTemplates.map(t => `
          <div class="product-list-item ${selectedProducts.has(`${t.id}`) ? 'selected' : ''}" 
               onclick="APP.toggleProduct(${t.id}, '${t.baseUnit}')">
            <button style="background:none;border:none;cursor:pointer;padding:0;color:${selectedProducts.has(`${t.id}`) ? 'var(--primary)' : 'var(--gray-300)'};">
              <i data-lucide="${selectedProducts.has(`${t.id}`) ? 'check-square' : 'square'}" style="width:18px;height:18px;"></i>
            </button>
            <div class="product-list-item-info">
              <div class="product-list-item-name">${t.name}</div>
              <div class="product-list-item-unit">Per ${t.baseUnit} • ${formatRupiah(t.estSellPerUnit, true)}/unit</div>
            </div>
            ${selectedProducts.has(`${t.id}`) ? `
              <input type="number" class="product-volume-input" value="${selectedProducts.get(`${t.id}`)?.volume || ''}" 
                     placeholder="0" min="0" step="0.5"
                     onclick="event.stopPropagation()"
                     oninput="APP.updateProductVolume(${t.id}, this.value)" />
              <span style="font-size:12px;color:var(--gray-400);">${t.baseUnit}</span>
            ` : ''}
          </div>
        `).join("")}
      </div>
    </div>`;
  });

  container.innerHTML = html || `<div style="color:var(--gray-400);font-size:13px;text-align:center;padding:16px;">Pilih kategori di atas untuk melihat produk</div>`;
  initLucideIcons();
}

function toggleProduct(templateId: number, unit: string): void {
  const key = `${templateId}`;
  if (selectedProducts.has(key)) {
    selectedProducts.delete(key);
  } else {
    selectedProducts.set(key, { templateId, volume: 1 });
  }
  renderProductsList();
}

function updateProductVolume(templateId: number, value: string): void {
  const key = `${templateId}`;
  if (selectedProducts.has(key)) {
    selectedProducts.set(key, { ...(selectedProducts.get(key)!), volume: parseFloat(value) || 0 });
  }
}

function nextProjectStep(): void {
  if (projectStep === 1) {
    projectStep = 2;
    showModalStep(2);
  } else if (projectStep === 2) {
    if (selectedProducts.size === 0) {
      showToast("Pilih minimal 1 produk untuk di-generate", "warning");
      return;
    }
    projectStep = 3;
    renderRapPreview();
    showModalStep(3);
  } else if (projectStep === 3) {
    createProject();
  }
}

function showModalStep(step: number): void {
  [1, 2, 3].forEach(s => {
    const el = document.getElementById(`modal-step-${s}`);
    if (el) el.style.display = s === step ? "block" : "none";
    
    const circle = document.getElementById(`step-${s}-circle`);
    const label = document.getElementById(`step-${s}-label`);
    if (circle && label) {
      if (s < step) {
        circle.className = "step-circle done";
        label.className = "step-label done";
      } else if (s === step) {
        circle.className = "step-circle active";
        label.className = "step-label active";
      } else {
        circle.className = "step-circle";
        label.className = "step-label";
      }
    }
    
    const line = document.getElementById(`step-line-${s}`);
    if (line) {
      line.className = s < step ? "step-line done" : "step-line";
    }
  });

  const nextBtn = document.getElementById("modal-next-btn");
  if (nextBtn) {
    nextBtn.innerHTML = step === 3 
      ? '<i data-lucide="check-circle-2"></i>Buat Project'
      : '<i data-lucide="arrow-right"></i>Lanjut';
  }
  
  if (step > 1) {
    const footer = document.getElementById("modal-project-footer");
    if (footer && !footer.querySelector(".btn-back")) {
      const backBtn = document.createElement("button");
      backBtn.className = "btn btn-ghost btn-back";
      backBtn.innerHTML = '<i data-lucide="arrow-left"></i>Kembali';
      backBtn.onclick = () => {
        projectStep--;
        showModalStep(projectStep);
        initLucideIcons();
      };
      const firstChild = footer.firstChild;
      footer.insertBefore(backBtn, firstChild ? firstChild.nextSibling : null);
    }
  }
  
  initLucideIcons();
}

function renderRapPreview(): void {
  const templates = state.data.database.templates;
  const previewContainer = document.getElementById("modal-rap-preview");
  const summaryContainer = document.getElementById("modal-rap-summary");
  if (!previewContainer || !summaryContainer) return;

  let totalCost = 0;
  let totalSell = 0;
  let allItems: {name: string; qty: string; cost: number; type: string; enabled: boolean}[] = [];

  selectedProducts.forEach((sel, key) => {
    const template = templates.find(t => t.id === sel.templateId);
    if (!template || sel.volume === 0) return;

    template.materials.forEach(m => {
      const qty = Math.ceil(m.qtyPerUnit * sel.volume * 100) / 100;
      const cost = qty * m.price;
      totalCost += cost;
      allItems.push({ name: m.name, qty: `${qty} ${m.unit}`, cost, type: "material", enabled: true });
    });

    template.workers.forEach(w => {
      const days = Math.ceil(w.daysPerUnit * sel.volume * 100) / 100;
      const cost = days * w.rate;
      totalCost += cost;
      allItems.push({ name: w.name, qty: `${days} hari`, cost, type: "worker", enabled: true });
    });

    totalSell += template.estSellPerUnit * sel.volume;
  });

  const laba = totalSell - totalCost;

  previewContainer.innerHTML = allItems.map((item, idx) => `
    <div class="preview-item">
      <div style="display:flex;align-items:center;gap:8px;flex:1;">
        <button class="toggle ${item.enabled ? 'on' : ''}" id="toggle-${idx}" 
                onclick="this.classList.toggle('on')"></button>
        <div style="width:28px;height:28px;border-radius:var(--radius-sm);background:${item.type === 'material' ? 'var(--primary-light)' : 'var(--warning-light)'};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <i data-lucide="${item.type === 'material' ? 'package' : 'hard-hat'}" style="width:14px;height:14px;color:${item.type === 'material' ? 'var(--primary)' : 'var(--warning-dark)'};"></i>
        </div>
        <div class="preview-item-name">${item.name}<div class="preview-item-meta">${item.qty}</div></div>
      </div>
      <div class="preview-item-value">${formatRupiah(item.cost, true)}</div>
    </div>
  `).join("") || '<div style="padding:20px;text-align:center;color:var(--gray-400);">Tidak ada item</div>';

  summaryContainer.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;text-align:center;">
      <div><div style="font-size:11px;color:var(--gray-500);margin-bottom:2px;">Est. Biaya</div><div style="font-weight:800;color:var(--danger);">${formatRupiah(totalCost, true)}</div></div>
      <div><div style="font-size:11px;color:var(--gray-500);margin-bottom:2px;">Est. Jual</div><div style="font-weight:800;color:var(--primary);">${formatRupiah(totalSell, true)}</div></div>
      <div><div style="font-size:11px;color:var(--gray-500);margin-bottom:2px;">Est. Laba</div><div style="font-weight:800;color:var(--success);">${formatRupiah(laba, true)}</div></div>
    </div>
  `;

  initLucideIcons();
}

function createProject(): void {
  const name = (document.getElementById("new-proj-name") as HTMLInputElement)?.value || "Project Baru";
  const client = (document.getElementById("new-proj-client") as HTMLInputElement)?.value || "Klien";
  showToast(`Project "${name}" berhasil dibuat! RAP & Progress auto-generated.`, "success");
  closeModal();
  navigate("projects");
}

// ===== GENERATE RAP MODAL INTERACTIONS =====
function setupGenerateRapModal(): void {
  // initialized in event handlers
}

function updateGenProducts(): void {
  const cat = (document.getElementById("gen-category") as HTMLSelectElement)?.value;
  const productSelect = document.getElementById("gen-product") as HTMLSelectElement;
  if (!productSelect) return;

  const templates = state.data.database.templates.filter(t => t.category === cat);
  productSelect.innerHTML = `<option value="">-- Pilih Produk --</option>` + 
    templates.map(t => `<option value="${t.id}">${t.name}</option>`).join("");
  
  document.getElementById("gen-preview")!.style.display = "none";
}

function updateGenPreview(): void {
  const templateId = parseInt((document.getElementById("gen-product") as HTMLSelectElement)?.value || "0");
  const volume = parseFloat((document.getElementById("gen-volume") as HTMLInputElement)?.value || "0");
  
  if (!templateId || volume <= 0) return;

  const template = state.data.database.templates.find(t => t.id === templateId);
  if (!template) return;

  (document.getElementById("gen-unit") as HTMLElement).textContent = template.baseUnit;
  document.getElementById("gen-preview")!.style.display = "block";

  let totalCost = 0;
  let items: string[] = [];

  template.materials.forEach(m => {
    const qty = Math.ceil(m.qtyPerUnit * volume * 100) / 100;
    const cost = qty * m.price;
    totalCost += cost;
    items.push(`<div class="preview-item">
      <div class="toggle on" style="margin-right:8px;"></div>
      <div class="preview-item-name" style="flex:1">${m.name}<div class="preview-item-meta">${qty} ${m.unit} x ${formatRupiah(m.price)}</div></div>
      <div class="preview-item-value">${formatRupiah(cost, true)}</div>
    </div>`);
  });

  template.workers.forEach(w => {
    const days = Math.ceil(w.daysPerUnit * volume * 100) / 100;
    const cost = days * w.rate;
    totalCost += cost;
    items.push(`<div class="preview-item">
      <div class="toggle on" style="margin-right:8px;"></div>
      <div class="preview-item-name" style="flex:1">${w.name}<div class="preview-item-meta">${days} hari x ${formatRupiah(w.rate)}</div></div>
      <div class="preview-item-value">${formatRupiah(cost, true)}</div>
    </div>`);
  });

  const estSell = template.estSellPerUnit * volume;
  const laba = estSell - totalCost;

  (document.getElementById("gen-items-list") as HTMLElement).innerHTML = items.join("");
  (document.getElementById("gen-summary") as HTMLElement).innerHTML = `
    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;">
      <span><strong>Est. Biaya:</strong> <span style="color:var(--danger)">${formatRupiah(totalCost, true)}</span></span>
      <span><strong>Est. Jual:</strong> <span style="color:var(--primary)">${formatRupiah(estSell, true)}</span></span>
      <span><strong>Est. Laba:</strong> <span style="color:var(--success)">${formatRupiah(laba, true)}</span></span>
    </div>
  `;
  initLucideIcons();
}

function executeGenerateRap(): void {
  showToast("RAP berhasil di-generate dari template!", "success");
  closeModal();
}

// ===== TRANSAKSI TOGGLE =====
function setupTransaksiToggle(): void {
  // initialized via onclick attrs
}

function setTxType(type: string): void {
  const outBtn = document.getElementById("tx-out-btn");
  const inBtn = document.getElementById("tx-in-btn");
  if (!outBtn || !inBtn) return;

  if (type === "out") {
    outBtn.style.cssText = "flex:1;background:var(--danger);color:white;border-radius:var(--radius-sm);";
    inBtn.className = "btn btn-ghost";
    inBtn.style.cssText = "flex:1;";
  } else {
    inBtn.style.cssText = "flex:1;background:var(--success);color:white;border-radius:var(--radius-sm);";
    outBtn.className = "btn btn-ghost";
    outBtn.style.cssText = "flex:1;";
  }
}

function saveTransaksi(): void {
  const nama = (document.getElementById("tx-nama") as HTMLInputElement)?.value;
  const nominal = (document.getElementById("tx-nominal") as HTMLInputElement)?.value;
  if (!nama || !nominal) {
    showToast("Isi nama dan nominal transaksi", "warning");
    return;
  }
  showToast("Transaksi berhasil disimpan!", "success");
  closeModal();
}

// ===== AUTO SUGGEST =====
function setupAutoSuggest(): void {
  // initialized via oninput attrs
}

function handleAutoSuggest(query: string, dropdownId: string): void {
  const dropdown = document.getElementById(dropdownId);
  if (!dropdown) return;

  if (!query || query.length < 1) {
    dropdown.style.display = "none";
    return;
  }

  const materials = state.data.database.materials;
  const filtered = materials.filter(m => fuzzyMatch(query, m.name)).slice(0, 8);

  if (filtered.length === 0 && query.length < 2) {
    dropdown.style.display = "none";
    return;
  }

  dropdown.innerHTML = `
    ${filtered.map(m => `
      <div class="autosuggest-item" onclick="APP.selectSuggestion('${m.name}', '${m.unit}', ${m.price}, '${dropdownId}')">
        <div class="autosuggest-item-icon"><i data-lucide="${m.icon}" style="width:15px;height:15px;color:var(--gray-500);"></i></div>
        <div style="flex:1;">
          <div class="autosuggest-item-name">${m.name}</div>
          <div class="autosuggest-item-meta">${formatRupiah(m.price)}/${m.unit} • Stock: ${m.stock > 0 ? m.stock + ' ' + m.unit : 'Habis'}</div>
        </div>
        ${m.usedIn > 5 ? '<div class="autosuggest-ranked" title="Sering dipakai"></div>' : ''}
      </div>
    `).join("")}
    <div class="autosuggest-item create-new" onclick="APP.createNewSuggestion('${query}', '${dropdownId}')">
      <i data-lucide="plus" style="width:15px;height:15px;"></i>
      Buat baru: "${query}"
    </div>
  `;
  dropdown.style.display = "block";
  initLucideIcons();
}

function selectSuggestion(name: string, unit: string, price: number, dropdownId: string): void {
  const dropdown = document.getElementById(dropdownId);
  if (!dropdown) return;
  dropdown.style.display = "none";

  // Try to fill related inputs
  const wrap = dropdown.parentElement;
  const nameInput = wrap?.querySelector("input[type=text]") as HTMLInputElement;
  if (nameInput) nameInput.value = name;

  // Fill satuan and harga if available
  const satuanInput = document.getElementById("rap-satuan") as HTMLInputElement;
  const hargaInput = document.getElementById("rap-harga") as HTMLInputElement;
  const txNama = document.getElementById("tx-nama") as HTMLInputElement;
  
  if (satuanInput) satuanInput.value = unit;
  if (hargaInput) { hargaInput.value = price.toString(); calcRapSubtotal(); }
  if (txNama && nameInput === txNama) txNama.value = name;

  showToast(`"${name}" dipilih — harga & satuan auto-filled`, "info");
}

function createNewSuggestion(query: string, dropdownId: string): void {
  const dropdown = document.getElementById(dropdownId);
  if (dropdown) dropdown.style.display = "none";
  showToast(`Buat baru "${query}" di Database Master`, "info");
}

function calcRapSubtotal(): void {
  const qty = parseFloat((document.getElementById("rap-qty") as HTMLInputElement)?.value || "0");
  const harga = parseFloat((document.getElementById("rap-harga") as HTMLInputElement)?.value || "0");
  const subtotal = document.getElementById("rap-subtotal");
  if (subtotal) {
    subtotal.textContent = formatRupiah(qty * harga);
  }
}

// ===== ITEM INTERACTIONS =====
function toggleItemCheck(idx: number, projectId: number): void {
  const project = state.data.projects.find(p => p.id === projectId);
  if (!project) return;

  const allItems = [...(project.rap?.materials || []), ...(project.rap?.workers || [])];
  if (allItems[idx]) {
    (allItems[idx] as Record<string, unknown>).checked = !allItems[idx].checked;
    showToolbar(1);
    
    // Update row UI
    const row = document.getElementById(`item-row-${idx}`);
    const checkBtn = row?.querySelector(".item-check-btn");
    if (row && checkBtn) {
      if (allItems[idx].checked) {
        row.classList.add("checked");
        checkBtn.classList.add("checked");
        checkBtn.innerHTML = '<i data-lucide="square-check"></i>';
      } else {
        row.classList.remove("checked");
        checkBtn.classList.remove("checked");
        checkBtn.innerHTML = '<i data-lucide="square"></i>';
      }
      initLucideIcons();
    }
  }
}

function startInlineEdit(el: HTMLElement, idx: number, projectId: number, field: string): void {
  if (el.querySelector("input")) return;
  const currentText = el.textContent || "";
  const input = document.createElement("input");
  input.type = "text";
  input.value = currentText;
  input.className = "inline-input";
  input.style.cssText = `width:${Math.max(100, currentText.length * 8)}px`;

  el.textContent = "";
  el.appendChild(input);
  input.focus();
  input.select();

  const save = () => {
    const newVal = input.value.trim() || currentText;
    el.textContent = newVal;
    showToolbar(1);
  };

  input.addEventListener("blur", save);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { save(); }
    if (e.key === "Escape") { el.textContent = currentText; }
  });
}

// ===== DROPDOWN ITEM MENU =====
function toggleItemDropdown(btn: HTMLElement, idx: number, projectId: number): void {
  closeAllDropdowns();
  
  const overlay = document.getElementById("dropdown-overlay");
  if (overlay) overlay.style.display = "block";

  const menu = document.createElement("div");
  menu.className = "dropdown-menu";
  menu.id = "item-dropdown";
  menu.innerHTML = `
    <button class="dropdown-item" onclick="APP.closeAllDropdowns()"><i data-lucide="pencil"></i>Edit Detail</button>
    <button class="dropdown-item" onclick="APP.closeAllDropdowns();APP.showToast('Item diduplikat','success')"><i data-lucide="copy"></i>Duplikat</button>
    <button class="dropdown-item" onclick="APP.openModal('transfer-bahan');APP.closeAllDropdowns()"><i data-lucide="move"></i>Pindah ke Project Lain</button>
    <button class="dropdown-item" onclick="APP.closeAllDropdowns()"><i data-lucide="trending-up"></i>Riwayat Harga</button>
    <button class="dropdown-item" onclick="APP.closeAllDropdowns()"><i data-lucide="message-square"></i>Tambah Catatan</button>
    <div class="dropdown-divider"></div>
    <button class="dropdown-item" onclick="APP.closeAllDropdowns()"><i data-lucide="archive"></i>Arsipkan</button>
    <button class="dropdown-item danger" onclick="APP.closeAllDropdowns();APP.showToast('Item dihapus','error')"><i data-lucide="trash-2"></i>Hapus</button>
  `;

  const rect = btn.getBoundingClientRect();
  menu.style.cssText = `position:fixed;top:${rect.bottom + 4}px;right:${window.innerWidth - rect.right}px;z-index:300;`;
  document.body.appendChild(menu);
  initLucideIcons();
}

function openItemMenu(type: string, btn: HTMLElement): void {
  closeAllDropdowns();
  const overlay = document.getElementById("dropdown-overlay");
  if (overlay) overlay.style.display = "block";

  const menu = document.createElement("div");
  menu.className = "dropdown-menu";
  menu.innerHTML = `
    <button class="dropdown-item" onclick="APP.closeAllDropdowns()"><i data-lucide="pencil"></i>Edit Project</button>
    <button class="dropdown-item" onclick="APP.closeAllDropdowns()"><i data-lucide="copy"></i>Duplikat</button>
    <button class="dropdown-item" onclick="APP.closeAllDropdowns()"><i data-lucide="share-2"></i>Bagikan</button>
    <div class="dropdown-divider"></div>
    <button class="dropdown-item" onclick="APP.closeAllDropdowns()"><i data-lucide="archive"></i>Arsipkan</button>
    <button class="dropdown-item danger" onclick="APP.closeAllDropdowns()"><i data-lucide="trash-2"></i>Hapus</button>
  `;
  const rect = btn.getBoundingClientRect();
  menu.style.cssText = `position:fixed;top:${rect.bottom + 4}px;right:${window.innerWidth - rect.right}px;z-index:300;`;
  document.body.appendChild(menu);
  initLucideIcons();
}

function closeAllDropdowns(): void {
  document.querySelectorAll(".dropdown-menu").forEach(d => d.remove());
  const overlay = document.getElementById("dropdown-overlay");
  if (overlay) overlay.style.display = "none";
}

// ===== TOOLBAR =====
let toolbarVisible = false;
let changeCount = 0;

function showToolbar(count: number): void {
  changeCount += count;
  let toolbar = document.getElementById("edit-toolbar");
  if (!toolbar) {
    toolbar = document.createElement("div");
    toolbar.className = "edit-toolbar";
    toolbar.id = "edit-toolbar";
    toolbar.innerHTML = `
      <button class="toolbar-btn" onclick="APP.undo()" title="Undo (Ctrl+Z)">
        <i data-lucide="undo-2"></i>
      </button>
      <button class="toolbar-btn" onclick="APP.redo()" title="Redo (Ctrl+Shift+Z)">
        <i data-lucide="redo-2"></i>
      </button>
      <div class="toolbar-divider"></div>
      <span class="toolbar-change-count" id="toolbar-count">${changeCount} perubahan</span>
      <div class="toolbar-divider"></div>
      <button class="toolbar-btn toolbar-save" onclick="APP.saveAllChanges()">
        <i data-lucide="save"></i>Simpan
      </button>
      <button class="toolbar-btn" onclick="APP.discardChanges()">
        <i data-lucide="x"></i>
      </button>
    `;
    document.body.appendChild(toolbar);
    initLucideIcons();
  }

  const countEl = document.getElementById("toolbar-count");
  if (countEl) countEl.textContent = `${changeCount} perubahan`;

  setTimeout(() => toolbar!.classList.add("visible"), 10);
  toolbarVisible = true;
}

function undo(): void {
  if (changeCount > 0) {
    changeCount--;
    const countEl = document.getElementById("toolbar-count");
    if (countEl) countEl.textContent = `${changeCount} perubahan`;
    if (changeCount === 0) discardChanges();
    showToast("Perubahan di-undo", "info");
  }
}

function redo(): void {
  showToast("Redo (tidak ada perubahan)", "info");
}

function saveAllChanges(): void {
  const toolbar = document.getElementById("edit-toolbar");
  if (toolbar) {
    toolbar.classList.remove("visible");
    setTimeout(() => toolbar.remove(), 300);
  }
  changeCount = 0;
  toolbarVisible = false;
  showToast("Semua perubahan disimpan!", "success");
}

function discardChanges(): void {
  const toolbar = document.getElementById("edit-toolbar");
  if (toolbar) {
    toolbar.classList.remove("visible");
    setTimeout(() => toolbar.remove(), 300);
  }
  changeCount = 0;
  toolbarVisible = false;
  showToast("Perubahan dibatalkan", "warning");
}

// ===== TOAST SYSTEM =====
function showToast(message: string, type: "success" | "error" | "warning" | "info" = "info"): void {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const iconMap = { success: "check-circle-2", error: "alert-circle", warning: "alert-triangle", info: "info" };
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i data-lucide="${iconMap[type]}"></i>
    <span style="flex:1">${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()"><i data-lucide="x" style="width:14px;height:14px;"></i></button>
  `;
  container.appendChild(toast);
  initLucideIcons();

  setTimeout(() => {
    toast.style.animation = "toastIn 0.3s ease reverse";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ===== FILTER FUNCTIONS =====
function filterProjects(query: string): void {
  const grid = document.getElementById("projects-grid");
  if (!grid) return;
  const cards = grid.querySelectorAll(".project-card:not(.project-card-add)");
  cards.forEach((card, idx) => {
    const name = state.data.projects[idx]?.name || "";
    (card as HTMLElement).style.display = fuzzyMatch(query, name) ? "" : "none";
  });
}

function setProjectView(view: string): void {
  const grid = document.getElementById("projects-grid");
  if (!grid) return;
  const gridBtn = document.getElementById("grid-view-btn");
  const listBtn = document.getElementById("list-view-btn");
  
  if (view === "grid") {
    grid.className = "grid-3";
    gridBtn?.classList.add("active");
    listBtn?.classList.remove("active");
  } else {
    grid.className = "";
    grid.style.display = "flex";
    grid.style.flexDirection = "column";
    grid.style.gap = "8px";
    gridBtn?.classList.remove("active");
    listBtn?.classList.add("active");
  }
}

function filterDatabase(query: string): void {
  // Filter current tab content
  const rows = document.querySelectorAll(".data-table tbody tr, .vendor-card");
  rows.forEach(row => {
    const text = row.textContent || "";
    (row as HTMLElement).style.display = fuzzyMatch(query, text) ? "" : "none";
  });
}

// ===== TAB SWITCHING =====
function switchProjectTab(tab: string): void {
  state.currentProjectTab = tab;
  const project = state.data.projects.find(p => p.id === state.currentProjectId);
  if (!project) return;

  document.querySelectorAll("#project-tab-nav .tab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-tab") === tab);
  });

  const content = document.getElementById("project-tab-content");
  if (content) {
    content.innerHTML = renderProjectTabContent(project);
    setTimeout(() => {
      setupPageInteractions();
      initLucideIcons();
      renderProjectCharts();
    }, 50);
  }
}

function switchFinanceTab(tab: string): void {
  state.currentFinanceTab = tab;
  const content = document.getElementById("finance-tab-content");
  if (content) {
    content.innerHTML = renderFinanceTabContent();
    setTimeout(() => {
      setupPageInteractions();
      initLucideIcons();
    }, 50);
  }
  
  // Update tab active state
  document.querySelectorAll(".tab-nav .tab-btn").forEach(btn => {
    const btnTab = btn.textContent?.toLowerCase().replace(/\s+/g,'').replace('&','') || '';
    btn.classList.toggle("active", btnTab === tab);
  });
}

function switchDatabaseTab(tab: string): void {
  state.currentDatabaseTab = tab;
  const content = document.getElementById("db-tab-content");
  if (content) {
    content.innerHTML = renderDatabaseTabContent();
    setTimeout(() => {
      setupPageInteractions();
      initLucideIcons();
    }, 50);
  }

  document.querySelectorAll(".tab-nav .tab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.textContent?.toLowerCase().trim() === tab);
  });
}

// ===== SIDEBAR RENDERING =====
function renderSidebar(): void {
  const nav = document.getElementById("sidebar-nav");
  if (!nav) return;

  const navItems = [
    { route: "dashboard", icon: "layout-dashboard", label: "Dashboard" },
    { route: "projects", icon: "folder-kanban", label: "Projects" },
    { route: "finance", icon: "landmark", label: "Keuangan Bisnis" },
    { route: "database", icon: "database", label: "Database" },
  ];

  nav.innerHTML = `
    <div class="nav-section-label">Menu</div>
    ${navItems.map(item => `
      <button class="nav-item ${state.currentRoute === item.route || (state.currentRoute === 'project-detail' && item.route === 'projects') ? 'active' : ''}" 
              data-route="${item.route}"
              onclick="APP.navigate('${item.route}')">
        <i data-lucide="${item.icon}"></i>
        <span>${item.label}</span>
      </button>
    `).join("")}
    <div class="nav-section-label">Tools</div>
    <button class="nav-item" onclick="APP.showToast('Analitik coming soon', 'info')">
      <i data-lucide="bar-chart-3"></i>
      <span>Analitik</span>
    </button>
    <button class="nav-item" onclick="APP.showToast('Pengaturan coming soon', 'info')">
      <i data-lucide="settings"></i>
      <span>Pengaturan</span>
    </button>
  `;
}

function renderBottomNav(): void {
  const nav = document.getElementById("bottom-nav-inner");
  if (!nav) return;

  const navItems = [
    { route: "dashboard", icon: "home", label: "Home" },
    { route: "projects", icon: "folder-kanban", label: "Project" },
    { route: "finance", icon: "landmark", label: "Keuangan" },
    { route: "database", icon: "database", label: "Data" },
    { route: "profile", icon: "user-circle", label: "Profile" },
  ];

  nav.innerHTML = navItems.map(item => `
    <button class="bottom-nav-item ${state.currentRoute === item.route || (state.currentRoute === 'project-detail' && item.route === 'projects') ? 'active' : ''}"
            data-route="${item.route}"
            onclick="${item.route === 'profile' ? `APP.showToast('Profile coming soon','info')` : `APP.navigate('${item.route}')`}">
      <i data-lucide="${item.icon}"></i>
      <span>${item.label}</span>
    </button>
  `).join("");
}

// ===== KEYBOARD SHORTCUTS =====
function setupKeyboardShortcuts(): void {
  document.addEventListener("keydown", (e) => {
    // Ctrl+K - search
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      const search = document.getElementById("global-search");
      search?.focus();
    }
    // Ctrl+Z - undo
    if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
      if (toolbarVisible) { e.preventDefault(); undo(); }
    }
    // Ctrl+Shift+Z - redo
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "z") {
      if (toolbarVisible) { e.preventDefault(); redo(); }
    }
    // Ctrl+S - save
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      if (toolbarVisible) { e.preventDefault(); saveAllChanges(); }
    }
    // Escape - close modal/popup
    if (e.key === "Escape") {
      closeModal();
      closePopup();
      closeAllDropdowns();
    }
  });
}

// ===== SIDEBAR CONTROL (Mobile & Desktop) =====
function setupSidebarControl(): void {
  const menuBtn = document.getElementById("menu-btn");
  const overlay = document.getElementById("sidebar-overlay");
  const sidebar = document.getElementById("sidebar");
  const body = document.body;

  menuBtn?.addEventListener("click", () => {
    if (window.innerWidth < 1024) {
      // Mobile behavior: Open drawer
      sidebar?.classList.add("open");
      overlay?.classList.add("visible");
    } else {
      // Desktop behavior: Toggle collapsed mode
      body.classList.toggle("sidebar-collapsed");
      // Store preference in localStorage
      const isCollapsed = body.classList.contains("sidebar-collapsed");
      localStorage.setItem("sidebarCollapsed", isCollapsed ? "true" : "false");
    }
  });

  overlay?.addEventListener("click", () => {
    sidebar?.classList.remove("open");
    overlay?.classList.remove("visible");
  });

  // Restore desktop preference on load
  if (window.innerWidth >= 1024 && localStorage.getItem("sidebarCollapsed") === "true") {
    body.classList.add("sidebar-collapsed");
  }
}

// ===== SYNC WITH SERVER =====
async function syncWithServer() {
  try {
    const response = await fetch("/api/sync");
    const result = await response.json();
    if (result.error) throw new Error(result.error);
    
    // Update local state with DB data if available
    if (result.projects && result.projects.length > 0) {
      state.data.projects = result.projects;
      // Map other data as needed
    }
    
    renderCurrentPage();
    showToast("Data tersinkronisasi dengan database", "success");
  } catch (err) {
    console.error("Sync failed:", err);
    showToast("Gagal sinkronisasi. Menggunakan data lokal.", "warning");
  }
}

async function persistChange(type: string, data: any) {
  try {
    await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, data })
    });
  } catch (err) {
    console.error("Persist failed:", err);
  }
}

// ===== APP INIT =====
export function initApp(): void {
  // Expose APP globally
  (window as any).APP = {
    navigate,
    openPopup,
    closePopup,
    openModal,
    closeModal,
    showToast,
    switchProjectTab,
    switchFinanceTab,
    switchDatabaseTab,
    toggleItemCheck,
    startInlineEdit,
    toggleItemDropdown,
    openItemMenu,
    closeAllDropdowns,
    showToolbar,
    undo,
    redo,
    saveAllChanges,
    discardChanges,
    filterProjects,
    setProjectView,
    filterDatabase,
    handleAutoSuggest,
    selectSuggestion,
    createNewSuggestion,
    calcRapSubtotal,
    setTxType,
    saveTransaksi,
    nextProjectStep,
    toggleCategory,
    toggleProduct,
    updateProductVolume,
    updateGenProducts,
    updateGenPreview,
    executeGenerateRap,
    syncWithServer,
  };

  // Wait for Lucide to load
  const initWithLucide = () => {
    if (typeof window !== "undefined" && (window as any).lucide) {
      renderSidebar();
      renderBottomNav();
      updateNav();
      setupKeyboardShortcuts();
      setupSidebarControl();
      initLucideIcons();
      
      // Load data from server
      syncWithServer();
    } else {
      setTimeout(initWithLucide, 100);
    }
  };

  initWithLucide();
}
