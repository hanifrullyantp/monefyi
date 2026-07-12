// =====================================================
// PROJECT PLANNER — State Store
// Subscribe/publish + localStorage persistence
// Phase 2.1.5
// =====================================================

import { APP_DATA } from "./data/mock-data.js";
import { deepClone } from "./utils.js";

const STORAGE_KEY = "monefyi-planner-state-v1";
const SIDEBAR_KEY = "sidebarCollapsed";

/** @type {Set<(state: AppState) => void>} */
const listeners = new Set();

/**
 * @typedef {typeof APP_DATA} AppData
 * @typedef {{
 *   currentRoute: string;
 *   currentProjectId: number | null;
 *   currentProjectTab: string;
 *   currentFinanceTab: string;
 *   currentDatabaseTab: string;
 *   pendingChanges: number;
 *   undoStack: unknown[];
 *   redoStack: unknown[];
 *   data: AppData;
 * }} AppState
 */

/** @type {AppState} */
let state = createInitialState();

/**
 * Build default state from mock data.
 * @returns {AppState}
 */
function createInitialState() {
  return {
    currentRoute: "dashboard",
    currentProjectId: null,
    currentProjectTab: "overview",
    currentFinanceTab: "overview",
    currentDatabaseTab: "bahan",
    pendingChanges: 0,
    undoStack: [],
    redoStack: [],
    data: deepClone(APP_DATA),
  };
}

/**
 * Load persisted state from localStorage.
 * @returns {AppState | null}
 */
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.data?.business || !parsed?.data?.projects) return null;
    return { ...createInitialState(), ...parsed, data: parsed.data };
  } catch (err) {
    console.error("[store] Failed to load state:", err);
    return null;
  }
}

/**
 * Persist current state to localStorage.
 */
function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      currentRoute: state.currentRoute,
      currentProjectId: state.currentProjectId,
      currentProjectTab: state.currentProjectTab,
      currentFinanceTab: state.currentFinanceTab,
      currentDatabaseTab: state.currentDatabaseTab,
      data: state.data,
    }));
  } catch (err) {
    console.error("[store] Failed to persist state:", err);
  }
}

/**
 * Initialize store — load from localStorage or seed from mock data.
 */
export function initStore() {
  const saved = loadFromStorage();
  if (saved) state = saved;
  else persist();
}

/**
 * Get current state snapshot.
 * @returns {AppState}
 */
export function getState() {
  return state;
}

/**
 * Subscribe to state changes.
 * @param {(state: AppState) => void} fn
 * @returns {() => void} unsubscribe
 */
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Notify all subscribers.
 */
function notify() {
  listeners.forEach((fn) => fn(state));
}

/**
 * Merge partial state update and persist.
 * @param {Partial<AppState>} partial
 */
export function setState(partial) {
  state = { ...state, ...partial };
  persist();
  notify();
}

/**
 * Mutate app data in place, then persist.
 * @param {(data: AppData) => void} mutator
 */
export function updateData(mutator) {
  mutator(state.data);
  persist();
  notify();
}

/**
 * Reset data to mock seed (dev helper).
 */
export function resetData() {
  state.data = deepClone(APP_DATA);
  persist();
  notify();
}

/**
 * Get/set sidebar collapsed preference.
 * @param {boolean} [collapsed]
 * @returns {boolean}
 */
export function sidebarCollapsed(collapsed) {
  if (collapsed !== undefined) {
    localStorage.setItem(SIDEBAR_KEY, collapsed ? "true" : "false");
    return collapsed;
  }
  return localStorage.getItem(SIDEBAR_KEY) === "true";
}

/**
 * Sync state from API response (PostgreSQL via /api/sync).
 * @param {object} apiData
 */
export function mergeApiData(apiData) {
  // Only merge when API returns compatible shape (avoids empty DB overwrite)
  if (apiData.projects?.length > 0 && apiData.projects[0]?.name) {
    state.data.projects = apiData.projects;
  }
  if (apiData.database?.materials?.length > 0) {
    state.data.database.materials = apiData.database.materials;
  }
  if (apiData.database?.workers?.length > 0) {
    state.data.database.workers = apiData.database.workers;
  }
  if (apiData.business?.accounts?.length > 0) {
    state.data.business.accounts = apiData.business.accounts;
  }
  persist();
  notify();
}

/**
 * Persist a change to the server.
 * @param {string} type
 * @param {object} data
 */
export async function persistToServer(type, data) {
  try {
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, data }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { success: true };
  } catch (err) {
    console.error("[store] persistToServer failed:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Fetch data from server and merge.
 */
export async function syncFromServer() {
  try {
    const res = await fetch("/api/sync");
    const result = await res.json();
    if (result.error) throw new Error(result.error);
    mergeApiData(result);
    return { success: true };
  } catch (err) {
    console.error("[store] syncFromServer failed:", err);
    return { success: false, error: err.message };
  }
}
