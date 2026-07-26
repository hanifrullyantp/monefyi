/**
 * Track unsaved budget changes with undo/redo stack.
 * @module services/budget-changes-tracker
 */

const MAX_STACK = 20;
const _undoStack = [];
const _redoStack = [];
const _listeners = new Set();
let _isDirty = false;
/** Uncommitted in-session edits (slider typing) before undo stack entry */
let _sessionDirty = false;

/**
 * @param {object} change
 */
export function recordChange(change) {
  _undoStack.push({ ...change, timestamp: Date.now() });
  if (_undoStack.length > MAX_STACK) _undoStack.shift();
  _redoStack.length = 0;
  _isDirty = true;
  _notify();
}

export function canUndo() {
  return _undoStack.length > 0;
}

export function canRedo() {
  return _redoStack.length > 0;
}

export async function undo() {
  if (!_undoStack.length) return null;
  const change = _undoStack.pop();
  _redoStack.push(change);
  try {
    if (change.undo) await change.undo();
  } catch (e) {
    console.error('[changes] Undo failed:', e);
  }
  _isDirty = _undoStack.length > 0;
  _notify();
  return change;
}

export async function redo() {
  if (!_redoStack.length) return null;
  const change = _redoStack.pop();
  _undoStack.push(change);
  try {
    if (change.redo) await change.redo();
  } catch (e) {
    console.error('[changes] Redo failed:', e);
  }
  _isDirty = true;
  _notify();
  return change;
}

export function clearChanges() {
  _undoStack.length = 0;
  _redoStack.length = 0;
  _isDirty = false;
  _sessionDirty = false;
  _notify();
}

/** @param {boolean} [value] */
export function markSessionDirty(value = true) {
  _sessionDirty = !!value;
  _notify();
}

export function isDirty() {
  return _isDirty || _sessionDirty;
}

export function getState() {
  return {
    canUndo: canUndo(),
    canRedo: canRedo(),
    isDirty: isDirty(),
    undoCount: _undoStack.length,
    redoCount: _redoStack.length,
    lastChange: _undoStack[_undoStack.length - 1] || null,
  };
}

/**
 * @param {(state: object) => void} callback
 * @returns {() => void}
 */
export function onChange(callback) {
  _listeners.add(callback);
  return () => _listeners.delete(callback);
}

function _notify() {
  const state = getState();
  _listeners.forEach((cb) => { try { cb(state); } catch { /* ignore */ } });
}

/**
 * Record budget draft mutation with undo/redo.
 * @param {string} [label]
 * @param {object[]} beforeRows
 * @param {object[]} afterRows
 */
export function recordBudgetRowsChange(label, beforeRows, afterRows) {
  const state = typeof window !== 'undefined' ? window.STATE : null;
  if (!state?.budgetDraft) return;

  const before = JSON.parse(JSON.stringify(beforeRows || []));
  const after = JSON.parse(JSON.stringify(afterRows || []));

  recordChange({
    label: label || 'Edit budget',
    undo: async () => {
      state.budgetDraft.rows = JSON.parse(JSON.stringify(before));
      if (typeof window.renderBudgetPageView === 'function') await window.renderBudgetPageView();
    },
    redo: async () => {
      state.budgetDraft.rows = JSON.parse(JSON.stringify(after));
      if (typeof window.renderBudgetPageView === 'function') await window.renderBudgetPageView();
    },
  });
}

if (typeof window !== 'undefined') {
  window.monefyiChanges = {
    recordChange,
    recordBudgetRowsChange,
    canUndo,
    canRedo,
    undo,
    redo,
    clearChanges,
    markSessionDirty,
    isDirty,
    getState,
    onChange,
  };
}
