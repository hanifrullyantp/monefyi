// =====================================================
// Project Detail — Progress Tab (v2)
// =====================================================

import { formatDate } from "../utils";
import { renderDonutChart } from "./helpers";
import type { Project } from "./data-adapter";

export function renderTabProgress(project: Project): string {
  return `
  <div style="padding:20px;" class="tab-content">
    <!-- Hero -->
    <div style="background:linear-gradient(135deg,#064E3B,#065F46,#059669);border-radius:var(--radius-xl);padding:24px;color:white;margin-bottom:20px;">
      <div style="font-size:12px;font-weight:600;opacity:0.7;text-transform:uppercase;letter-spacing:0.5px;display:flex;align-items:center;gap:6px;margin-bottom:8px;">
        <i data-lucide="activity"></i>Progress Keseluruhan
      </div>
      <div style="font-size:48px;font-weight:900;letter-spacing:-2px;line-height:1;">${project.progress.actual}%</div>
      <div style="margin:12px 0;">
        <span style="background:rgba(245,158,11,0.2);color:#FDE68A;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:600;">
          ${project.progress.deviation}% Deviasi dari Rencana
        </span>
      </div>
      <div style="position:relative;background:rgba(255,255,255,0.15);border-radius:999px;height:20px;overflow:hidden;">
        <div style="position:absolute;top:0;left:0;height:100%;width:${project.progress.plan}%;background:rgba(255,255,255,0.25);border-radius:999px;"></div>
        <div style="position:absolute;top:0;left:0;height:100%;width:${project.progress.actual}%;background:white;border-radius:999px;"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px;opacity:0.8;margin-top:6px;">
        <span>Rencana: ${project.progress.plan}%</span>
        <span>Realisasi: ${project.progress.actual}%</span>
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
        ${renderDonutChart(project.progress.plan, "#2563EB", "Rencana", `${project.progress.plan}%`)}
      </div>
      <div class="card" style="padding:20px;text-align:center;">
        <div style="font-size:13px;font-weight:700;margin-bottom:12px;color:var(--gray-500);text-transform:uppercase;letter-spacing:0.5px;">Realisasi</div>
        ${renderDonutChart(project.progress.actual, "#10B981", "Realisasi", `${project.progress.actual}%`)}
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
          ${project.timeline.map(item => `
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
