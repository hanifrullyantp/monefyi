const fs = require('fs');
const path = require('path');

function normalizeText(t){ return String(t||'').toLowerCase().replace(/\s+/g,' ').trim(); }
function parseAmountFlexible(v){
  let s = String(v ?? '').trim().replace(/[^\d,.-]/g, '');
  if (!s) return 0;
  const hasComma = s.includes(',');
  const hasDot = s.includes('.');
  if (hasComma && hasDot) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (hasComma) s = s.replace(/,/g, '');
  else if (hasDot) {
    const p = s.split('.');
    if (!(p.length === 2 && p[1].length <= 2)) s = s.replace(/\./g, '');
  }
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n) : 0;
}
function splitDateBlocks(content){
  const lines = String(content || '').split(/\r?\n/);
  const re = /^(Senin|Selasa|Rabu|Kamis|Jumat|Jum'at|Sabtu|Minggu)[,\s]+(\d{1,2})\/(\d{1,2})\/(\d{4})/i;
  const out = [];
  let cur = null;
  for (const line of lines) {
    const m = line.trim().match(re);
    if (m) {
      if (cur) out.push(cur);
      const d = `${m[4]}-${String(Number(m[3])).padStart(2,'0')}-${String(Number(m[2])).padStart(2,'0')}`;
      cur = { date: d, rows: [] };
      continue;
    }
    if (cur) cur.rows.push(line);
  }
  if (cur) out.push(cur);
  return out;
}
function parse(content){
  const blocks = splitDateBlocks(content);
  const txs = [];
  for (const b of blocks) {
    let dir = 'expense';
    for (const row of b.rows) {
      const t = row.trim();
      if (/^duit\s+masuk/i.test(t)) { dir = 'income'; continue; }
      if (/^duit\s+keluar/i.test(t)) { dir = 'expense'; continue; }
      if (!t.startsWith('-')) continue;
      const nominalM = t.match(/(\d[\d.,]*)/);
      txs.push({ date: b.date, type: dir, amount: parseAmountFlexible(nominalM?.[1] || 0), raw: t });
    }
  }
  return { blocks, txs };
}

const fixture = path.join(__dirname, 'fixtures', 'wa-batch-sample.txt');
const raw = fs.readFileSync(fixture, 'utf8');
const t0 = Date.now();
const result = parse(raw);
const elapsed = Date.now() - t0;

if (result.blocks.length < 2) throw new Error('Expected multi date blocks');
if (!result.txs.length) throw new Error('No transactions parsed');
if (!result.txs.find((x) => x.amount === 949999)) throw new Error('Amount parse failed for 949.999');
if (!result.txs.find((x) => x.type === 'income')) throw new Error('Income direction parse failed');
if (elapsed > 50) console.warn(`Benchmark warning: ${elapsed}ms`);

console.log('batch parser benchmark OK');
console.log(JSON.stringify({ blocks: result.blocks.length, transactions: result.txs.length, elapsed_ms: elapsed }, null, 2));
