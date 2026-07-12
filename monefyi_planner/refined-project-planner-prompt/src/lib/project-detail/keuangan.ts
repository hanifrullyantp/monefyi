// =====================================================
// Project Detail — Keuangan Tab (v2)
// =====================================================

import { formatRupiah, formatDate, projectIdJs } from "../utils";
import { renderSparkline } from "./helpers";
import { normalizeProject, type Project } from "./data-adapter";
import { validateProjectBalance, renderBalanceBadge } from "../balance-sheet";

/**
 * Render Keuangan tab for project detail.
 * @param project
 */
export function renderTabKeuangan(project: Project): string {
  const view = normalizeProject(project);
  const p = view.project;
  const pemasukanPct = Math.min((view.totalPemasukan / p.contractValue) * 100, 100).toFixed(0);
  const realisasiVsPemasukan =
    view.totalPemasukan > 0
      ? ((view.totalRealisasi / view.totalPemasukan) * 100).toFixed(0)
      : "0";
  const marginPct = (((p.rap?.estLaba || 0) / p.contractValue) * 100).toFixed(1);
  const balanceCheck = validateProjectBalance(p);
  const hutang = p.budget?.hutang || 0;

  return `
  <div style="padding:20px;" class="tab-content">
    <div class="pasiva-hero" style="margin-bottom:20px;cursor:pointer;" onclick="APP.openPopup('saldo', ${projectIdJs(p.id)})">
      <div class="pasiva-hero-icon">
        <i data-lucide="wallet"></i>
        Saldo Project
      </div>
      <div style="font-size:36px;font-weight:900;letter-spacing:-1px;color:var(--gray-900);margin-bottom:12px;" id="saldo-amount">
        ${formatRupiah(p.saldo)}
      </div>
      <div class="progress-bar-lg" style="background:var(--gray-200)">
        <div class="progress-bar orange" style="width:${pemasukanPct}%;min-width:120px;">
          ${formatRupiah(view.totalPemasukan, true)}
        </div>
      </div>
      <div style="text-align:center;font-size:13px;color:var(--gray-500);margin-top:8px;">
        Sisa Pembayaran: ${formatRupiah(view.sisaPembayaran, true)}
      </div>
    </div>

    <div class="grid-3 section">
      <div class="stat-card" onclick="APP.openPopup('pembayaran', ${projectIdJs(p.id)})">
        <div class="stat-card-header">
          <div class="stat-card-icon" style="background:var(--primary-light)">
            <i data-lucide="credit-card" style="color:var(--primary)"></i>
          </div>
          <span class="stat-card-label">Pembayaran</span>
        </div>
        <div style="font-size:18px;font-weight:800;margin-bottom:8px">${formatRupiah(view.totalPemasukan)}</div>
        ${renderSparkline([40, 55, 45, 70, 60, 80, 85], "primary")}
        <div class="progress-bar-lg" style="height:20px;margin-top:8px;">
          <div class="progress-bar danger" style="width:${realisasiVsPemasukan}%;min-width:80px;font-size:11px;">
            ${formatRupiah(view.totalRealisasi, true)}
          </div>
        </div>
        <div class="progress-label">Sisa ${formatRupiah(view.totalPemasukan - view.totalRealisasi, true)}</div>
      </div>

      <div class="stat-card" onclick="APP.openPopup('laba', ${projectIdJs(p.id)})">
        <div class="stat-card-header">
          <div class="stat-card-icon" style="background:var(--success-light)">
            <i data-lucide="trending-up" style="color:var(--success)"></i>
          </div>
          <span class="stat-card-label">Est. Laba</span>
        </div>
        <div style="font-size:18px;font-weight:800;margin-bottom:8px;">${formatRupiah(p.rap?.estLaba || 0)}</div>
        ${renderSparkline([30, 35, 42, 38, 45, 52, 58], "success")}
        <div class="progress-bar-lg" style="height:20px;margin-top:8px;">
          <div class="progress-bar success" style="width:${(((p.rap?.estLaba || 0) / p.contractValue) * 100).toFixed(0)}%;min-width:80px;font-size:11px;">
            ${formatRupiah(p.rap?.estLaba || 0, true)}
          </div>
        </div>
        <div class="progress-label">Margin ${marginPct}%</div>
      </div>

      <div class="stat-card" onclick="APP.openPopup('hutang', ${projectIdJs(p.id)})">
        <div class="stat-card-header">
          <div class="stat-card-icon" style="background:var(--danger-light)">
            <i data-lucide="receipt" style="color:var(--danger)"></i>
          </div>
          <span class="stat-card-label">Hutang</span>
        </div>
        <div style="font-size:22px;font-weight:800;margin-bottom:8px;color:var(--danger);">
          ${formatRupiah(p.budget?.hutang || 0, true)}
        </div>
        <span class="badge danger">${view.hutangItems.length} item aktif</span>
      </div>
    </div>

    <div class="card section">
      <div class="card-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
        <div class="card-title"><i data-lucide="scale"></i> Neraca Posisi Keuangan</div>
        ${renderBalanceBadge(balanceCheck)}
      </div>
      <div class="neraca-grid">
        <div class="neraca-col">
          <div class="neraca-col-title">Aktiva</div>
          <div class="neraca-row">
            <span class="neraca-row-label"><i data-lucide="wallet"></i>Saldo Kas</span>
            <span class="neraca-row-value">${formatRupiah(p.saldo, true)}</span>
          </div>
          <div class="neraca-row">
            <span class="neraca-row-label"><i data-lucide="file-check"></i>Piutang Klien</span>
            <span class="neraca-row-value">${formatRupiah(p.budget?.piutang || 0, true)}</span>
          </div>
          <div class="neraca-row neraca-total">
            <span>TOTAL AKTIVA</span>
            <span>${formatRupiah(view.totalAktiva, true)}</span>
          </div>
        </div>
        <div class="neraca-col">
          <div class="neraca-col-title">Pasiva (Sumber Dana)</div>
          ${p.payments
            .map(
              (pay) => `
            <div class="neraca-row">
              <span class="neraca-row-label"><i data-lucide="credit-card"></i>${pay.name}</span>
              <span class="neraca-row-value">${formatRupiah(pay.amount, true)}</span>
            </div>`
            )
            .join("")}
          <div class="neraca-row">
            <span class="neraca-row-label"><i data-lucide="receipt"></i>Hutang Vendor</span>
            <span class="neraca-row-value" style="color:var(--danger)">-${formatRupiah(hutang, true)}</span>
          </div>
          <div class="neraca-row neraca-total">
            <span>NET PASIVA</span>
            <span>${formatRupiah(view.totalPasiva, true)}</span>
          </div>
        </div>
      </div>
      <div style="margin-top:12px;padding:12px 16px;background:var(--gray-50);border-radius:var(--radius-md);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
        <div style="font-size:12px;color:var(--gray-500);">
          <i data-lucide="info" style="width:14px;height:14px;display:inline;"></i>
          Balance: Saldo + Piutang + Hutang harus = Dana Masuk
        </div>
        <div style="font-size:13px;font-weight:700;color:var(--success);">
          Est. Laba (performa): ${formatRupiah(view.estLaba, true)}
        </div>
      </div>
    </div>

    <div class="grid-2 section">
      <div class="stat-card" onclick="APP.openPopup('hutang', ${projectIdJs(p.id)})">
        <div class="stat-card-header">
          <div class="stat-card-icon" style="background:var(--danger-light)">
            <i data-lucide="receipt" style="color:var(--danger)"></i>
          </div>
          <span class="badge danger">Hutang</span>
        </div>
        <div style="font-size:20px;font-weight:800;color:var(--danger);margin-bottom:12px;">${formatRupiah(p.budget?.hutang || 0)}</div>
        ${view.hutangItems
          .map(
            (h) => `
          <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--gray-100);font-size:12px;">
            <span style="color:var(--gray-700)">${h.name}</span>
            <span style="font-weight:700;color:var(--danger)">${formatRupiah(h.amount, true)}</span>
          </div>`
          )
          .join("")}
      </div>
      <div class="stat-card" onclick="APP.openPopup('piutang', ${projectIdJs(p.id)})">
        <div class="stat-card-header">
          <div class="stat-card-icon" style="background:var(--success-light)">
            <i data-lucide="file-check" style="color:var(--success)"></i>
          </div>
          <span class="badge success">Piutang</span>
        </div>
        <div style="font-size:20px;font-weight:800;color:var(--success);margin-bottom:12px;">${formatRupiah(p.budget?.piutang || 0)}</div>
        ${view.piutangItems
          .map(
            (h) => `
          <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--gray-100);font-size:12px;">
            <span style="color:var(--gray-700)">${h.name}</span>
            <span style="font-weight:700;color:var(--success)">${formatRupiah(h.amount, true)}</span>
          </div>`
          )
          .join("")}
      </div>
    </div>

    <div class="card section">
      <div class="card-header">
        <div class="card-title"><i data-lucide="clock"></i> Semua Transaksi</div>
        <button class="btn btn-sm btn-outline" onclick="APP.openModal('tambah-transaksi')">
          <i data-lucide="plus"></i>Tambah
        </button>
      </div>
      <div style="padding:0 20px;">
        ${view.allTransactions
          .map((tx) => {
            const time = "time" in tx && tx.time ? `• ${tx.time}` : "";
            return `
          <div class="tx-item">
            <div class="tx-icon ${tx.type}"><i data-lucide="${tx.icon}"></i></div>
            <div class="tx-info">
              <div class="tx-name">${tx.name}</div>
              <div class="tx-date">${formatDate(tx.date)} ${time}</div>
            </div>
            <div class="tx-amount ${tx.type}">
              ${tx.type === "out" ? "-" : "+"} ${formatRupiah(tx.amount)}
            </div>
          </div>`;
          })
          .join("")}
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
  </div>`;
}
