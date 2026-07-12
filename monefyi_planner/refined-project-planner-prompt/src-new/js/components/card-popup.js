// =====================================================
// PROJECT PLANNER — Card Popup System
// Migrated from: src/lib/app.ts (openPopup, closePopup)
// Phase 2.2.4
// =====================================================

import { getState } from "../store.js";
import { getPopupConfig } from "../data/popup-configs.js";
import { closeModal, setPopupCloser } from "./modal.js";
import { navigate } from "../router.js";

/** @type {HTMLElement | null} */
let currentPopup = null;

/**
 * Refresh Lucide icons inside popup.
 */
function refreshIcons() {
  if (window.lucide) window.lucide.createIcons();
}

/**
 * Build popup HTML from config object.
 * @param {ReturnType<typeof getPopupConfig>} config
 * @returns {string}
 */
export function renderPopupHtml(config) {
  const iconHtml = config.icon ? `<i data-lucide="${config.icon}"></i>` : "";

  const cardsHtml = config.cards
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
    .join("");

  const listHtml = config.list
    .map(
      (item) => `
      <div class="popup-list-item">
        <div class="popup-list-icon" style="background:${item.bg || "var(--gray-100)"};">
          <i data-lucide="${item.icon || "box"}" style="width:15px;height:15px;color:${item.color || "var(--gray-500)"};"></i>
        </div>
        <div class="popup-list-content">
          <div class="popup-list-title">${item.title}</div>
          <div class="popup-list-meta">${item.meta}</div>
        </div>
        <div class="popup-list-value" style="color:${item.valueColor || "var(--gray-800)"};">${item.value}</div>
      </div>`
    )
    .join("");

  const detailHtml = config.detailRoute
    ? `
      <div style="margin-top:16px;">
        <button type="button" class="btn btn-outline-primary w-full" data-popup-detail="${config.detailRoute}">
          <i data-lucide="external-link"></i>Buka Detail Lengkap
        </button>
      </div>`
    : "";

  return `
    <div class="modal-dialog" data-popup-dialog>
      <div class="modal-header">
        <div class="modal-title">${iconHtml} ${config.title}</div>
        <button type="button" class="modal-close" data-popup-close aria-label="Tutup">
          <i data-lucide="x"></i>
        </button>
      </div>
      <div class="modal-body">
        <div class="popup-3cards">${cardsHtml}</div>
        <div class="popup-search-row">
          <div class="search-bar" style="flex:1;">
            <i data-lucide="search"></i>
            <input type="text" placeholder="Cari..." />
          </div>
          <button type="button" class="btn btn-sm btn-outline">
            <i data-lucide="filter"></i>Filter
          </button>
        </div>
        <div class="popup-list-wrap">${listHtml}</div>
        ${detailHtml}
      </div>
    </div>
  `;
}

/**
 * Bind popup events (backdrop, close, detail navigation).
 * @param {HTMLElement} backdrop
 */
function bindPopupEvents(backdrop) {
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) closePopup();
  });

  const dialog = backdrop.querySelector("[data-popup-dialog]");
  dialog?.addEventListener("click", (e) => e.stopPropagation());

  backdrop.querySelectorAll("[data-popup-close]").forEach((btn) => {
    btn.addEventListener("click", () => closePopup());
  });

  backdrop.querySelectorAll("[data-popup-detail]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const route = btn.getAttribute("data-popup-detail");
      if (route) {
        navigate(route);
        closePopup();
      }
    });
  });
}

/**
 * Open card popup by type.
 * @param {string} type
 * @param {number} [projectId]
 */
export function openPopup(type, projectId) {
  closeModal();
  closePopup();

  const state = getState();
  const project = projectId
    ? state.data.projects.find((p) => p.id === projectId)
    : null;
  const config = getPopupConfig(type, project, state);

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.id = "popup-modal";
  backdrop.innerHTML = renderPopupHtml(config);

  bindPopupEvents(backdrop);
  document.body.appendChild(backdrop);
  currentPopup = backdrop;
  refreshIcons();
}

/**
 * Close active card popup.
 */
export function closePopup() {
  if (currentPopup) {
    currentPopup.remove();
    currentPopup = null;
  }
}

/**
 * Whether a popup is currently open.
 * @returns {boolean}
 */
export function isPopupOpen() {
  return currentPopup !== null;
}

/**
 * Initialize card popup — wire modal closer + APP namespace + Escape.
 */
export function initCardPopup() {
  setPopupCloser(closePopup);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isPopupOpen()) {
      e.preventDefault();
      closePopup();
    }
  });

  window.APP = window.APP || {};
  window.APP.openPopup = openPopup;
  window.APP.closePopup = closePopup;
}
