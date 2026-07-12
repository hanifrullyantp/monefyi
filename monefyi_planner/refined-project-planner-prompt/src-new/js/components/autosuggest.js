// =====================================================
// PROJECT PLANNER — Autosuggest Component
// Migrated from: src/lib/app.ts (handleAutoSuggest, selectSuggestion, createNewSuggestion)
// Phase 2.2.5
// =====================================================

import { getState } from "../store.js";
import { fuzzyMatch, formatRupiah, debounce } from "../utils.js";
import { showToast } from "./toast.js";

/** @typedef {{ name: string, unit: string, price: number, icon: string, stock: number, usedIn: number }} SuggestMaterial */

/** @type {Map<string, { focusIndex: number, items: Array<{ type: 'material', data: SuggestMaterial } | { type: 'create-new', query: string }> }>} */
const dropdownState = new Map();

/** @type {string | null} */
let activeDropdownId = null;

/**
 * Refresh Lucide icons inside a dropdown.
 * @param {HTMLElement} dropdown
 */
function refreshIcons(dropdown) {
  if (window.lucide) {
    window.lucide.createIcons({ nodes: [dropdown] });
  }
}

/**
 * Escape HTML for safe rendering.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Get master materials from store.
 * @returns {SuggestMaterial[]}
 */
function getMaterials() {
  return getState().data.database?.materials || [];
}

/**
 * Filter and rank materials by fuzzy match + usedIn frequency.
 * @param {string} query
 * @returns {SuggestMaterial[]}
 */
function rankMaterials(query) {
  return getMaterials()
    .filter((m) => fuzzyMatch(query, m.name))
    .sort((a, b) => (b.usedIn || 0) - (a.usedIn || 0))
    .slice(0, 8);
}

/**
 * Hide autosuggest dropdown.
 * @param {string} dropdownId
 */
function hideDropdown(dropdownId) {
  const dropdown = document.getElementById(dropdownId);
  if (!dropdown) return;
  dropdown.style.display = "none";
  dropdown.innerHTML = "";
  dropdownState.delete(dropdownId);
  if (activeDropdownId === dropdownId) {
    activeDropdownId = null;
  }
}

/**
 * Hide all open autosuggest dropdowns.
 */
function hideAllDropdowns() {
  document.querySelectorAll(".autosuggest-dropdown").forEach((el) => {
    if (el instanceof HTMLElement && el.style.display !== "none") {
      hideDropdown(el.id);
    }
  });
}

/**
 * Update focused item highlight in dropdown.
 * @param {HTMLElement} dropdown
 * @param {number} focusIndex
 */
function updateFocusHighlight(dropdown, focusIndex) {
  const items = dropdown.querySelectorAll(".autosuggest-item");
  items.forEach((item, idx) => {
    item.classList.toggle("focused", idx === focusIndex);
  });
  const focused = items[focusIndex];
  if (focused instanceof HTMLElement) {
    focused.scrollIntoView({ block: "nearest" });
  }
}

/**
 * Render autosuggest dropdown content.
 * @param {string} query
 * @param {string} dropdownId
 */
function renderDropdown(query, dropdownId) {
  const dropdown = document.getElementById(dropdownId);
  if (!dropdown) return;

  const trimmed = query.trim();
  if (!trimmed) {
    hideDropdown(dropdownId);
    return;
  }

  const materials = rankMaterials(trimmed);
  if (materials.length === 0 && trimmed.length < 2) {
    hideDropdown(dropdownId);
    return;
  }

  const items = [
    ...materials.map((m) => ({ type: /** @type {const} */ ("material"), data: m })),
    { type: /** @type {const} */ ("create-new"), query: trimmed },
  ];

  dropdownState.set(dropdownId, { focusIndex: 0, items });
  activeDropdownId = dropdownId;

  dropdown.innerHTML = `
    ${materials
      .map(
        (m, idx) => `
      <div class="autosuggest-item${idx === 0 ? " focused" : ""}" data-suggest-action="select" data-suggest-index="${idx}">
        <div class="autosuggest-item-icon"><i data-lucide="${m.icon || "box"}"></i></div>
        <div style="flex:1;">
          <div class="autosuggest-item-name">${escapeHtml(m.name)}</div>
          <div class="autosuggest-item-meta">${formatRupiah(m.price)}/${escapeHtml(m.unit)} • Stock: ${m.stock > 0 ? `${m.stock} ${escapeHtml(m.unit)}` : "Habis"}</div>
        </div>
        ${m.usedIn > 5 ? '<div class="autosuggest-ranked" title="Sering dipakai"></div>' : ""}
      </div>`
      )
      .join("")}
    <div class="autosuggest-item create-new${materials.length === 0 ? " focused" : ""}" data-suggest-action="create" data-suggest-index="${materials.length}">
      <i data-lucide="plus" style="width:15px;height:15px;"></i>
      Buat baru: "${escapeHtml(trimmed)}"
    </div>
  `;

  dropdown.style.display = "block";
  refreshIcons(dropdown);
}

