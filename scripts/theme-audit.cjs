#!/usr/bin/env node
/**
 * Static theme audit — scans app/css for hardcoded colors.
 * Usage: node scripts/theme-audit.cjs
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CSS_DIR = path.join(ROOT, 'app', 'css');
const SKIP = new Set(['tokens.css', 'brand-tokens.css']);
const HEX_RE = /#(?:[0-9a-fA-F]{3,8})\b/g;
const RGB_RE = /rgba?\(\s*\d+/g;

function scanFile(filePath) {
  const rel = path.relative(ROOT, filePath);
  const text = fs.readFileSync(filePath, 'utf8');
  const hex = text.match(HEX_RE) || [];
  const rgb = text.match(RGB_RE) || [];
  const count = hex.length + rgb.length;
  if (count === 0) return null;
  return { file: rel, hex: hex.length, rgb: rgb.length, total: count };
}

function walk(dir, acc = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, acc);
    else if (name.endsWith('.css') && !SKIP.has(name)) acc.push(full);
  }
  return acc;
}

const results = walk(CSS_DIR)
  .map(scanFile)
  .filter(Boolean)
  .sort((a, b) => b.total - a.total);

const total = results.reduce((s, r) => s + r.total, 0);

console.log('Monefyi Theme Audit (static)\n');
console.log(`Files with hardcoded colors: ${results.length}`);
console.log(`Total hits (hex + rgb): ${total}\n`);
console.log('Top offenders:');
for (const r of results.slice(0, 15)) {
  console.log(`  ${String(r.total).padStart(4)}  ${r.file}  (#${r.hex} rgb:${r.rgb})`);
}

const threshold = Number(process.env.THEME_AUDIT_MAX || 800);
if (total > threshold) {
  console.error(`\nFAIL: ${total} hardcoded color hits exceeds threshold ${threshold}`);
  process.exit(1);
}

console.log(`\nOK: ${total} hits (threshold ${threshold})`);
