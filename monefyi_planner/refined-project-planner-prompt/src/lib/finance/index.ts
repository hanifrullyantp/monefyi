import { APP_DATA } from "../mock-data";
import { formatRupiah, formatDate } from "../utils";
import { renderSparkline } from "../ui-helpers";
import { validateBusinessBalance, renderBalanceBadge } from "../balance-sheet";

export type FinancePageState = {
  currentFinanceTab: string;
  data: typeof APP_DATA;
};

export function renderFinancePage(state: FinancePageState): string {
  const biz = state.data.business;
  const tabs = ["Overview", "Kas & Bank", "Hutang Piutang", "Laba Rugi", "Operasional", "Aset", "Laporan"];
  const activeTab = state.currentFinanceTab;

  return `
  <div class="page-header">
    <div>
      <div class="page-title">Keuangan Bisnis</div>
      <div class="page-subtitle">${biz.name}</div>
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
      ${renderFinanceTabContent(state)}
    </div>
  </div>
  `;
}

export function renderFinanceTabContent(state: FinancePageState): string {
  const biz = state.data.business;
  const tab = state.currentFinanceTab;

  if (tab === "overview" || tab === "") {
    const piutangTotal = biz.piutangList.reduce((s, p) => s + p.amount, 0);
    const persediaan = biz.assets.reduce((s, a) => s + a.value, 0);
    const prabayar = Number((biz as typeof biz & { prabayar?: number }).prabayar ?? 0);
    const aktivaFromRows = biz.totalKas + piutangTotal + persediaan + biz.asetTetap + prabayar;
    const pasivaEkuitas = biz.totalHutang + biz.modal + biz.labaDitahan;
    const balanceCheck = validateBusinessBalance(biz);
    const cfIn = biz.cashflowData;
    const cfSpark = cfIn.length >= 2 ? cfIn : [biz.totalKas * 0.3, biz.totalKas * 0.35];
    const growthPct =
      cfIn.length >= 2 && cfIn[cfIn.length - 2] > 0
        ? (((cfIn[cfIn.length - 1] - cfIn[cfIn.length - 2]) / cfIn[cfIn.length - 2]) * 100).toFixed(0)
        : "0";
    const growthLabel = Number(growthPct) >= 0 ? `+${growthPct}%` : `${growthPct}%`;

    return `
    <!-- Neraca -->
    <div style="margin-bottom:20px;">
      <div class="finance-hero" onclick="APP.openPopup('kas-bisnis')">
        <div style="font-size:12px;opacity:0.7;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">
          <i data-lucide="building-2" style="display:inline;width:14px;height:14px;"></i>
          Total Kas Bisnis
        </div>
        <div style="font-size:40px;font-weight:900;letter-spacing:-1.5px;margin-bottom:8px;">${formatRupiah(biz.totalKas)}</div>
        ${renderSparkline(cfSpark, "white")}
        <span style="background:rgba(16,185,129,0.2);color:#6EE7B7;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:600;margin-top:8px;display:inline-flex;align-items:center;gap:4px;">
          <i data-lucide="trending-up" style="width:13px;height:13px;"></i>${growthLabel} bulan ini
        </span>
      </div>
    </div>

    <!-- Neraca Bisnis -->
    <div class="card section">
      <div class="card-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
        <div class="card-title"><i data-lucide="scale"></i> Neraca Bisnis</div>
        ${renderBalanceBadge(balanceCheck)}
      </div>
      <div class="neraca-grid">
        <div class="neraca-col">
          <div class="neraca-col-title">Aktiva</div>
          <div class="neraca-row"><span class="neraca-row-label"><i data-lucide="wallet"></i>Kas & Bank</span><span class="neraca-row-value">${formatRupiah(biz.totalKas, true)}</span></div>
          <div class="neraca-row"><span class="neraca-row-label"><i data-lucide="file-check"></i>Piutang Klien</span><span class="neraca-row-value">${formatRupiah(piutangTotal, true)}</span></div>
          <div class="neraca-row"><span class="neraca-row-label"><i data-lucide="package"></i>Persediaan</span><span class="neraca-row-value">${formatRupiah(persediaan, true)}</span></div>
          <div class="neraca-row"><span class="neraca-row-label"><i data-lucide="building-2"></i>Aset Tetap</span><span class="neraca-row-value">${formatRupiah(biz.asetTetap, true)}</span></div>
          ${prabayar > 0 ? `<div class="neraca-row"><span class="neraca-row-label"><i data-lucide="clock"></i>Prabayar</span><span class="neraca-row-value">${formatRupiah(prabayar, true)}</span></div>` : ""}
          <div class="neraca-row neraca-total"><span>TOTAL AKTIVA</span><span>${formatRupiah(aktivaFromRows, true)}</span></div>
        </div>
        <div class="neraca-col">
          <div class="neraca-col-title">Pasiva + Ekuitas</div>
          <div class="neraca-row"><span class="neraca-row-label"><i data-lucide="receipt"></i>Total Hutang</span><span class="neraca-row-value" style="color:var(--danger)">${formatRupiah(biz.totalHutang, true)}</span></div>
          <div class="neraca-row"><span class="neraca-row-label"><i data-lucide="wallet"></i>Modal</span><span class="neraca-row-value">${formatRupiah(biz.modal, true)}</span></div>
          <div class="neraca-row"><span class="neraca-row-label"><i data-lucide="trending-up"></i>Laba Ditahan</span><span class="neraca-row-value" style="color:var(--success)">${formatRupiah(biz.labaDitahan, true)}</span></div>
          <div class="neraca-row neraca-total"><span>TOTAL PASIVA + EKUITAS</span><span>${formatRupiah(pasivaEkuitas, true)}</span></div>
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
              <button class="btn btn-sm btn-ghost" onclick="APP.exportFinanceReport('${r.label}')"><i data-lucide="download"></i></button>
            </div>
          `).join("")}
        </div>
      </div>
    </div>
    `;
  }

  return `<div style="padding:20px;color:var(--gray-400);text-align:center;">Pilih tab untuk melihat data</div>`;
}