// =====================================================
// PROJECT PLANNER — Main App Module
// =====================================================

import { APP_DATA } from "./mock-data";
import { formatRupiah, formatDate, fuzzyMatch, debounce, countUp, animateProgress, projectIdJs, projectDetailRoute } from "./utils";
import { mergeApiIntoState } from "./data-sync";
import {
  renderProjectDetailV2,
  renderProjectTabV2,
} from "./project-detail";
import { renderDashboardPage } from "./dashboard";
import { renderProjectsPage } from "./projects";
import { renderFinancePage, renderFinanceTabContent } from "./finance";
import { renderDatabasePage, renderDatabaseTabContent } from "./database";
import { initPopupSystem, openPopup, closePopup } from "./popups";
import { generateRapDraft, draftToCreatePayload } from "./suggestion-engine";
import {
  setProjectDraft,
  getProjectDraft,
  renderDraftPreviewHtml,
  toggleDraftItem,
  updateDraftQty,
  updateDraftPrice,
  addDraftMaterial,
  addDraftWorker,
} from "./create-project-ui";
import { searchMaterials, renderAutosuggestHtml, searchClients } from "./autosuggest";
import {
  validateBusinessBalance,
  validateProjectBalance,
  renderBalanceDiagnosisPanel,
} from "./balance-sheet";

