/**
 * Theme compliance audit — run in browser console: MonefyiThemeAudit.run()
 */
(function themeAuditFactory(global) {
  'use strict';

  const HEX_RE = /#(?:[0-9a-fA-F]{3,8})\b/g;
  const RGB_RE = /rgba?\(\s*\d+/g;
  const SKIP_FILES = ['tokens.css', 'brand-tokens.css'];

  /**
   * Scan inline styles and computed hardcoded colors in stylesheets.
   * @returns {{ violations: Array<{ source: string, match: string }> }}
   */
  function scanHardcodedColors() {
    const violations = [];
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
        for (const m of [...hex, ...rgb]) {
          violations.push({ source: href, match: m });
        }
      }
    }

    for (const el of document.querySelectorAll('[style*="color"], [style*="background"]')) {
      const style = el.getAttribute('style') || '';
      if (HEX_RE.test(style) || RGB_RE.test(style)) {
        violations.push({ source: el.tagName.toLowerCase(), match: style.slice(0, 80) });
      }
    }

    return { violations, count: violations.length };
  }

  /**
   * Rough contrast check for visible text nodes.
   * @returns {{ failures: Array<{ el: string, ratio: number }> }}
   */
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

    for (const el of document.querySelectorAll('p, span, h1, h2, h3, label, button, a')) {
      if (!el.offsetParent && el !== document.body) continue;
      const cs = getComputedStyle(el);
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
      if (r < 4.5 && cs.fontSize && parseFloat(cs.fontSize) < 24) {
        failures.push({ el: `${el.tagName}.${el.className}`.slice(0, 60), ratio: Math.round(r * 100) / 100 });
      }
    }
    return { failures, count: failures.length };
  }

  function run() {
    const colors = scanHardcodedColors();
    const contrast = checkContrast();
    console.group('Monefyi Theme Audit');
    console.log('Hardcoded color hits:', colors.count);
    console.table(colors.violations.slice(0, 50));
    console.log('Low contrast (<4.5:1):', contrast.count);
    console.table(contrast.failures.slice(0, 30));
    console.groupEnd();
    return { colors, contrast };
  }

  global.MonefyiThemeAudit = { scanHardcodedColors, checkContrast, run };
})(window);
