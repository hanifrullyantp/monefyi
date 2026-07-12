// =====================================================
// Project Detail — v2 entry (hybrid integration)
// All 6 project detail tabs routed through this module.
// =====================================================

import { APP_DATA } from "../mock-data";
import { renderTabOverview } from "./overview";
import { renderTabKeuangan } from "./keuangan";
import { renderTabProgress } from "./progress";
import { renderTabRap } from "./rap";
import { renderTabAnalisa } from "./analisa";
import { renderTabLaporan } from "./laporan";
import type { Project } from "./data-adapter";

export type ProjectDetailState = {
  currentProjectId: number | string | null;
  currentProjectTab: string;
  data: typeof APP_DATA;
};

const V2_TABS = new Set([
  "overview",
  "keuangan",
  "progress",
  "rap",
  "analisa",
  "laporan",
]);

/**
 * Whether a tab is rendered by the v2 project-detail module.
 */
export function isProjectDetailV2Tab(tab: string): boolean {
  return V2_TABS.has(tab);
}

/**
 * Render full project detail page shell + active tab content.
 */
export function renderProjectDetailV2(state: ProjectDetailState): string {
  const project = state.data.projects.find(
    (p) => String(p.id) === String(state.currentProjectId)
  );
  if (!project) {
    return `<div class="page-header"><div class="page-title">Project tidak ditemukan</div></div>`;
  }

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
      ${tabs
        .map(
          (t) => `
        <button class="tab-btn ${state.currentProjectTab === t.id ? "active" : ""}"
                onclick="APP.switchProjectTab('${t.id}')"
                data-tab="${t.id}">
          ${t.label}
          ${t.badge ? `<span class="tab-badge">${t.badge}</span>` : ""}
        </button>`
        )
        .join("")}
    </div>
    <div id="project-tab-content">
      ${renderProjectTabV2(project, state.currentProjectTab)}
    </div>
  </div>`;
}

/**
 * Render a single project detail tab.
 */
export function renderProjectTabV2(project: Project, tab: string): string {
  switch (tab) {
    case "overview":
      return renderTabOverview(project);
    case "keuangan":
      return renderTabKeuangan(project);
    case "progress":
      return renderTabProgress(project);
    case "rap":
      return renderTabRap(project);
    case "analisa":
      return renderTabAnalisa(project);
    case "laporan":
      return renderTabLaporan(project);
    default:
      return renderTabOverview(project);
  }
}
