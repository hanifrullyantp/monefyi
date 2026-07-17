/**
 * IndexedDB-backed undo/redo stack for local CRUD actions.
 * @module services/undo-redo
 */

import { getDb } from './offline-db.js';

const MAX_UNDO = 50;
/** @type {object[]} */
let _redoStack = [];
/** @type {Set<() => void>} */
const _listeners = new Set();

/**
 * @param {object} entry
 */
export async function pushAction(entry) {
  try {
    const db = await getDb();
    if (!db.undo_stack) return;

    await db.undo_stack.add({
      action: entry.action,
      entityType: entry.entityType || 'transaction',
      entityId: entry.entityId,
      before: entry.before ?? null,
      after: entry.after ?? null,
      createdAt: new Date().toISOString(),
    });

    const count = await db.undo_stack.count();
    if (count > MAX_UNDO) {
      const excess = count - MAX_UNDO;
      const oldest = await db.undo_stack.orderBy('id').limit(excess).toArray();
      await db.undo_stack.bulkDelete(oldest.map((e) => e.id));
    }

    _redoStack = [];
    notifyListeners();
  } catch (e) {
    console.warn('[undo] push failed:', e.message);
  }
}

/**
 * @returns {Promise<boolean>}
 */
export async function canUndo() {
  try {
    const db = await getDb();
    if (!db.undo_stack) return false;
    return (await db.undo_stack.count()) > 0;
  } catch {
    return false;
  }
}

/**
 * @returns {boolean}
 */
export function canRedo() {
  return _redoStack.length > 0;
}

/**
 * @returns {Promise<boolean>}
 */
export async function undo() {
  const handlers = window.monefyiUndoHandlers;
  if (!handlers) return false;

  try {
    const db = await getDb();
    if (!db.undo_stack) return false;

    const last = await db.undo_stack.orderBy('id').last();
    if (!last) return false;

    await db.undo_stack.delete(last.id);
    _redoStack.push(last);

    if (last.action === 'delete' && last.before) {
      await handlers.restoreTransaction?.(last.before);
    } else if (last.action === 'create' && last.entityId) {
      await handlers.removeTransaction?.(last.entityId);
    } else if (last.action === 'update' && last.before) {
      await handlers.restoreTransaction?.(last.before);
    }

    window.monefyiActivity?.logActivity?.({
      action: 'undo',
      entityType: last.entityType,
      entityId: last.entityId,
      summary: `Undo ${last.action}`,
    });

    notifyListeners();
    return true;
  } catch (e) {
    console.warn('[undo] failed:', e.message);
    return false;
  }
}

/**
 * @returns {Promise<boolean>}
 */
export async function redo() {
  const handlers = window.monefyiUndoHandlers;
  if (!handlers || _redoStack.length === 0) return false;

  const entry = _redoStack.pop();

  try {
    const db = await getDb();
    if (db.undo_stack) await db.undo_stack.add(entry);

    if (entry.action === 'delete' && entry.entityId) {
      await handlers.removeTransaction?.(entry.entityId);
    } else if (entry.action === 'create' && entry.after) {
      await handlers.restoreTransaction?.(entry.after);
    } else if (entry.action === 'update' && entry.after) {
      await handlers.restoreTransaction?.(entry.after);
    }

    window.monefyiActivity?.logActivity?.({
      action: 'redo',
      entityType: entry.entityType,
      entityId: entry.entityId,
      summary: `Redo ${entry.action}`,
    });

    notifyListeners();
    return true;
  } catch (e) {
    console.warn('[redo] failed:', e.message);
    return false;
  }
}

/**
 * @param {() => void} cb
 * @returns {() => void}
 */
export function onUndoChange(cb) {
  _listeners.add(cb);
  return () => _listeners.delete(cb);
}

function notifyListeners() {
  _listeners.forEach((cb) => {
    try {
      cb();
    } catch {
      /* ignore */
    }
  });
}

if (typeof window !== 'undefined') {
  window.monefyiUndo = { pushAction, undo, redo, canUndo, canRedo, onUndoChange };
}
