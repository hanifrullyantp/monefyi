// =====================================================
// Popup system — 3-card drill-down overlays
// =====================================================

import { APP_DATA } from "../mock-data";
import { getPopupConfig, type PopupContext } from "./configs";

export type PopupDeps = {
  getContext: () => PopupContext;
  getCurrentProjectId: () => number | string | null;
  closeModal: () => void;
  initLucideIcons: () => void;
};

let deps: PopupDeps | null = null;
let currentPopup: HTMLElement | null = null;

export function initPopupSystem(popupDeps: PopupDeps): void {
  deps = popupDeps;
}

export function openPopup(type: string, projectId?: number | string): void {
  if (!deps) return;

  deps.closeModal();

  const ctx = deps.getContext();
  const resolvedId = projectId ?? deps.getCurrentProjectId() ?? undefined;
  const project = resolvedId
    ? ctx.projects.find((p) => String(p.id) === String(resolvedId))
    : null;
  const popupConfig = getPopupConfig(type, project, ctx);

  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.id = "popup-modal";
  modal.innerHTML = `
  <div class="modal-dialog" onclick="event.stopPropagation()">
    <div class="modal-header">
      <div class="modal-title">${popupConfig.icon ? `<i data-lucide="${popupConfig.icon}"></i>` : ""} ${popupConfig.title}</div>
      <button class="modal-close" onclick="APP.closePopup()"><i data-lucide="x"></i></button>
    </div>
    <div class="modal-body">
      <div class="popup-3cards">
        ${popupConfig.cards
          .map(
            (c) => `
          <div class="popup-3card">
            <div class="popup-3card-icon" style="background:${c.bg};">
              <i data-lucide="${c.icon}" style="color:${c.color};"></i>
            </div>
            <div class="popup-3card-value">${c.value}</div>
            <div class="popup-3card-label">${c.label}</div>
          </div>`
          )
          .join("")}
      </div>
      <div style="display:flex;gap:8px;margin-bottom:16px;">
        <div class="search-bar" style="flex:1;">
          <i data-lucide="search"></i>
          <input type="text" placeholder="Cari..." />
        </div>
        <button class="btn btn-sm btn-outline"><i data-lucide="filter"></i>Filter</button>
      </div>
      <div style="border:1px solid var(--gray-100);border-radius:var(--radius-lg);overflow:hidden;">
        ${popupConfig.list
          .map(
            (item) => `
          <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--gray-50);">
            <div style="width:32px;height:32px;border-radius:var(--radius-md);background:${item.bg || "var(--gray-100)"};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <i data-lucide="${item.icon || "box"}" style="width:15px;height:15px;color:${item.color || "var(--gray-500)"};"></i>
            </div>
            <div style="flex:1;min-width:0;">
              <div style="font-size:13px;font-weight:600;">${item.title}</div>
              <div style="font-size:11px;color:var(--gray-400);">${item.meta}</div>
            </div>
            <div style="font-weight:700;color:${item.valueColor || "var(--gray-800)"};white-space:nowrap;">${item.value}</div>
          </div>`
          )
          .join("")}
      </div>
      ${
        popupConfig.detailRoute
          ? `
        <div style="margin-top:16px;">
          <button class="btn btn-outline-primary w-full" onclick="APP.navigate('${popupConfig.detailRoute}');APP.closePopup();">
            <i data-lucide="external-link"></i>Buka Detail Lengkap
          </button>
        </div>`
          : ""
      }
    </div>
  </div>
  `;

  modal.onclick = (e) => {
    if (e.target === modal) closePopup();
  };

  document.body.appendChild(modal);
  currentPopup = modal;
  deps.initLucideIcons();
}

export function closePopup(): void {
  if (currentPopup) {
    currentPopup.remove();
    currentPopup = null;
  }
}
