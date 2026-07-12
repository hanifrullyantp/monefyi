// =====================================================
// Project Detail — Laporan Tab (v2)
// =====================================================

import { formatRupiah } from "../utils";
import type { Project } from "./data-adapter";

export function renderTabLaporan(project: Project): string {
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
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--gray-400);font-weight:700;margin-bottom:12px;">LAPORAN MINGGUAN — ${project.name} — Minggu ke-2</div>
        
        <div style="margin-bottom:12px;">
          <div style="font-size:12px;font-weight:700;color:var(--gray-600);margin-bottom:6px;">1. PROGRESS</div>
          <div class="grid-3" style="gap:8px;">
            <div style="text-align:center;padding:8px;background:white;border-radius:var(--radius-md);">
              <div style="font-size:16px;font-weight:900;color:var(--primary)">${project.progress.plan}%</div>
              <div style="font-size:10px;color:var(--gray-400)">Rencana</div>
            </div>
            <div style="text-align:center;padding:8px;background:white;border-radius:var(--radius-md);">
              <div style="font-size:16px;font-weight:900;color:var(--success)">${project.progress.actual}%</div>
              <div style="font-size:10px;color:var(--gray-400)">Realisasi</div>
            </div>
            <div style="text-align:center;padding:8px;background:white;border-radius:var(--radius-md);">
              <div style="font-size:16px;font-weight:900;color:var(--danger)">${project.progress.deviation}%</div>
              <div style="font-size:10px;color:var(--gray-400)">Deviasi</div>
            </div>
          </div>
        </div>

        <div style="margin-bottom:12px;">
          <div style="font-size:12px;font-weight:700;color:var(--gray-600);margin-bottom:6px;">2. KEUANGAN</div>
          <div style="font-size:13px;color:var(--gray-700);">
            Pengeluaran minggu ini: ${formatRupiah(12400000)} | Total: ${formatRupiah(project.rap?.realisasi||0)} | Saldo: ${formatRupiah(project.saldo, true)}
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