// ===== GLOBAL STATE =====
interface AppState {
  currentRoute: string;
  currentProjectId: number | string | null;
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

type DbFormContext = {
  kind: "material" | "worker";
  editId?: number;
};

let dbFormContext: DbFormContext = { kind: "material" };
let txScope: "bisnis" | "project" = "bisnis";

// ===== ROUTER =====
function navigate(route: string, params?: Record<string, string>): void {
  if (route.startsWith("project/")) {
    const parts = route.split("/").filter(Boolean);
    const idRaw = decodeURIComponent(parts[1] || "");
    state.currentProjectId = /^\d+$/.test(idRaw) ? Number(idRaw) : idRaw;
    state.currentProjectTab = parts[2] || params?.tab || "overview";
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
      view.innerHTML = renderDashboardPage(state);
      break;
    case "projects":
      view.innerHTML = renderProjectsPage(state);
      break;
    case "project-detail":
      view.innerHTML = renderProjectDetailV2(state);
      break;
    case "finance":
      view.innerHTML = renderFinancePage(state);
      break;
    case "database":
      view.innerHTML = renderDatabasePage(state);
      break;
    default:
      view.innerHTML = renderDashboardPage(state);
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
          <button id="tx-scope-bisnis" class="btn" style="flex:1;background:var(--primary);color:white;border-radius:var(--radius-sm);" onclick="APP.setTxScope('bisnis')">
            <i data-lucide="building-2"></i>Bisnis
          </button>
          <button id="tx-scope-project" class="btn btn-ghost" style="flex:1;" onclick="APP.setTxScope('project')">
            <i data-lucide="folder-kanban"></i>Project
          </button>
        </div>
        <div class="input-group" id="tx-project-wrap" style="display:none;">
          <label class="input-label">Project</label>
          <select class="input select" id="tx-project-id">
            <option value="">-- Pilih Project --</option>
            ${state.data.projects.map((p) => `<option value="${p.id}" ${String(p.id) === String(state.currentProjectId) ? "selected" : ""}>${p.name}</option>`).join("")}
          </select>
        </div>
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

function openDatabaseModal(kind?: "material" | "worker", editId?: number): void {
  const tabKind =
    kind ||
    (state.currentDatabaseTab === "tenaga" ? "worker" : "material");
  dbFormContext = { kind: tabKind, editId };
  openModal("tambah-database");
  if (editId) {
    setTimeout(() => fillDatabaseForm(editId), 0);
  }
}

function fillDatabaseForm(editId: number): void {
  const modal = document.getElementById("main-modal");
  if (!modal) return;

  if (dbFormContext.kind === "material") {
    const m = state.data.database.materials.find((x) => x.id === editId);
    if (!m) return;
    (modal.querySelector("#db-add-name") as HTMLInputElement).value = m.name;
    (modal.querySelector("#db-add-category") as HTMLSelectElement).value = m.category;
    (modal.querySelector("#db-add-unit") as HTMLSelectElement).value = m.unit;
    (modal.querySelector("#db-add-price") as HTMLInputElement).value = String(m.price);
    (modal.querySelector("#db-add-vendor") as HTMLInputElement).value = m.vendor || "";
  } else {
    const w = state.data.database.workers.find((x) => x.id === editId);
    if (!w) return;
    (modal.querySelector("#db-add-name") as HTMLInputElement).value = w.name;
    (modal.querySelector("#db-add-level") as HTMLSelectElement).value = w.level;
    (modal.querySelector("#db-add-rate") as HTMLInputElement).value = String(w.rate);
    (modal.querySelector("#db-add-contact") as HTMLInputElement).value = w.contact || "";
  }
}

function modalTambahDatabase(): string {
  const isWorker = dbFormContext.kind === "worker";
  const isEdit = Boolean(dbFormContext.editId);
  const title = isEdit
    ? isWorker
      ? "Edit Tenaga Kerja"
      : "Edit Bahan"
    : isWorker
      ? "Tambah Tenaga Kerja"
      : "Tambah ke Database";

  if (isWorker) {
    return `
  <div class="modal-backdrop" id="main-modal" onclick="if(event.target===this)APP.closeModal()">
    <div class="modal-dialog" onclick="event.stopPropagation()">
      <div class="modal-header">
        <div class="modal-title"><i data-lucide="hard-hat"></i> ${title}</div>
        <button class="modal-close" onclick="APP.closeModal()"><i data-lucide="x"></i></button>
      </div>
      <div class="modal-body">
        <div class="input-group">
          <label class="input-label">Nama Tukang</label>
          <input class="input" type="text" id="db-add-name" placeholder="Nama tukang/helper..." />
        </div>
        <div class="grid-2" style="gap:12px;">
          <div class="input-group">
            <label class="input-label">Level</label>
            <select class="input select" id="db-add-level">
              <option>Ahli</option><option>Mandor</option><option>Menengah</option><option>Helper</option>
            </select>
          </div>
          <div class="input-group">
            <label class="input-label">Tarif (Rp/hari)</label>
            <input class="input" type="number" id="db-add-rate" placeholder="150000" />
          </div>
        </div>
        <div class="input-group">
          <label class="input-label">Kontak (opsional)</label>
          <input class="input" type="text" id="db-add-contact" placeholder="No. HP..." />
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="APP.closeModal()">Batal</button>
        <button class="btn btn-primary" onclick="APP.saveDatabaseItem()">
          <i data-lucide="save"></i>Simpan
        </button>
      </div>
    </div>
  </div>
  `;
  }

  return `
  <div class="modal-backdrop" id="main-modal" onclick="if(event.target===this)APP.closeModal()">
    <div class="modal-dialog" onclick="event.stopPropagation()">
      <div class="modal-header">
        <div class="modal-title"><i data-lucide="database"></i> ${title}</div>
        <button class="modal-close" onclick="APP.closeModal()"><i data-lucide="x"></i></button>
      </div>
      <div class="modal-body">
        <div class="input-group">
          <label class="input-label">Nama Bahan</label>
          <input class="input" type="text" id="db-add-name" placeholder="Nama bahan material..." />
        </div>
        <div class="grid-2" style="gap:12px;">
          <div class="input-group">
            <label class="input-label">Kategori</label>
            <select class="input select" id="db-add-category">
              <option>Struktur</option><option>Penutup</option><option>Finishing</option>
              <option>Campuran</option><option>Perekat</option><option>Hardware</option>
              <option>Plumbing</option><option>Umum</option>
            </select>
          </div>
          <div class="input-group">
            <label class="input-label">Satuan</label>
            <select class="input select" id="db-add-unit">
              <option>Sak</option><option>m2</option><option>m3</option>
              <option>Pcs</option><option>Batang</option><option>Lembar</option>
              <option>Kg</option><option>Kaleng</option><option>Unit</option>
            </select>
          </div>
        </div>
        <div class="input-group">
          <label class="input-label">Harga Standar (Rp)</label>
          <input class="input" type="number" id="db-add-price" placeholder="0" />
        </div>
        <div class="input-group">
          <label class="input-label">Vendor (opsional)</label>
          <input class="input" type="text" id="db-add-vendor" placeholder="Nama toko/supplier..." />
        </div>
        <div class="input-group">
          <label class="input-label">Spesifikasi (opsional)</label>
          <textarea class="input" rows="2" placeholder="Detail spesifikasi..."></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="APP.closeModal()">Batal</button>
        <button class="btn btn-primary" onclick="APP.saveDatabaseItem()">
          <i data-lucide="save"></i>${isEdit ? "Update" : "Simpan ke Database"}
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
            <input class="input" type="text" id="new-proj-client" placeholder="Nama klien..."
              oninput="APP.handleClientSuggest(this.value)" />
            <div id="client-suggest" class="autosuggest-dropdown" style="display:none;"></div>
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

  const selections = Array.from(selectedProducts.entries()).map(([, sel]) => ({
    templateId: sel.templateId,
    volume: sel.volume,
  }));

  const draft = generateRapDraft({
    selections,
    templates,
    materials: state.data.database.materials,
    projects: state.data.projects,
  });

  setProjectDraft(draft);
  const { previewHtml, summaryHtml } = renderDraftPreviewHtml(draft);
  previewContainer.innerHTML = previewHtml;
  summaryContainer.innerHTML = summaryHtml;
  initLucideIcons();
}

async function createProject(): Promise<void> {
  const draft = getProjectDraft();
  if (!draft) {
    showToast("Generate RAP dulu di langkah 3", "warning");
    return;
  }

  const name =
    (document.getElementById("new-proj-name") as HTMLInputElement)?.value?.trim() ||
    "Project Baru";
  const client =
    (document.getElementById("new-proj-client") as HTMLInputElement)?.value?.trim() || "Klien";
  const startDate =
    (document.getElementById("new-proj-start") as HTMLInputElement)?.value ||
    new Date().toISOString().slice(0, 10);
  const endDate =
    (document.getElementById("new-proj-end") as HTMLInputElement)?.value ||
    new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
  const contractValue = Number(
    (document.getElementById("new-proj-nilai") as HTMLInputElement)?.value || draft.totalSell
  );

  const templateNames: string[] = [];
  selectedProducts.forEach((sel) => {
    const t = state.data.database.templates.find((x) => x.id === sel.templateId);
    if (t) templateNames.push(t.name);
  });

  const payload = draftToCreatePayload(draft, {
    name,
    client,
    startDate,
    endDate,
    contractValue,
    type: Array.from(selectedCategories)[0] || "Interior",
    templateNames,
  });

  try {
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "CREATE_PROJECT", data: payload }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Gagal membuat project");

    showToast(`Project "${name}" berhasil dibuat!`, "success");
    closeModal();
    await syncWithServer();
    if (json.projectId) {
      navigate(`project/${json.projectId}/overview`);
    } else {
      navigate("projects");
    }
  } catch (err) {
    console.error("Create project failed:", err);
    showToast("Gagal membuat project", "error");
  }
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
  setTxScope(txScope);
}

function setTxScope(scope: "bisnis" | "project"): void {
  txScope = scope;
  const bisnisBtn = document.getElementById("tx-scope-bisnis");
  const projectBtn = document.getElementById("tx-scope-project");
  const projectWrap = document.getElementById("tx-project-wrap");
  if (!bisnisBtn || !projectBtn) return;

  if (scope === "bisnis") {
    bisnisBtn.style.cssText = "flex:1;background:var(--primary);color:white;border-radius:var(--radius-sm);";
    projectBtn.className = "btn btn-ghost";
    projectBtn.style.cssText = "flex:1;";
    if (projectWrap) projectWrap.style.display = "none";
  } else {
    projectBtn.style.cssText = "flex:1;background:var(--primary);color:white;border-radius:var(--radius-sm);";
    bisnisBtn.className = "btn btn-ghost";
    bisnisBtn.style.cssText = "flex:1;";
    if (projectWrap) projectWrap.style.display = "block";
  }
}

function setTxType(type: string): void {
  currentTxType = type === "in" ? "in" : "out";
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

async function saveTransaksi(): Promise<void> {
  const nama = (document.getElementById("tx-nama") as HTMLInputElement)?.value?.trim();
  const nominal = Number((document.getElementById("tx-nominal") as HTMLInputElement)?.value);
  const kategori =
    (document.querySelector("#main-modal select.input.select") as HTMLSelectElement)?.value ||
    "Umum";
  const tanggal =
    (document.querySelector('#main-modal input[type="date"]') as HTMLInputElement)?.value ||
    new Date().toISOString().slice(0, 10);

  if (!nama || !Number.isFinite(nominal) || nominal <= 0) {
    showToast("Isi nama dan nominal transaksi", "warning");
    return;
  }

  const project =
    txScope === "project"
      ? findProjectById(
          (document.getElementById("tx-project-id") as HTMLSelectElement)?.value ||
            state.currentProjectId
        )
      : null;

  if (txScope === "project" && !project) {
    showToast("Pilih project untuk transaksi project", "warning");
    return;
  }

  if (txScope === "bisnis") {
    const delta = currentTxType === "in" ? nominal : -nominal;
    const projectedKas = state.data.business.totalKas + delta;
    if (projectedKas < 0) {
      showToast("Transaksi ini akan membuat kas negatif — periksa pencatatan", "warning");
      return;
    }
    state.data.business.totalKas = projectedKas;
    if (state.data.business.accounts[0]) {
      state.data.business.accounts[0].balance = Math.max(0, state.data.business.accounts[0].balance + delta);
    }
    const check = validateBusinessBalance(state.data.business);
    showToast("Transaksi bisnis tercatat (kas diperbarui)", "success");
    if (!check.isBalanced) {
      setTimeout(() => {
        showToast(`Neraca tidak balance — selisih ${formatRupiah(Math.abs(check.gap), true)}`, "warning");
      }, 400);
    }
    closeModal();
    if (state.currentRoute === "finance") renderCurrentPage();
    return;
  }

  const activeProject = project!;

  const now = new Date();
  const tx = {
    id: Date.now(),
    type: currentTxType,
    category: currentTxType === "in" ? "Pembayaran" : kategori,
    name: nama,
    amount: nominal,
    date: tanggal,
    time: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
    icon: currentTxType === "in" ? "arrow-down-circle" : "arrow-up-circle",
  };

  if (currentTxType === "in") {
    activeProject.payments.push(tx as (typeof activeProject.payments)[number]);
    activeProject.saldo += nominal;
  } else {
    if (activeProject.saldo - nominal < 0) {
      showToast("Saldo tidak cukup — pertimbangkan catat sebagai hutang vendor", "warning");
    }
    activeProject.expenses.push(tx as (typeof activeProject.expenses)[number]);
    activeProject.saldo = Math.max(0, activeProject.saldo - nominal);
    if (activeProject.budget) {
      const cat = kategori.toLowerCase();
      if (cat.includes("tukang") || cat.includes("tenaga")) {
        activeProject.budget.tukang.actual += nominal;
      } else {
        activeProject.budget.bahan.actual += nominal;
      }
    }
  }

  await persistChange("ADD_TRANSACTION", {
    projectId: activeProject.id,
    type: tx.type,
    category: tx.category,
    name: tx.name,
    amount: tx.amount,
    date: tx.date,
    time: tx.time,
    icon: tx.icon,
  });

  showToast("Transaksi berhasil disimpan!", "success");
  const projCheck = validateProjectBalance(activeProject);
  if (!projCheck.isBalanced) {
    const topIssue = projCheck.issues[0];
    setTimeout(() => {
      showToast(
        topIssue ? topIssue.message.slice(0, 80) : `Neraca tidak balance (${formatRupiah(Math.abs(projCheck.gap), true)})`,
        "warning"
      );
    }, 400);
  }
  closeModal();
  if (state.currentRoute === "project-detail") {
    switchProjectTab(state.currentProjectTab);
  }
}

function handleClientSuggest(query: string): void {
  const dropdown = document.getElementById("client-suggest");
  if (!dropdown) return;
  if (!query || query.length < 1) {
    dropdown.style.display = "none";
    return;
  }
  const fromDb = searchClients(query, {
    materials: state.data.database.materials,
    workers: state.data.database.workers,
    clients: state.data.database.clients,
  });
  const fromProjects = state.data.projects
    .map((p) => p.client)
    .filter((c, i, arr) => c && arr.indexOf(c) === i && c.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 5)
    .map((name, idx) => ({ id: idx, name, phone: "", projectCount: 0, activePiutang: 0, rating: 5 }));

  const merged = [...fromDb, ...fromProjects].slice(0, 8);
  if (!merged.length) {
    dropdown.style.display = "none";
    return;
  }
  dropdown.innerHTML = merged
    .map(
      (c) => `
    <div class="autosuggest-item" onclick="document.getElementById('new-proj-client').value='${String(c.name).replace(/'/g, "\\'")}';document.getElementById('client-suggest').style.display='none';">
      <div class="autosuggest-item-name">${c.name}</div>
    </div>`
    )
    .join("");
  dropdown.style.display = "block";
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

  const items = searchMaterials(query, {
    materials: state.data.database.materials,
    workers: state.data.database.workers,
  });

  if (items.length === 0 && query.length < 2) {
    dropdown.style.display = "none";
    return;
  }

  dropdown.innerHTML = renderAutosuggestHtml(
    items,
    query,
    dropdownId,
    "APP.selectSuggestion"
  );
  dropdown.style.display = "block";
  initLucideIcons();
}

async function createNewSuggestion(query: string, dropdownId: string): Promise<void> {
  const name = query.trim();
  if (!name) return;

  const dropdown = document.getElementById(dropdownId);
  if (dropdown) dropdown.style.display = "none";

  if (dropdownId === "draft-add-suggest") {
    addDraftMaterial({
      key: `manual-${Date.now()}`,
      enabled: true,
      name,
      unit: "Pcs",
      qtyPlan: 1,
      unitPrice: 0,
      source: "manual",
    });
    renderRapPreview();
    return;
  }

  try {
    await persistChange("ADD_MATERIAL", {
      name,
      category: "Umum",
      unit: "Pcs",
      price: 0,
    });
    await syncWithServer();
    showToast(`"${name}" ditambahkan ke Database`, "success");
    const wrap = dropdown?.parentElement;
    const nameInput = wrap?.querySelector("input[type=text]") as HTMLInputElement;
    if (nameInput) nameInput.value = name;
  } catch (err) {
    console.error("createNewSuggestion failed:", err);
    showToast("Gagal menyimpan ke Database", "error");
  }
}

async function saveDatabaseItem(): Promise<void> {
  const modal = document.getElementById("main-modal");
  if (!modal) return;

  const name = (modal.querySelector("#db-add-name") as HTMLInputElement)?.value?.trim();
  if (!name) {
    showToast("Isi nama", "warning");
    return;
  }

  const isEdit = Boolean(dbFormContext.editId);
  const changeType = isEdit
    ? dbFormContext.kind === "material"
      ? "UPDATE_MATERIAL"
      : "UPDATE_WORKER"
    : dbFormContext.kind === "material"
      ? "ADD_MATERIAL"
      : "ADD_WORKER";

  try {
    if (dbFormContext.kind === "material") {
      const category =
        (modal.querySelector("#db-add-category") as HTMLSelectElement)?.value || "Umum";
      const unit = (modal.querySelector("#db-add-unit") as HTMLSelectElement)?.value || "Pcs";
      const price = Number((modal.querySelector("#db-add-price") as HTMLInputElement)?.value || 0);
      const vendor =
        (modal.querySelector("#db-add-vendor") as HTMLInputElement)?.value?.trim() || "";
      await persistChange(changeType, {
        id: dbFormContext.editId,
        name,
        category,
        unit,
        price,
        vendor,
      });
    } else {
      const level =
        (modal.querySelector("#db-add-level") as HTMLSelectElement)?.value || "Menengah";
      const rate = Number((modal.querySelector("#db-add-rate") as HTMLInputElement)?.value || 0);
      const contact =
        (modal.querySelector("#db-add-contact") as HTMLInputElement)?.value?.trim() || "";
      await persistChange(changeType, {
        id: dbFormContext.editId,
        name,
        level,
        rate,
        contact,
      });
    }

    showToast("Data berhasil disimpan!", "success");
    closeModal();
    dbFormContext = { kind: "material" };
    await syncWithServer();
    if (state.currentRoute === "database") renderCurrentPage();
  } catch (err) {
    console.error("saveDatabaseItem failed:", err);
    showToast("Gagal menyimpan", "error");
  }
}

/** @deprecated use saveDatabaseItem */
async function saveDatabaseMaterial(): Promise<void> {
  await saveDatabaseItem();
}

function openDraftAddMaterial(): void {
  const name = prompt("Nama bahan/tukang baru:");
  if (!name?.trim()) return;
  const isWorker = name.toLowerCase().includes("tukang") || name.toLowerCase().includes("helper");
  if (isWorker) {
    addDraftWorker({
      key: `manual-w-${Date.now()}`,
      enabled: true,
      name: name.trim(),
      unit: "Hari",
      qtyPlan: 1,
      unitPrice: 150000,
      source: "manual",
    });
  } else {
    addDraftMaterial({
      key: `manual-m-${Date.now()}`,
      enabled: true,
      name: name.trim(),
      unit: "Pcs",
      qtyPlan: 1,
      unitPrice: 0,
      source: "manual",
    });
  }
  renderRapPreview();
}

function refreshDraftPreview(): void {
  const draft = getProjectDraft();
  if (!draft) return;
  const previewContainer = document.getElementById("modal-rap-preview");
  const summaryContainer = document.getElementById("modal-rap-summary");
  if (!previewContainer || !summaryContainer) return;
  const { previewHtml, summaryHtml } = renderDraftPreviewHtml(draft);
  previewContainer.innerHTML = previewHtml;
  summaryContainer.innerHTML = summaryHtml;
  initLucideIcons();
}

function handleToggleDraftItem(key: string, kind: "material" | "worker" | "timeline"): void {
  toggleDraftItem(key, kind);
  refreshDraftPreview();
}

function handleUpdateDraftQty(key: string, kind: "material" | "worker", value: number): void {
  updateDraftQty(key, kind, value);
  refreshDraftPreview();
}

function handleUpdateDraftPrice(key: string, kind: "material" | "worker", value: number): void {
  updateDraftPrice(key, kind, value);
  refreshDraftPreview();
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

async function deleteDatabaseItem(kind: "material" | "worker", id: number): Promise<void> {
  if (!confirm("Hapus item ini dari database?")) return;
  try {
    await persistChange(kind === "material" ? "DELETE_MATERIAL" : "DELETE_WORKER", { id });
    showToast("Item dihapus", "success");
    await syncWithServer();
    if (state.currentRoute === "database") renderCurrentPage();
  } catch (err) {
    console.error("deleteDatabaseItem failed:", err);
    showToast("Gagal menghapus", "error");
  }
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
function toggleItemCheck(idx: number, projectId: number | string): void {
  const project = findProjectById(projectId);
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

function startInlineEdit(el: HTMLElement, idx: number, projectId: number | string, field: string): void {
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
function toggleItemDropdown(btn: HTMLElement, idx: number, projectId: number | string): void {
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
let currentTxType: "in" | "out" = "out";

function findProjectById(projectId: number | string | null | undefined) {
  if (projectId == null) return undefined;
  return state.data.projects.find((p) => String(p.id) === String(projectId));
}

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

async function saveAllChanges(): Promise<void> {
  const project = findProjectById(state.currentProjectId);
  if (project) {
    await persistChange("SAVE_PROJECT", project);
  }

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
  const project = findProjectById(state.currentProjectId);
  if (!project) return;

  document.querySelectorAll("#project-tab-nav .tab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-tab") === tab);
  });

  const content = document.getElementById("project-tab-content");
  if (content) {
    content.innerHTML = renderProjectTabV2(project, state.currentProjectTab);
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
    content.innerHTML = renderFinanceTabContent(state);
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
    content.innerHTML = renderDatabaseTabContent(state);
    setTimeout(() => {
      setupPageInteractions();
      initLucideIcons();
    }, 50);
  }

  document.querySelectorAll(".tab-nav .tab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.textContent?.toLowerCase().trim() === tab);
  });
}

function openBalanceDiagnosis(scope: "business" | "project", projectId?: string): void {
  let panelHtml = "";
  if (scope === "business") {
    const check = validateBusinessBalance(state.data.business);
    panelHtml = renderBalanceDiagnosisPanel(check);
  } else {
    const project = findProjectById(projectId || state.currentProjectId);
    if (!project) {
      showToast("Project tidak ditemukan", "warning");
      return;
    }
    const check = validateProjectBalance(project);
    panelHtml = renderBalanceDiagnosisPanel(check);
  }

  const container = document.getElementById("modal-container");
  if (!container) return;
  container.innerHTML = `
  <div class="modal-backdrop" id="main-modal" onclick="if(event.target===this)APP.closeModal()">
    <div class="modal-dialog" onclick="event.stopPropagation()" style="max-width:560px;">
      <div class="modal-header">
        <div class="modal-title"><i data-lucide="scale"></i> Diagnosa Neraca</div>
        <button class="modal-close" onclick="APP.closeModal()"><i data-lucide="x"></i></button>
      </div>
      <div class="modal-body">${panelHtml}</div>
      <div class="modal-footer">
        <button class="btn btn-primary" onclick="APP.closeModal()">Tutup</button>
      </div>
    </div>
  </div>`;
  currentModal = container.firstElementChild as HTMLElement;
  initLucideIcons();
}

function exportFinanceReport(reportType: string): void {
  const biz = state.data.business;
  if (reportType === "Neraca") {
    const check = validateBusinessBalance(biz);
    if (!check.isBalanced) {
      showToast(`Neraca tidak balance (selisih ${formatRupiah(Math.abs(check.gap), true)}) — periksa diagnosa`, "warning");
    }
  }
  const rows: string[][] = [["Laporan", reportType], ["Tanggal", new Date().toISOString().slice(0, 10)], []];

  if (reportType === "Neraca") {
    rows.push(
      ["Total Kas", String(biz.totalKas)],
      ["Total Hutang", String(biz.totalHutang)],
      ["Total Piutang", String(biz.piutangList.reduce((s, p) => s + p.amount, 0))],
      ["Aset Tetap", String(biz.asetTetap)],
      ["Total Aktiva", String(biz.totalAktiva)],
      ["Ekuitas", String(biz.ekuitas)]
    );
  } else if (reportType === "Laba Rugi") {
    const income = biz.cashflowData.reduce((s, v) => s + v, 0);
    const expense = biz.cashflowOut.reduce((s, v) => s + v, 0);
    rows.push(["Pendapatan", String(income)], ["Beban", String(expense)], ["Laba", String(income - expense)]);
  } else if (reportType === "Arus Kas") {
    rows.push(["Bulan", "Masuk", "Keluar"]);
    biz.cashflowMonths.forEach((m, i) => {
      rows.push([m, String(biz.cashflowData[i] || 0), String(biz.cashflowOut[i] || 0)]);
    });
  } else {
    rows.push(["Project", "Nilai Kontrak", "Saldo"]);
    state.data.projects.forEach((p) => {
      rows.push([p.name, String(p.contractValue), String(p.saldo)]);
    });
  }

  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `laporan-${reportType.toLowerCase().replace(/\s+/g, "-")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`Laporan ${reportType} diekspor`, "success");
}

function viewTemplate(templateId: number): void {
  const template = state.data.database.templates.find((t) => t.id === templateId);
  if (!template) return;
  const json = JSON.stringify(template, null, 2);
  const edited = prompt(
    `Edit template JSON (${template.name}). Simpan perubahan?`,
    json.slice(0, 2000) + (json.length > 2000 ? "\n..." : "")
  );
  if (!edited) return;
  try {
    const parsed = JSON.parse(edited.endsWith("...") ? json : edited);
    const templates = state.data.database.templates.map((t) =>
      t.id === templateId ? { ...t, ...parsed, id: templateId } : t
    );
    void persistChange("UPSERT_TEMPLATE", { templates }).then(async () => {
      await syncWithServer();
      showToast("Template diperbarui", "success");
      if (state.currentRoute === "database") renderCurrentPage();
    });
  } catch {
    showToast("JSON template tidak valid", "error");
  }
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

    if (result.error && result.useMock) {
      console.warn("[sync] Database unavailable, using local mock data");
      showToast("Database belum terhubung — pakai data lokal", "warning");
      return;
    }

    if (result.error) throw new Error(result.error);

    state.data = mergeApiIntoState(state.data, result);

    if (state.currentProjectId) {
      const stillExists = state.data.projects.some((p) => p.id === state.currentProjectId);
      if (!stillExists) {
        state.currentProjectId = state.data.projects[0]?.id ?? null;
      }
    }

    renderCurrentPage();
    updateNav();
    showToast(
      result.source === "planner"
        ? "Data dimuat dari Monefyi Planner"
        : result.source === "database"
          ? "Data dimuat dari PostgreSQL"
          : "Data tersinkronisasi",
      "success"
    );
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
  initPopupSystem({
    getContext: () => ({
      business: state.data.business,
      projects: state.data.projects,
    }),
    getCurrentProjectId: () => state.currentProjectId,
    closeModal,
    initLucideIcons,
  });

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
    handleClientSuggest,
    selectSuggestion,
    createNewSuggestion,
    saveDatabaseItem,
    saveDatabaseMaterial,
    openDatabaseModal,
    viewTemplate,
    exportFinanceReport,
    openBalanceDiagnosis,
    setTxScope,
    toggleDraftItem: handleToggleDraftItem,
    updateDraftQty: handleUpdateDraftQty,
    updateDraftPrice: handleUpdateDraftPrice,
    openDraftAddMaterial,
    deleteDatabaseItem,
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
