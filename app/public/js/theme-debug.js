/**
 * Runtime theme debug utilities — browser console:
 *   themeDebug.highlightHardcoded()
 *   themeDebug.highlightLowContrast()
 *   themeDebug.toggleTheme()
 *   themeDebug.reset()
 */
(function initThemeDebug(global) {
  'use strict';

  /**
   * @param {string} color
   * @returns {number|null} relative luminance 0–1
   */
  function parseLuminance(color) {
    const m = color.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/);
    if (!m) return null;
    const channels = [m[1], m[2], m[3]].map((v) => {
      const c = Number(v) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  }

  /**
   * @param {string} color
   * @returns {boolean}
   */
  function isColorDark(color) {
    if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') return false;
    const lum = parseLuminance(color);
    return lum != null && lum < 0.35;
  }

  /**
   * @param {number} l1
   * @param {number} l2
   * @returns {number}
   */
  function contrastRatio(l1, l2) {
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * @param {Element} el
   * @returns {string}
   */
  function effectiveBackground(el) {
    let node = el;
    while (node && node !== document.documentElement) {
      const bg = global.getComputedStyle(node).backgroundColor;
      if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg;
      node = node.parentElement;
    }
    return global.getComputedStyle(document.body).backgroundColor;
  }

  const themeDebug = {
    highlightHardcoded() {
      const isLight =
        document.documentElement.getAttribute('data-theme') === 'light' ||
        document.body.classList.contains('theme-light');
      if (!isLight) {
        console.warn('[themeDebug] Switch to light mode first for meaningful results.');
      }
      let count = 0;
      document.querySelectorAll('*').forEach((el) => {
        const style = global.getComputedStyle(el);
        const bg = style.backgroundColor;
        if (isLight && isColorDark(bg)) {
          el.style.outline = '2px solid #ef4444';
          el.setAttribute('data-theme-issue', 'dark-bg-in-light-mode');
          count += 1;
        }
      });
      console.info(`[themeDebug] Highlighted ${count} elements with dark background in light mode.`);
      return count;
    },

    highlightLowContrast(minRatio = 4.5) {
      let count = 0;
      document.querySelectorAll('*').forEach((el) => {
        const text = (el.textContent || '').trim();
        if (!text || el.children.length > 0) return;
        const style = global.getComputedStyle(el);
        const fg = parseLuminance(style.color);
        const bg = parseLuminance(effectiveBackground(el));
        if (fg == null || bg == null) return;
        const ratio = contrastRatio(fg, bg);
        if (ratio < minRatio) {
          el.style.outline = '2px dashed #f59e0b';
          el.setAttribute('data-theme-issue', 'low-contrast');
          count += 1;
          console.warn('[themeDebug] Low contrast:', ratio.toFixed(2), el, text.slice(0, 40));
        }
      });
      console.info(`[themeDebug] Highlighted ${count} low-contrast text nodes.`);
      return count;
    },

    toggleTheme() {
      const root = document.documentElement;
      const current = root.getAttribute('data-theme') || 'dark';
      const next = current === 'light' ? 'dark' : 'light';
      if (global.MonefyiTheme?.setTheme) {
        global.MonefyiTheme.setTheme(next);
      } else {
        root.setAttribute('data-theme', next);
        document.body.classList.toggle('theme-light', next === 'light');
      }
      console.info(`[themeDebug] Theme → ${next}`);
      return next;
    },

    reset() {
      document.querySelectorAll('[data-theme-issue]').forEach((el) => {
        el.style.outline = '';
        el.removeAttribute('data-theme-issue');
      });
      console.info('[themeDebug] Cleared highlights.');
    },
  };

  global.themeDebug = themeDebug;
})(window);
