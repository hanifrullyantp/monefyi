/**
 * Monefyi Theme Manager — data-theme + body.theme-light sync.
 * @see docs/DESIGN_SYSTEM.md
 */
(function themeManagerFactory(global) {
  'use strict';

  const STORAGE_KEY = 'monefyi_theme';
  const META_LIGHT = '#FFFFFF';
  const META_DARK = '#0F172A';

  /**
   * @returns {'light' | 'dark'}
   */
  function detectSystemPreference() {
    return global.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  /**
   * @returns {'light' | 'dark' | 'auto'}
   */
  function getStoredPreference() {
    try {
      const v = global.localStorage.getItem(STORAGE_KEY);
      if (v === 'light' || v === 'dark' || v === 'auto') return v;
    } catch (_) { /* ignore */ }
    return 'auto';
  }

  /**
   * Resolved theme applied to DOM.
   * @returns {'light' | 'dark'}
   */
  function getResolvedTheme() {
    const pref = getStoredPreference();
    if (pref === 'auto') return detectSystemPreference();
    return pref;
  }

  /**
   * @returns {'light' | 'dark' | 'auto'}
   */
  function getCurrentTheme() {
    return getStoredPreference();
  }

  /**
   * Read chart colors from CSS tokens.
   * @returns {{ tick: string, legend: string, grid: string, income: string, expense: string }}
   */
  function getChartColors() {
    const style = getComputedStyle(document.documentElement);
    const pick = (name) => style.getPropertyValue(name).trim();
    return {
      tick: pick('--text-secondary') || '#94a3b8',
      legend: pick('--text-primary') || '#cbd5e1',
      grid: pick('--border-subtle') || 'rgba(255,255,255,.06)',
      income: pick('--finance-income') || '#10B981',
      expense: pick('--finance-expense') || '#EF4444',
    };
  }

  /**
   * @param {'light' | 'dark' | 'auto'} theme
   * @param {{ persist?: boolean }} [opts]
   */
  function setTheme(theme, opts = {}) {
    const pref = theme === 'light' || theme === 'dark' || theme === 'auto' ? theme : 'auto';
    const resolved = pref === 'auto' ? detectSystemPreference() : pref;

    if (opts.persist !== false) {
      try {
        global.localStorage.setItem(STORAGE_KEY, pref);
      } catch (_) { /* ignore */ }
    }

    document.documentElement.setAttribute('data-theme', resolved);
    document.body.classList.toggle('theme-light', resolved === 'light');

    const meta = document.getElementById('metaThemeColor');
    if (meta) meta.content = resolved === 'light' ? META_LIGHT : META_DARK;

    document.documentElement.style.colorScheme = resolved;

    global.dispatchEvent(
      new CustomEvent('theme-changed', { detail: { theme: pref, resolved } })
    );
  }

  /** Apply stored preference on first paint. */
  function initTheme() {
    const resolved = getResolvedTheme();
    setTheme(getStoredPreference(), { persist: false });
    if (document.documentElement.getAttribute('data-theme') !== resolved) {
      document.documentElement.setAttribute('data-theme', resolved);
      document.body.classList.toggle('theme-light', resolved === 'light');
    }

    try {
      global.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
        if (getStoredPreference() === 'auto') setTheme('auto', { persist: false });
      });
    } catch (_) { /* ignore */ }
  }

  global.MonefyiTheme = {
    detectSystemPreference,
    getCurrentTheme,
    getResolvedTheme,
    getChartColors,
    setTheme,
    initTheme,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTheme);
  } else {
    initTheme();
  }
})(window);
