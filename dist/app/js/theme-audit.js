/**
 * Theme compliance audit — run in browser console: MonefyiThemeAudit.run()
 */
(function themeAuditFactory(global) {
  'use strict';

  const HEX_RE = /#(?:[0-9a-fA-F]{3,8})\b/g;
  const RGB_RE = /rgba?\(\s*\d+/g;
  const SKIP_FILES = ['tokens.css', 'brand-tokens.css'];

  function scanHardcodedColors() {
    const violations = [];
    const byFile = {};

    for (const sheet of [...document.styleSheets]) {
      let href = '';
      try {
        href = sheet.href || 'inline';
      } catch (_) {
        href = 'blocked';
      }
      if (SKIP_FILES.some((f) => href.includes(f))) continue;

      let rules;
      try {
        rules = sheet.cssRules;
      } catch (_) {
        continue;
      }
      if (!rules) continue;

      for (const rule of rules) {
        if (!rule.cssText) continue;
        const hex = rule.cssText.match(HEX_RE) || [];
        const rgb = rule.cssText.match(RGB_RE) || [];
        const hits = [...hex, ...rgb];
        if (!hits.length) continue;
        const key = href.split('/').pop() || href;
        byFile[key] = (byFile[key] || 0) + hits.length;
        for (const m of hits) {
          violations.push({ source: key, match: m });
        }
      }
    }

    for (const el of document.querySelectorAll('[style*="color"], [style*="background"]')) {
      const style = el.getAttribute('style') || '';
      HEX_RE.lastIndex = 0;
      RGB_RE.lastIndex = 0;
      if (HEX_RE.test(style) || RGB_RE.test(style)) {
        violations.push({ source: 'inline', match: style.slice(0, 80) });
        byFile.inline = (byFile.inline || 0) + 1;
      }
    }

    return { violations, byFile, count: violations.length };
  }

  function checkContrast() {
    const failures = [];
    const parse = (c) => {
      const d = document.createElement('div');
      d.style.color = c;
      document.body.appendChild(d);
      const rgb = getComputedStyle(d).color.match(/\d+/g)?.map(Number) || [0, 0, 0];
      d.remove();
      return rgb;
    };
    const lum = ([r, g, b]) => {
      const f = (v) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const ratio = (fg, bg) => {
      const L1 = lum(fg);
      const L2 = lum(bg);
      return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    };

    for (const el of document.querySelectorAll('p, span, h1, h2, h3, label, button, a, td, th')) {
      if (!el.offsetParent && el !== document.body) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const fg = parse(cs.color);
      let bgEl = el;
      let bg = [11, 17, 24];
      while (bgEl && bgEl !== document.body) {
        const bcs = getComputedStyle(bgEl);
        if (bcs.backgroundColor && bcs.backgroundColor !== 'rgba(0, 0, 0, 0)') {
          bg = parse(bcs.backgroundColor);
          break;
        }
        bgEl = bgEl.parentElement;
      }
      const r = ratio(fg, bg);
      const fs = parseFloat(cs.fontSize) || 14;
      const minRatio = fs >= 18 || cs.fontWeight >= 700 ? 3 : 4.5;
      if (r < minRatio) {
        failures.push({
          el: `${el.tagName}.${String(el.className).slice(0, 40)}`,
          ratio: Math.round(r * 100) / 100,
          fontSize: fs,
        });
      }
    }
    return { failures, count: failures.length };
  }

  /**
   * Toggle light/dark and collect contrast stats for both themes.
   * @returns {Promise<{ light: object, dark: object }>}
   */
  async function testBothThemes() {
    const tm = global.MonefyiTheme;
    const prev = tm?.getCurrentTheme?.() || (document.body.classList.contains('theme-light') ? 'light' : 'dark');
    const out = {};

    for (const theme of ['light', 'dark']) {
      if (tm) tm.setTheme(theme, { persist: false });
      else {
        document.body.classList.toggle('theme-light', theme === 'light');
        document.documentElement.setAttribute('data-theme', theme);
      }
      await new Promise((r) => setTimeout(r, 120));
      out[theme] = checkContrast();
    }

    if (tm) tm.setTheme(prev, { persist: false });
    else {
      document.body.classList.toggle('theme-light', prev === 'light');
      document.documentElement.setAttribute('data-theme', prev);
    }

    return out;
  }

  function run() {
    const colors = scanHardcodedColors();
    const contrast = checkContrast();
    console.group('Monefyi Theme Audit');
    console.log('Theme:', document.documentElement.getAttribute('data-theme') || 'dark');
    console.log('Hardcoded color hits:', colors.count);
    console.table(Object.entries(colors.byFile).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([file, n]) => ({ file, hits: n })));
    console.log('Low contrast:', contrast.count);
    console.table(contrast.failures.slice(0, 25));
    console.log('Tip: await MonefyiThemeAudit.testBothThemes() for light+dark pass');
    console.groupEnd();
    return { colors, contrast };
  }

  global.MonefyiThemeAudit = { scanHardcodedColors, checkContrast, testBothThemes, run };
})(window);
