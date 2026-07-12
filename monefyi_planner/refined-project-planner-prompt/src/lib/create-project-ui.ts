// =====================================================
// Create project wizard — draft state & step 3 UI
// =====================================================

import { formatRupiah } from "./utils";
import type { ProjectDraft, DraftMaterial, DraftWorker } from "./suggestion-engine";

let currentDraft: ProjectDraft | null = null;

export function getProjectDraft(): ProjectDraft | null {
  return currentDraft;
}

export function setProjectDraft(draft: ProjectDraft | null): void {
  currentDraft = draft;
}

export function toggleDraftItem(key: string, kind: "material" | "worker" | "timeline"): void {
  if (!currentDraft) return;
  if (kind === "material") {
    const item = currentDraft.materials.find((m) => m.key === key);
    if (item) item.enabled = !item.enabled;
  } else if (kind === "worker") {
    const item = currentDraft.workers.find((w) => w.key === key);
    if (item) item.enabled = !item.enabled;
  } else {
    const item = currentDraft.timeline.find((t) => t.name === key);
    if (item) item.enabled = !item.enabled;
  }
}

export function updateDraftQty(
  key: string,
  kind: "material" | "worker",
  value: number
): void {
  if (!currentDraft || !Number.isFinite(value)) return;
  if (kind === "material") {
    const item = currentDraft.materials.find((m) => m.key === key);
    if (item) item.qtyPlan = value;
  } else {
    const item = currentDraft.workers.find((w) => w.key === key);
    if (item) item.qtyPlan = value;
  }
  recalcDraftTotals();
}

export function updateDraftPrice(
  key: string,
  kind: "material" | "worker",
  value: number
): void {
  if (!currentDraft || !Number.isFinite(value)) return;
  if (kind === "material") {
    const item = currentDraft.materials.find((m) => m.key === key);
    if (item) item.unitPrice = value;
  } else {
    const item = currentDraft.workers.find((w) => w.key === key);
    if (item) item.unitPrice = value;
  }
  recalcDraftTotals();
}

export function addDraftMaterial(item: DraftMaterial): void {
  if (!currentDraft) return;
  currentDraft.materials.push(item);
  recalcDraftTotals();
}

export function addDraftWorker(item: DraftWorker): void {
  if (!currentDraft) return;
  currentDraft.workers.push(item);
  recalcDraftTotals();
}

function recalcDraftTotals(): void {
  if (!currentDraft) return;
  const matCost = currentDraft.materials
    .filter((m) => m.enabled)
    .reduce((s, m) => s + m.qtyPlan * m.unitPrice, 0);
  const workerCost = currentDraft.workers
    .filter((w) => w.enabled)
    .reduce((s, w) => s + w.qtyPlan * w.unitPrice, 0);
  currentDraft.totalCost = matCost + workerCost;
}

