import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = path.join(__dirname, '..', 'scripts', 'fixtures', 'demo-august-2026');

function load(name) {
  return JSON.parse(fs.readFileSync(path.join(FIXTURE_DIR, name), 'utf8'));
}

describe('demo-august-2026 fixtures', () => {
  const budget = load('budget-2026-08.json');
  const txs = load('transactions.json');
  const prefs = load('user-preferences.json');
  const rows = budget.categories.rows;

  it('budget income is 5 jt', () => {
    assert.equal(budget.income, 5_000_000);
    assert.equal(budget.month, '2026-08');
  });

  it('budget rows sum matches income within 1%', () => {
    const total = rows.reduce((s, r) => s + r.amount, 0);
    assert.equal(total, 5_000_000);
    assert.ok(Math.abs(total - budget.income) / budget.income <= 0.01);
  });

  it('all transactions are in August 1-7 2026', () => {
    for (const tx of txs) {
      assert.match(tx.date, /^2026-08-0[1-7]$/);
      assert.equal(tx.type, 'expense');
      assert.ok(tx.category?.trim());
      assert.ok(tx.account?.trim());
      assert.ok(Number(tx.amount) > 0);
    }
  });

  it('prefs match persona gaji 5jt gajian 25', () => {
    assert.equal(prefs.monthly_income, 5_000_000);
    assert.equal(prefs.payday_day, 25);
    assert.equal(prefs.payday_irregular, false);
  });

  it('auto_link keywords overlap merchants', () => {
    const keywordsByCategory = Object.fromEntries(
      rows.map((r) => [r.name, (r.auto_link_keywords || []).map((k) => k.toLowerCase())]),
    );

    const linked = txs.filter((tx) => {
      const kws = keywordsByCategory[tx.category];
      if (!kws?.length) return false;
      const hay = `${tx.merchant || ''} ${tx.notes || ''}`.toLowerCase();
      return kws.some((kw) => hay.includes(kw));
    });

    assert.ok(linked.length >= txs.length * 0.7, `only ${linked.length}/${txs.length} txs match keywords`);
  });

  it('has realistic transaction count', () => {
    assert.ok(txs.length >= 25 && txs.length <= 40);
  });

  it('expense total matches week-1 persona (~51% budget incl. kost)', () => {
    const total = txs.reduce((s, t) => s + t.amount, 0);
    assert.equal(total, 2_539_000);
    assert.ok(total / budget.income >= 0.45 && total / budget.income <= 0.55);
  });
});