const debouncedRender = debounce((query, dropdownId) => {
  renderDropdown(query, dropdownId);
}, 300);

/**
 * Handle input change for autosuggest fields.
 * @param {string} query
 * @param {string} dropdownId
 */
export function handleAutoSuggest(query, dropdownId) {
  debouncedRender(query, dropdownId);
}

/**
 * Recalculate RAP subtotal from qty × harga inputs.
 */
export function calcRapSubtotal() {
  const qty = parseFloat(document.getElementById("rap-qty")?.value || "0");
  const harga = parseFloat(document.getElementById("rap-harga")?.value || "0");
  const subtotal = document.getElementById("rap-subtotal");
  if (subtotal) {
    subtotal.textContent = formatRupiah(qty * harga);
  }
}

/**
 * Select a material suggestion and auto-fill related inputs.
 * @param {string} name
 * @param {string} unit
 * @param {number} price
 * @param {string} dropdownId
 */
export function selectSuggestion(name, unit, price, dropdownId) {
  hideDropdown(dropdownId);

  const dropdown = document.getElementById(dropdownId);
  const wrap = dropdown?.parentElement;
  const nameInput = wrap?.querySelector("input[type=text]");
  if (nameInput instanceof HTMLInputElement) {
    nameInput.value = name;
  }

  const satuanInput = document.getElementById("rap-satuan");
  const hargaInput = document.getElementById("rap-harga");
  const txNama = document.getElementById("tx-nama");

  if (satuanInput instanceof HTMLInputElement) satuanInput.value = unit;
  if (hargaInput instanceof HTMLInputElement) {
    hargaInput.value = price.toString();
    calcRapSubtotal();
  }
  if (txNama instanceof HTMLInputElement && nameInput === txNama) {
    txNama.value = name;
  }

  showToast(`"${name}" dipilih — harga & satuan auto-filled`, "info");
}

/**
 * Handle "Buat baru" suggestion action.
 * @param {string} query
 * @param {string} dropdownId
 */
export function createNewSuggestion(query, dropdownId) {
  hideDropdown(dropdownId);
  showToast(`Buat baru "${query}" di Database Master`, "info");
}

/**
 * Activate suggestion at index for a dropdown.
 * @param {string} dropdownId
 * @param {number} index
 */
function activateSuggestion(dropdownId, index) {
  const state = dropdownState.get(dropdownId);
  if (!state) return;

  const item = state.items[index];
  if (!item) return;

  if (item.type === "material") {
    const m = item.data;
    selectSuggestion(m.name, m.unit, m.price, dropdownId);
  } else {
    createNewSuggestion(item.query, dropdownId);
  }
}

/**
 * Move keyboard focus within active dropdown.
 * @param {number} delta
 */
function moveFocus(delta) {
  if (!activeDropdownId) return;
  const dropdown = document.getElementById(activeDropdownId);
  const state = dropdownState.get(activeDropdownId);
  if (!dropdown || !state || dropdown.style.display === "none") return;

  const next = (state.focusIndex + delta + state.items.length) % state.items.length;
  state.focusIndex = next;
  updateFocusHighlight(dropdown, next);
}

/**
 * Wire click delegation for suggestion items.
 */
function setupClickDelegation() {
  document.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;

    const item = target.closest("[data-suggest-action]");
    if (!(item instanceof HTMLElement)) return;

    const dropdown = item.closest(".autosuggest-dropdown");
    if (!dropdown?.id) return;

    const index = Number(item.dataset.suggestIndex);
    if (Number.isNaN(index)) return;

    activateSuggestion(dropdown.id, index);
  });
}

/**
 * Wire keyboard navigation (ArrowUp/Down, Enter, Escape).
 */
function setupKeyboardNav() {
  document.addEventListener("keydown", (e) => {
    if (!activeDropdownId) return;

    const dropdown = document.getElementById(activeDropdownId);
    const state = dropdownState.get(activeDropdownId);
    if (!dropdown || !state || dropdown.style.display === "none") return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveFocus(1);
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      moveFocus(-1);
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      activateSuggestion(activeDropdownId, state.focusIndex);
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      hideDropdown(activeDropdownId);
    }
  });
}

/**
 * Close dropdowns when clicking outside autosuggest wrap.
 */
function setupClickOutside() {
  document.addEventListener("mousedown", (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    if (target.closest(".autosuggest-wrap")) return;
    hideAllDropdowns();
  });
}

/**
 * Initialize autosuggest — expose APP namespace hooks.
 */
export function initAutosuggest() {
  setupClickDelegation();
  setupKeyboardNav();
  setupClickOutside();

  window.APP = window.APP || {};
  window.APP.handleAutoSuggest = handleAutoSuggest;
  window.APP.selectSuggestion = selectSuggestion;
  window.APP.createNewSuggestion = createNewSuggestion;
  window.APP.calcRapSubtotal = calcRapSubtotal;
}
