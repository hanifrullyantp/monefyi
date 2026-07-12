import { APP_DATA } from "../mock-data";
import { formatRupiah, formatDate, projectDetailRoute } from "../utils";
import { renderSparkline } from "../ui-helpers";
import { validateBusinessBalance, renderBalanceBadge } from "../balance-sheet";

export type DashboardPageState = {
  data: typeof APP_DATA;
};

export function renderDashboardPage(state: DashboardPageState): string {
  const biz = state.data.business;
  const projects = state.data.projects;
  const activeProjects = projects.filter((p) => p.status !== "archived");

  const totalHutang = biz.hutangList.reduce((s, h) => s + h.amount, 0);
  const totalPiutang = biz.piutangList.reduce((s, p) => s + p.amount, 0);
  const totalPasivaEkuitas = biz.totalHutang + biz.modal + biz.labaDitahan;
  const aktivaFromRows =
    biz.totalKas +
    totalPiutang +
    biz.assets.reduce((s, a) => s + a.value, 0) +
    biz.asetTetap;
  const balanceCheck = validateBusinessBalance(biz);
  const alertProject =
    projects.find((p) => p.status === "warning" || p.status === "danger") || projects[0];
  const alertId = alertProject?.id;
  const alertName = alertProject?.name || "Project";
  const firstHutang = biz.hutangList[0];

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
      <div style="margin-top:10px;">${renderBalanceBadge(balanceCheck)}</div>
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
        <div class="stat-card-amount">${formatRupiah(aktivaFromRows, true)}</div>
        ${renderSparkline([65,72,68,80,75,85,82], "purple")}
      </div>
      <div class="stat-card" onclick="APP.openPopup('pasiva')">
        <div class="stat-card-header">
          <div class="stat-card-icon" style="background:var(--danger-light)">
            <i data-lucide="landmark" style="color:var(--danger)"></i>
          </div>
          <span class="stat-card-trend down"><i data-lucide="trending-down"></i>5%</span>
        </div>
        <div class="stat-card-label">Total Pasiva + Ekuitas</div>
        <div class="stat-card-amount">${formatRupiah(totalPasivaEkuitas, true)}</div>
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
      ${alertId ? `<div class="alert-card danger" onclick="APP.navigate('${projectDetailRoute(alertId, "keuangan")}')">
        <i data-lucide="alert-triangle"></i>
        <div class="alert-card-content">
          <div class="alert-card-title">Hutang Jatuh Tempo</div>
          <div class="alert-card-desc">${firstHutang ? `${firstHutang.name} ${formatRupiah(firstHutang.amount, true)}` : "Periksa hutang project"}</div>
        </div>
      </div>
      <div class="alert-card warning" onclick="APP.navigate('${projectDetailRoute(alertId, "rap")}')">
        <i data-lucide="alert-octagon"></i>
        <div class="alert-card-content">
          <div class="alert-card-title">Over Budget — Material</div>
          <div class="alert-card-desc">${alertName}: realisasi ${formatRupiah(alertProject?.rap?.realisasi || 0, true)}</div>
        </div>
      </div>
      <div class="alert-card warning" onclick="APP.navigate('${projectDetailRoute(alertId, "progress")}')">
        <i data-lucide="clock"></i>
        <div class="alert-card-content">
          <div class="alert-card-title">Keterlambatan Progress</div>
          <div class="alert-card-desc">${alertName}: Realisasi ${alertProject?.progress.actual ?? 0}% dari target ${alertProject?.progress.plan ?? 0}%</div>
        </div>
      </div>` : ""}
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

export function renderProjectCard(p: (typeof APP_DATA.projects)[number]): string {
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
