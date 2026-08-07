#!/usr/bin/env node
/**
 * Component-level theme audit — scans CSS for hardcoded dark colors.
 * Usage: node scripts/component-theme-audit.cjs
 * Output: docs/AUDIT_COMPONENTS.md
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CSS_DIR = path.join(ROOT, 'app', 'css');
const OUT = path.join(ROOT, 'docs', 'AUDIT_COMPONENTS.md');

const DARK_COLORS = [
  '#0f172a', '#0F172A', '#131826', '#131A24', '#1E293B', '#334155',
  '#1a1a2e', '#16213e', '#171e2e', '#0B1118', '#131826',
];

const COMPONENT_MAP = [
  { pattern: /home-account-card|accountsBalancesRow/i, name: 'Account Cards (Dashboard)', priority: 'High' },
  { pattern: /kpiSection|kpi-metric|kpiIncome/i, name: 'KPI Cards (Pemasukan/Pengeluaran)', priority: 'High' },
  { pattern: /tx-card|txList|tx-group-header/i, name: 'Transaction Table', priority: 'High' },
  { pattern: /budget-list-card|blc-|budget-list-row/i, name: 'Daftar Budgeting Panel', priority: 'High' },
  { pattern: /mv-intervention|monevisor/i, name: 'Monevisor Card', priority: 'High' },
  { pattern: /neraca-recon|warning-banner/i, name: 'Warning Banner (Neraca)', priority: 'Medium' },
  { pattern: /settings-sec-btn|settings-tab/i, name: 'Tab Navigation (Settings)', priority: 'Medium' },
  { pattern: /sidebar-item|appSidebar/i, name: 'Sidebar Active State', priority: 'Low' },
  { pattern: /empty-state|txEmpty|blc-empty/i, name: 'Empty States', priority: 'Medium' },
  { pattern: /icon-container|tx-icon|neraca.*icon/i, name: 'Icon Containers', priority: 'Medium' },
];

const HEX_RE = /#(?:[0-9a-fA-F]{3,8})\b/g;
const RGB_RE = /rgba?\(\s*\d+/g;

function walk(dir, acc = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, acc);
    else if (name.endsWith('.css')) acc.push(full);
  }
  return acc;
}

function extractHits(text) {
  const hits = new Set();
  for (const m of text.match(HEX_RE) || []) hits.add(m);
  for (const m of text.match(RGB_RE) || []) hits.add(m.slice(0, 40));
  return [...hits];
}

function isDarkHit(hit) {
  const lower = hit.toLowerCase();
  if (DARK_COLORS.some((c) => lower.includes(c.toLowerCase()))) return true;
  const rgb = hit.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  if (rgb) {
    const [, r, g, b] = rgb.map(Number);
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return lum < 0.15;
  }
  return false;
}

function suggestToken(hit) {
  if (/border/i.test(hit)) return 'var(--card-border) or var(--border-subtle)';
  if (/background/i.test(hit) || hit.startsWith('#') || hit.startsWith('rgb'))
    return 'var(--card-bg) or var(--bg-secondary)';
  return 'var(--text-primary) or var(--text-secondary)';
}

const files = walk(CSS_DIR);
const components = new Map();

for (const file of files) {
  const rel = path.relative(ROOT, file);
  const text = fs.readFileSync(file, 'utf8');
  const hits = extractHits(text).filter(isDarkHit);
  if (!hits.length) continue;

  for (const { pattern, name, priority } of COMPONENT_MAP) {
    if (!pattern.test(text) && !pattern.test(path.basename(file))) continue;
    const key = name;
    if (!components.has(key)) {
      components.set(key, { name, priority, files: [], colors: new Set() });
    }
    const entry = components.get(key);
    if (!entry.files.includes(rel)) entry.files.push(rel);
    hits.forEach((h) => entry.colors.add(h));
  }
}

const priorityOrder = { High: 0, Medium: 1, Low: 2 };
const rows = [...components.values()].sort(
  (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
);

let md = `# AUDIT_COMPONENTS — Theme Hardcoded Colors\n\n`;
md += `Generated: ${new Date().toISOString().slice(0, 10)}\n\n`;
md += `Scan target: \`app/css/**\` for dark hardcoded colors.\n\n`;
md += `| Component | Priority | Files | Dark colors found | Suggested token |\n`;
md += `|-----------|----------|-------|-------------------|-----------------|\n`;

for (const row of rows) {
  const colors = [...row.colors].slice(0, 5).join(', ');
  const files = row.files.slice(0, 3).join(', ');
  const token = suggestToken([...row.colors][0] || '');
  md += `| ${row.name} | ${row.priority} | ${files} | ${colors || '—'} | ${token} |\n`;
}

md += `\n## Remaining global offenders\n\n`;
const global = files
  .map((f) => {
    const text = fs.readFileSync(f, 'utf8');
    const dark = extractHits(text).filter(isDarkHit);
    return dark.length ? { file: path.relative(ROOT, f), count: dark.length } : null;
  })
  .filter(Boolean)
  .sort((a, b) => b.count - a.count)
  .slice(0, 15);

for (const g of global) {
  md += `- \`${g.file}\` — ${g.count} dark color hits\n`;
}

md += `\n## Run audit\n\n\`\`\`bash\nnode scripts/component-theme-audit.cjs\nnpm run audit:theme\n\`\`\`\n`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, md);
console.log(`Wrote ${OUT} (${rows.length} components)`);
