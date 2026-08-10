#!/usr/bin/env node
/**
 * Generate accuracy-test-4month transaction fixtures with exact category totals.
 * Run: node scripts/fixtures/accuracy-test-4month/generate-fixtures.cjs
 */
const fs = require('node:fs');
const path = require('node:path');

const OUT_DIR = __dirname;

/**
 * @param {string} month YYYY-MM
 * @param {number} day
 */
function dateKey(month, day) {
  return `${month}-${String(day).padStart(2, '0')}`;
}

let txCounter = 0;

/**
 * @param {object} partial
 */
function mkTx(partial) {
  txCounter += 1;
  return {
    id: partial.id || `acc-tx-${partial.date}-${txCounter}`,
    type: partial.type || 'expense',
    currency: 'IDR',
    status: partial.status || 'confirmed',
    confirmed_at: partial.status === 'pending' ? null : `${partial.date}T12:00:00.000Z`,
    meta: partial.meta || { source: 'accuracy-fixture' },
    payment_method: partial.account || 'BCA',
    ...partial,
  };
}

/**
 * Split total into n parts with exact sum.
 * @param {number} total
 * @param {number} n
 */
function splitAmount(total, n) {
  const base = Math.floor(total / n);
  const parts = Array(n).fill(base);
  let rem = total - base * n;
  for (let i = 0; parts[i] != null && rem > 0; i += 1, rem -= 1) {
    parts[i] += 1;
  }
  return parts;
}

/**
 * @param {string} month
 * @param {Record<string, number>} categoryTotals
 * @param {object} [opts]
 */
function buildMonthTransactions(month, categoryTotals, opts = {}) {
  const txs = [];
  const incomeDay = opts.incomeDay ?? 25;

  if (opts.income > 0) {
    txs.push(mkTx({
      id: `acc-tx-${month}-income`,
      date: dateKey(month, incomeDay),
      type: 'income',
      amount: opts.income,
      category: 'Gaji',
      merchant: 'Gaji Bulanan',
      account: 'BCA',
    }));
  }

  const fixedMap = {
    Kost: { day: 1, account: 'BCA', merchant: 'Kost' },
    Listrik: { day: 5, account: 'BCA', merchant: 'PLN' },
    Internet: { day: 10, account: 'BCA', merchant: 'Indihome' },
    'Cicilan HP': { day: 15, account: 'BCA', merchant: 'Cicilan HP' },
  };

  for (const [cat, total] of Object.entries(categoryTotals)) {
    if (!total || total <= 0) continue;

    if (fixedMap[cat]) {
      const f = fixedMap[cat];
      txs.push(mkTx({
        date: dateKey(month, f.day),
        amount: total,
        category: cat,
        merchant: f.merchant,
        account: f.account,
        meta: { expense_treatment: cat === 'Cicilan HP' ? 'loan_payment' : 'consumption' },
      }));
      continue;
    }

    if (cat === 'Tabungan' || cat === 'Dana Darurat') {
      txs.push(mkTx({
        date: dateKey(month, incomeDay),
        amount: total,
        category: cat,
        merchant: `Transfer ${cat}`,
        account: 'BCA',
        meta: { expense_treatment: 'transfer', transfer_to: cat },
      }));
      continue;
    }

    const txCount = cat === 'Makan Sehari-hari' ? 20 : cat === 'Transportasi' ? 12 : 6;
    const parts = splitAmount(total, txCount);
    const accounts = cat === 'Makan Sehari-hari' ? ['GoPay', 'Cash'] : cat === 'Transportasi' ? ['GoPay', 'BCA'] : ['OVO', 'BCA'];
    for (let i = 0; i < parts.length; i += 1) {
      txs.push(mkTx({
        date: dateKey(month, Math.min(28, 2 + i)),
        amount: parts[i],
        category: cat,
        merchant: `${cat} #${i + 1}`,
        account: accounts[i % accounts.length],
      }));
    }
  }

  return txs;
}

const mayTotals = {
  Kost: 1200000,
  Listrik: 165000,
  Internet: 150000,
  'Cicilan HP': 250000,
  'Makan Sehari-hari': 1865000,
  Transportasi: 720000,
  'Belanja Kebutuhan': 495000,
  Kesehatan: 145000,
  'Nongkrong & Kopi': 620000,
  Hiburan: 485000,
  Tabungan: 500000,
};

const juneTotals = {
  Kost: 1200000,
  Listrik: 155000,
  Internet: 150000,
  'Cicilan HP': 250000,
  'Makan Sehari-hari': 1480000,
  Transportasi: 615000,
  'Belanja Kebutuhan': 485000,
  Kesehatan: 165000,
  'Nongkrong & Kopi': 385000,
  Hiburan: 445000,
  Tabungan: 800000,
  'Dana Darurat': 500000,
};

const julyTotals = {
  Kost: 1200000,
  Listrik: 160000,
  Internet: 150000,
  'Cicilan HP': 250000,
  'Makan Sehari-hari': 1250000,
  Transportasi: 545000,
  'Belanja Kebutuhan': 510000,
  Kesehatan: 125000,
  'Nongkrong & Kopi': 315000,
  Hiburan: 470000,
  Tabungan: 1200000,
  'Dana Darurat': 800000,
};

const augTotals = {
  Kost: 1200000,
  Listrik: 165000,
  Internet: 150000,
  'Cicilan HP': 250000,
  'Makan Sehari-hari': 650000,
  Transportasi: 305000,
  'Belanja Kebutuhan': 235000,
  Kesehatan: 45000,
  'Nongkrong & Kopi': 155000,
  Hiburan: 240000,
};

const months = [
  { file: 'transactions-2026-05.json', month: '2026-05', totals: mayTotals, income: 8000000 },
  { file: 'transactions-2026-06.json', month: '2026-06', totals: juneTotals, income: 8000000 },
  { file: 'transactions-2026-07.json', month: '2026-07', totals: julyTotals, income: 8000000 },
  { file: 'transactions-2026-08.json', month: '2026-08', totals: augTotals, income: 0 },
];

for (const m of months) {
  const txs = buildMonthTransactions(m.month, m.totals, { income: m.income });
  if (m.month === '2026-08') {
    txs.push(mkTx({
      id: 'acc-tx-2026-08-hp-001',
      date: '2026-08-04',
      amount: 7988000,
      category: 'Elektronik',
      merchant: 'Beli HP',
      account: 'BCA',
      status: 'pending',
      meta: { needs_classification: true, status: 'pending', source: 'accuracy-fixture' },
    }));
  }
  fs.writeFileSync(path.join(OUT_DIR, m.file), `${JSON.stringify(txs, null, 2)}\n`);
  console.log(`Wrote ${m.file} (${txs.length} transactions)`);
}

const all = months.flatMap((m) => JSON.parse(fs.readFileSync(path.join(OUT_DIR, m.file), 'utf8')));
fs.writeFileSync(path.join(OUT_DIR, 'transactions-all.json'), `${JSON.stringify(all, null, 2)}\n`);
console.log(`Wrote transactions-all.json (${all.length} total)`);

for (const month of ['2026-05', '2026-06', '2026-07', '2026-08']) {
  const budget = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'budget-template.json'), 'utf8'));
  budget.month = month;
  budget.income = 8000000;
  fs.writeFileSync(path.join(OUT_DIR, `budgets-${month}.json`), `${JSON.stringify(budget, null, 2)}\n`);
  console.log(`Wrote budgets-${month}.json`);
}

console.log('Done.');
