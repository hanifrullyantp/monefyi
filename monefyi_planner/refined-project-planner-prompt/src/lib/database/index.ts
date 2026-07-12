import { APP_DATA } from "../mock-data";
import { formatRupiah } from "../utils";

export type DatabasePageState = {
  currentDatabaseTab: string;
  data: typeof APP_DATA;
};

export function renderDatabasePage(state: DatabasePageState): string {
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
      <button class="btn btn-primary" onclick="APP.openDatabaseModal()">
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
      ${renderDatabaseTabContent(state)}
    </div>
  </div>
  `;
}

export function renderDatabaseTabContent(state: DatabasePageState): string {
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
                  <button class="icon-btn" title="Edit"
                    onclick="APP.openDatabaseModal('material', ${m.id})"><i data-lucide="pencil"></i></button>
                  <button class="icon-btn" title="Hapus" style="color:var(--danger)"
                    onclick="APP.deleteDatabaseItem('material', ${m.id})"><i data-lucide="trash-2"></i></button>
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
            <button class="icon-btn" title="Edit"
              onclick="APP.openDatabaseModal('worker', ${w.id})"><i data-lucide="pencil"></i></button>
            <button class="icon-btn" title="Hapus" style="color:var(--danger)"
              onclick="APP.deleteDatabaseItem('worker', ${w.id})"><i data-lucide="trash-2"></i></button>
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
                  <button class="btn btn-sm btn-ghost" onclick="APP.viewTemplate(${t.id})"><i data-lucide="pencil"></i>Edit</button>
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