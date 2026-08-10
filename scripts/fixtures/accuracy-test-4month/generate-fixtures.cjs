#!/usr/bin/env node
/**
 * Generate accuracy-test-4month transaction fixtures (uses shared generator).
 * Run: node scripts/fixtures/accuracy-test-4month/generate-fixtures.cjs
 */
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const OUT_DIR = __dirname;

async function main() {
  const mod = await import(pathToFileURL(path.join(__dirname, '../../../shared/test-scenario-generator.js')).href);
  const { generateCustomScenario } = mod;

  const bundle = generateCustomScenario({
    presetKey: 'accuracy-4month',
    monthlyIncome: 8000000,
    paydayDay: 25,
    months: ['2026-05', '2026-06', '2026-07', '2026-08'],
    includeHpAnomaly: true,
    defaultMonth: '2026-08',
  });

  const byMonth = {};
  for (const tx of bundle.transactions) {
    const m = String(tx.date).slice(0, 7);
    if (!byMonth[m]) byMonth[m] = [];
    byMonth[m].push(tx);
  }

  for (const [month, txs] of Object.entries(byMonth)) {
    const file = `transactions-${month}.json`;
    fs.writeFileSync(path.join(OUT_DIR, file), `${JSON.stringify(txs, null, 2)}\n`);
    console.log(`Wrote ${file} (${txs.length} transactions)`);
  }

  fs.writeFileSync(path.join(OUT_DIR, 'transactions-all.json'), `${JSON.stringify(bundle.transactions, null, 2)}\n`);
  console.log(`Wrote transactions-all.json (${bundle.transactions.length} total)`);

  const budgetTemplate = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'budget-template.json'), 'utf8'));
  for (const month of ['2026-05', '2026-06', '2026-07', '2026-08']) {
    const budget = { ...budgetTemplate, month, income: 8000000 };
    fs.writeFileSync(path.join(OUT_DIR, `budgets-${month}.json`), `${JSON.stringify(budget, null, 2)}\n`);
    console.log(`Wrote budgets-${month}.json`);
  }

  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
