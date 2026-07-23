/**
 * Floating save bar — undo/redo/save when budget draft is dirty.
 * @module components/floating-save-bar
 */

import { Icon } from './icons.js';
import { onChange, undo, redo, clearChanges, getState } from '../services/budget-changes-tracker.js';

/** @type {HTMLElement|null} */
let _bar = null;

/** @type {boolean} */
let _keysWired = false;

/**
 * @param {() => Promise<void>|void} onSave
 * @returns {HTMLElement}
 */
export function initFloatingSaveBar(onSave) {
  if (_bar) return _bar;

  _bar = document.createElement('div');
  _bar.className = 'floating-save-bar';
  _bar.style.display = 'none';
  _bar.innerHTML = `
    <div class="fsb-content">
      <div class="fsb-info">
        <span class="fsb-icon">${Icon('edit', { size: 14 })}</span>
        <span class="fsb-text" id="fsb-text">Ada perubahan belum disimpan</span>
      </div>
      <div class="fsb-actions">
        <button type="button" class="fsb-btn fsb-undo" data-action="undo" title="Undo">${Icon('undo', { size: 16 })}</button>
        <button type="button" class="fsb-btn fsb-redo" data-action="redo" title="Redo">${Icon('redo', { size: 16 })}</button>
        <button type="button" class="fsb-btn fsb-save" data-action="save">${Icon('save', { size: 14 })}<span>Simpan</span></button>
      </div>
    </div>
  `;

  document.body.appendChild(_bar);

  const update = (state) => {
    if (state.isDirty || state.canUndo || state.canRedo) {
      _bar.style.display = 'block';
      requestAnimationFrame(() => _bar.classList.add('show'));
    } else {
      _bar.classList.remove('show');
      setTimeout(() => {
        if (!getState().isDirty && !getState().canUndo) _bar.style.display = 'none';
      }, 300);
    }

    _bar.querySelector('.fsb-undo').disabled = !state.canUndo;
    _bar.querySelector('.fsb-redo').disabled = !state.canRedo;
    _bar.querySelector('.fsb-save').disabled = !state.isDirty;

    const text = _bar.querySelector('#fsb-text');
    if (text) {
      text.textContent = state.undoCount > 0
        ? `${state.undoCount} perubahan belum disimpan`
        : 'Ada perubahan belum disimpan';
    }
  };

  update(getState());
  onChange(update);

  _bar.querySelector('[data-action="undo"]').onclick = () => undo();
  _bar.querySelector('[data-action="redo"]').onclick = () => redo();
  _bar.querySelector('[data-action="save"]').onclick = async () => {
    if (!onSave) return;
    try {
      await onSave();
      clearChanges();
      showSaveToast();
    } catch (e) {
      console.error('[fsb] Save failed:', e);
    }
  };

  if (!_keysWired) {
    _keysWired = true;
    document.addEventListener('keydown', (e) => {
      if (!window.STATE?.ui?.budgetPageOpen) return;
      const cmd = e.metaKey || e.ctrlKey;
      if (!cmd) return;
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      else if ((e.key === 'z' && e.shiftKey) || e.key === 'Z') { e.preventDefault(); redo(); }
      else if (e.key === 's') { e.preventDefault(); _bar.querySelector('[data-action="save"]')?.click(); }
    });
  }

  return _bar;
}

function showSaveToast() {
  const msg = 'Perubahan tersimpan';
  if (window.MonefyiUI?.showToast) return window.MonefyiUI.showToast(msg, 'success');
  if (typeof window.showToast === 'function') return window.showToast(msg, 'success');
  const t = document.createElement('div');
  t.className = 'action-toast success';
  t.innerHTML = `${Icon('check', { size: 14 })} ${msg}`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

export function hideFloatingSaveBar() {
  if (_bar) {
    _bar.classList.remove('show');
    setTimeout(() => { _bar.style.display = 'none'; }, 300);
  }
}

if (typeof window !== 'undefined') {
  window.monefyiFloatingSave = { initFloatingSaveBar, hideFloatingSaveBar };
}