export function renderDraftPreviewHtml(draft: ProjectDraft): {
  previewHtml: string;
  summaryHtml: string;
} {
  const materialRows = draft.materials
    .map(
      (m) => `
    <div class="preview-item" data-key="${m.key}">
      <div style="display:flex;align-items:center;gap:8px;flex:1;">
        <button class="toggle ${m.enabled ? "on" : ""}"
                onclick="APP.toggleDraftItem('${m.key}','material')"></button>
        <div style="width:28px;height:28px;border-radius:var(--radius-sm);background:var(--primary-light);display:flex;align-items:center;justify-content:center;">
          <i data-lucide="package" style="width:14px;height:14px;color:var(--primary);"></i>
        </div>
        <div class="preview-item-name">
          ${m.name}
          ${m.source === "historical" ? '<span class="badge gray" style="margin-left:4px;">Rata-rata</span>' : ""}
          <div class="preview-item-meta">
            <input type="number" class="inline-input" style="width:60px;" value="${m.qtyPlan}" min="0" step="0.1"
              onchange="APP.updateDraftQty('${m.key}','material',parseFloat(this.value))" />
            ${m.unit} @
            <input type="number" class="inline-input" style="width:90px;" value="${m.unitPrice}" min="0"
              onchange="APP.updateDraftPrice('${m.key}','material',parseFloat(this.value))" />
          </div>
        </div>
      </div>
      <div class="preview-item-value">${formatRupiah(m.qtyPlan * m.unitPrice, true)}</div>
    </div>`
    )
    .join("");

  const workerRows = draft.workers
    .map(
      (w) => `
    <div class="preview-item" data-key="${w.key}">
      <div style="display:flex;align-items:center;gap:8px;flex:1;">
        <button class="toggle ${w.enabled ? "on" : ""}"
                onclick="APP.toggleDraftItem('${w.key}','worker')"></button>
        <div style="width:28px;height:28px;border-radius:var(--radius-sm);background:var(--warning-light);display:flex;align-items:center;justify-content:center;">
          <i data-lucide="hard-hat" style="width:14px;height:14px;color:var(--warning-dark);"></i>
        </div>
        <div class="preview-item-name">
          ${w.name}
          <div class="preview-item-meta">
            <input type="number" class="inline-input" style="width:60px;" value="${w.qtyPlan}" min="0" step="0.1"
              onchange="APP.updateDraftQty('${w.key}','worker',parseFloat(this.value))" />
            hari @
            <input type="number" class="inline-input" style="width:90px;" value="${w.unitPrice}" min="0"
              onchange="APP.updateDraftPrice('${w.key}','worker',parseFloat(this.value))" />
          </div>
        </div>
      </div>
      <div class="preview-item-value">${formatRupiah(w.qtyPlan * w.unitPrice, true)}</div>
    </div>`
    )
    .join("");

  const timelineRows = draft.timeline
    .map(
      (t) => `
    <div class="preview-item">
      <button class="toggle ${t.enabled ? "on" : ""}"
              onclick="APP.toggleDraftItem('${t.name}','timeline')"></button>
      <div class="preview-item-name" style="flex:1;margin-left:8px;">${t.name}</div>
      <span class="badge gray">${t.weight}%</span>
    </div>`
    )
    .join("");

  const previewHtml = `
    <div style="font-size:12px;font-weight:700;color:var(--gray-500);padding:8px 12px;background:var(--gray-50);">BAHAN</div>
    ${materialRows || '<div style="padding:12px;color:var(--gray-400);">Tidak ada bahan</div>'}
    <div style="font-size:12px;font-weight:700;color:var(--gray-500);padding:8px 12px;background:var(--gray-50);">TUKANG</div>
    ${workerRows || '<div style="padding:12px;color:var(--gray-400);">Tidak ada tukang</div>'}
    <div style="font-size:12px;font-weight:700;color:var(--gray-500);padding:8px 12px;background:var(--gray-50);">LANGKAH KERJA</div>
    ${timelineRows}
    <div style="padding:12px;">
      <button class="btn btn-dashed btn-sm" onclick="APP.openDraftAddMaterial()">
        <i data-lucide="plus"></i>Tambah Bahan/Tukang
      </button>
    </div>`;

  const laba = draft.totalSell - draft.totalCost;
  const summaryHtml = `
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;text-align:center;">
      <div><div style="font-size:11px;color:var(--gray-500);">Est. Biaya</div><div style="font-weight:800;color:var(--danger);">${formatRupiah(draft.totalCost, true)}</div></div>
      <div><div style="font-size:11px;color:var(--gray-500);">Est. Jual</div><div style="font-weight:800;color:var(--primary);">${formatRupiah(draft.totalSell, true)}</div></div>
      <div><div style="font-size:11px;color:var(--gray-500);">Est. Laba</div><div style="font-weight:800;color:var(--success);">${formatRupiah(laba, true)}</div></div>
    </div>`;

  return { previewHtml, summaryHtml };
}
