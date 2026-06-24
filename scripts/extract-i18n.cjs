#!/usr/bin/env node
/** Extract I18N from js/app.js → locales/id.json + locales/en.json */
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '../app/js/app.js'), 'utf8');
const start = src.indexOf('const I18N = {');
const end = src.indexOf('\n    function t(key, vars)', start);
if (start < 0 || end < 0) {
  console.error('I18N block not found');
  process.exit(1);
}
const block = src.slice(start + 'const I18N = '.length, end).trim().replace(/;\s*$/, '');
// eslint-disable-next-line no-eval
const I18N = eval('(' + block + ')');
const out = path.join(__dirname, '../locales');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'id.json'), JSON.stringify(I18N.id, null, 2) + '\n');
fs.writeFileSync(path.join(out, 'en.json'), JSON.stringify(I18N.en, null, 2) + '\n');
console.log('Extracted', Object.keys(I18N.id).length, 'keys → locales/');
