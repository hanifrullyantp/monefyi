// =====================================================
// Project Detail — Analisa Tab (v2)
// =====================================================

import { formatRupiah } from "../utils";
import type { Project } from "./data-adapter";

export function renderTabAnalisa(project: Project): string {
  const healthScore = 72;
  const rapPct = ((project.rap?.realisasi || 0) / (project.rap?.totalRAP || 1) * 100);
  
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
          <div class="alert-card-desc">Saldo ${formatRupiah(project.saldo, true)} dalam kondisi sehat untuk operasional</div>
        </div>
      </div>
      <div class="alert-card warning">
        <i data-lucide="alert-triangle"></i>
        <div class="alert-card-content">
          <div class="alert-card-title">Material Over Budget 22%</div>
          <div class="alert-card-desc">Semen Tiga Roda melebihi RAP ${formatRupiah(325000)}. Total realisasi ${formatRupiah(project.rap?.realisasi||0, true)} vs RAP ${formatRupiah(project.rap?.totalRAP||0, true)}</div>
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
