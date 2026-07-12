import { APP_DATA } from "../mock-data";
import { formatRupiah } from "../utils";
import { renderProjectCard } from "../dashboard";

export type ProjectsPageState = {
  data: typeof APP_DATA;
};

export function renderProjectsPage(state: ProjectsPageState): string {
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