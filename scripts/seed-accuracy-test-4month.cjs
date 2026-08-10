#!/usr/bin/env node
/**
 * Seed 4-month accuracy test persona (8jt, HP anomaly Aug 2026).
 *
 * Usage:
 *   npm run seed:accuracy-test -- --dry-run
 *   npm run seed:accuracy-test -- --confirm
 *   npm run seed:accuracy-test -- --skip-reset --confirm
 */
const path = require('node:path');
const { execSync } = require('node:child_process');
const {
  CHUNK,
  parseSeedArgs,
  loadFixtureJson,
  sqlLiteral,
  dbExec,
  requireEnv,
  rest,
  resolveUserId,
  fmtIdr,
} = require('./seed-utils.cjs');

const FIXTURE_DIR = path.join(__dirname, 'fixtures', 'accuracy-test-4month');
const MONTHS = ['2026-05', '2026-06', '2026-07', '2026-08'];

function buildSeedSql(userId, prefs, budgets, txs, goals, neraca, periods) {
  const now = new Date().toISOString();
  const lines = ['BEGIN;'];

  lines.push(`DELETE FROM public.transactions WHERE user_id = ${sqlLiteral(userId)}::uuid;`);
  lines.push(`DELETE FROM public.budgets WHERE user_id = ${sqlLiteral(userId)}::uuid;`);
  lines.push(`DELETE FROM public.financial_goals WHERE user_id = ${sqlLiteral(userId)}::uuid;`);
  lines.push(`DELETE FROM public.neraca_assets WHERE user_id = ${sqlLiteral(userId)}::uuid;`);
  lines.push(`DELETE FROM public.neraca_debts WHERE user_id = ${sqlLiteral(userId)}::uuid;`);
  lines.push(`DELETE FROM public.monthly_periods WHERE user_id = ${sqlLiteral(userId)}::uuid;`);

  lines.push(`INSERT INTO public.user_preferences (user_id, financial_problems, payday_day, payday_irregular, fixed_bills, has_debt, debt_amount, monthly_debt_payment, monthly_income, income_source, emergency_fund_balance, emergency_fund_target, created_at, updated_at)
    VALUES (
      ${sqlLiteral(userId)}::uuid,
      '{}'::text[],
      ${prefs.payday_day},
      ${prefs.payday_irregular ? 'TRUE' : 'FALSE'},
      ${sqlLiteral(prefs.fixed_bills)},
      ${prefs.debt_amount ? 'TRUE' : 'FALSE'},
      ${prefs.debt_amount || 'NULL'},
      ${prefs.monthly_debt_payment || 'NULL'},
      ${prefs.monthly_income},
      ${sqlLiteral(prefs.income_source)},
      ${prefs.emergency_fund_balance || 0},
      ${prefs.emergency_fund_target || 0},
      ${sqlLiteral(now)},
      ${sqlLiteral(now)}
    )
    ON CONFLICT (user_id) DO UPDATE SET
      payday_day = EXCLUDED.payday_day,
      fixed_bills = EXCLUDED.fixed_bills,
      monthly_income = EXCLUDED.monthly_income,
      debt_amount = EXCLUDED.debt_amount,
      monthly_debt_payment = EXCLUDED.monthly_debt_payment,
      emergency_fund_balance = EXCLUDED.emergency_fund_balance,
      emergency_fund_target = EXCLUDED.emergency_fund_target,
      updated_at = EXCLUDED.updated_at;`);

  for (const b of budgets) {
    lines.push(`INSERT INTO public.budgets (user_id, month, income, categories, updated_at)
      VALUES (${sqlLiteral(userId)}::uuid, ${sqlLiteral(b.month)}, ${b.income}, ${sqlLiteral(b.categories)}, ${sqlLiteral(now)})
      ON CONFLICT (user_id, month) DO UPDATE SET income = EXCLUDED.income, categories = EXCLUDED.categories, updated_at = EXCLUDED.updated_at;`);
  }

  for (const tx of txs) {
    lines.push(`INSERT INTO public.transactions (id, user_id, date, period, type, amount, currency, category, account, merchant, payment_method, notes, status, confirmed_at, meta, created_at, updated_at)
      VALUES (
        ${sqlLiteral(tx.id)},
        ${sqlLiteral(userId)}::uuid,
        ${sqlLiteral(tx.date)},
        ${sqlLiteral(String(tx.date).slice(0, 7))},
        ${sqlLiteral(tx.type)},
        ${Number(tx.amount)},
        ${sqlLiteral(tx.currency || 'IDR')},
        ${sqlLiteral(tx.category)},
        ${sqlLiteral(tx.account)},
        ${sqlLiteral(tx.merchant || '')},
        ${sqlLiteral(tx.payment_method || tx.account)},
        ${sqlLiteral(tx.notes || '')},
        ${sqlLiteral(tx.status || 'confirmed')},
        ${tx.confirmed_at ? sqlLiteral(tx.confirmed_at) : 'NULL'},
        ${sqlLiteral(tx.meta || { source: 'accuracy-seed' })},
        ${sqlLiteral(now)},
        ${sqlLiteral(now)}
      );`);
  }

  for (const g of goals) {
    lines.push(`INSERT INTO public.financial_goals (id, user_id, name, icon, color, target_amount, current_amount, target_date, priority, status, is_primary, monthly_contribution, created_at, updated_at)
      VALUES (
        ${sqlLiteral(g.id)},
        ${sqlLiteral(userId)}::uuid,
        ${sqlLiteral(g.name)},
        ${sqlLiteral(g.icon || '')},
        ${sqlLiteral(g.color || '#2563EB')},
        ${g.target_amount},
        ${g.current_amount || 0},
        ${g.target_date ? sqlLiteral(g.target_date) : 'NULL'},
        ${g.priority || 1},
        ${sqlLiteral(g.status || 'active')},
        ${g.is_primary ? 'TRUE' : 'FALSE'},
        ${g.monthly_contribution || 0},
        ${sqlLiteral(now)},
        ${sqlLiteral(now)}
      )
      ON CONFLICT (id) DO UPDATE SET current_amount = EXCLUDED.current_amount, updated_at = EXCLUDED.updated_at;`);
  }

  for (const a of neraca.assets || []) {
    lines.push(`INSERT INTO public.neraca_assets (id, user_id, category, name, amount, acquired_at, notes, created_at, updated_at)
      VALUES (${sqlLiteral(a.id)}, ${sqlLiteral(userId)}::uuid, ${sqlLiteral(a.category)}, ${sqlLiteral(a.name)}, ${a.amount}, ${a.acquired_at ? sqlLiteral(a.acquired_at) : 'NULL'}, '', ${sqlLiteral(now)}, ${sqlLiteral(now)})
      ON CONFLICT (id) DO UPDATE SET amount = EXCLUDED.amount, updated_at = EXCLUDED.updated_at;`);
  }

  for (const d of neraca.debts || []) {
    lines.push(`INSERT INTO public.neraca_debts (id, user_id, category, name, amount, notes, created_at, updated_at)
      VALUES (${sqlLiteral(d.id)}, ${sqlLiteral(userId)}::uuid, ${sqlLiteral(d.category)}, ${sqlLiteral(d.name)}, ${d.amount}, ${sqlLiteral(d.notes || '')}, ${sqlLiteral(now)}, ${sqlLiteral(now)})
      ON CONFLICT (id) DO UPDATE SET amount = EXCLUDED.amount, updated_at = EXCLUDED.updated_at;`);
  }

  for (const p of periods || []) {
    const closedAt = p.status === 'closed' ? sqlLiteral(now) : 'NULL';
    lines.push(`INSERT INTO public.monthly_periods (user_id, period, opening_balance, total_income, total_expense, closing_balance, status, closed_at, created_at, updated_at)
      VALUES (${sqlLiteral(userId)}::uuid, ${sqlLiteral(p.period)}, ${p.opening_balance}, ${p.total_income}, ${p.total_expense}, ${p.closing_balance}, ${sqlLiteral(p.status)}, ${closedAt}, ${sqlLiteral(now)}, ${sqlLiteral(now)})
      ON CONFLICT (user_id, period) DO UPDATE SET opening_balance = EXCLUDED.opening_balance, total_income = EXCLUDED.total_income, total_expense = EXCLUDED.total_expense, closing_balance = EXCLUDED.closing_balance, status = EXCLUDED.status, updated_at = EXCLUDED.updated_at;`);
  }

  lines.push('COMMIT;');
  return lines.join('\n');
}

async function applyViaRest(userId, prefs, budgets, txs, goals, neraca, periods) {
  const supabaseUrl = process.env.SUPABASE_URL || 'https://zzwqfmdyncxbolestkqp.supabase.co';
  const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const now = new Date().toISOString();

  await rest(supabaseUrl, serviceKey, `transactions?user_id=eq.${userId}`, { method: 'DELETE', prefer: 'return=minimal' });
  await rest(supabaseUrl, serviceKey, `budgets?user_id=eq.${userId}`, { method: 'DELETE', prefer: 'return=minimal' });
  await rest(supabaseUrl, serviceKey, `financial_goals?user_id=eq.${userId}`, { method: 'DELETE', prefer: 'return=minimal' });
  await rest(supabaseUrl, serviceKey, `neraca_assets?user_id=eq.${userId}`, { method: 'DELETE', prefer: 'return=minimal' });
  await rest(supabaseUrl, serviceKey, `neraca_debts?user_id=eq.${userId}`, { method: 'DELETE', prefer: 'return=minimal' });
  await rest(supabaseUrl, serviceKey, `monthly_periods?user_id=eq.${userId}`, { method: 'DELETE', prefer: 'return=minimal' });

  await rest(supabaseUrl, serviceKey, 'user_preferences', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=minimal',
    body: JSON.stringify({ user_id: userId, ...prefs, updated_at: now }),
  });

  for (const b of budgets) {
    await rest(supabaseUrl, serviceKey, 'budgets', {
      method: 'POST',
      prefer: 'resolution=merge-duplicates,return=minimal',
      body: JSON.stringify({ user_id: userId, month: b.month, income: b.income, categories: b.categories, updated_at: now }),
    });
  }

  const payload = txs.map((tx) => ({
    ...tx,
    user_id: userId,
    period: String(tx.date).slice(0, 7),
    currency: tx.currency || 'IDR',
    created_at: now,
    updated_at: now,
  }));

  for (let i = 0; i < payload.length; i += CHUNK) {
    await rest(supabaseUrl, serviceKey, 'transactions', {
      method: 'POST',
      prefer: 'return=minimal',
      body: JSON.stringify(payload.slice(i, i + CHUNK)),
    });
  }

  for (const g of goals) {
    await rest(supabaseUrl, serviceKey, 'financial_goals', {
      method: 'POST',
      prefer: 'resolution=merge-duplicates,return=minimal',
      body: JSON.stringify({ ...g, user_id: userId, updated_at: now }),
    });
  }

  for (const a of neraca.assets || []) {
    await rest(supabaseUrl, serviceKey, 'neraca_assets', {
      method: 'POST',
      prefer: 'resolution=merge-duplicates,return=minimal',
      body: JSON.stringify({ ...a, user_id: userId, updated_at: now }),
    });
  }

  for (const d of neraca.debts || []) {
    await rest(supabaseUrl, serviceKey, 'neraca_debts', {
      method: 'POST',
      prefer: 'resolution=merge-duplicates,return=minimal',
      body: JSON.stringify({ ...d, user_id: userId, updated_at: now }),
    });
  }

  for (const p of periods || []) {
    await rest(supabaseUrl, serviceKey, 'monthly_periods', {
      method: 'POST',
      prefer: 'resolution=merge-duplicates,return=minimal',
      body: JSON.stringify({
        user_id: userId,
        period: p.period,
        opening_balance: p.opening_balance,
        total_income: p.total_income,
        total_expense: p.total_expense,
        closing_balance: p.closing_balance,
        status: p.status,
        closed_at: p.status === 'closed' ? now : null,
        updated_at: now,
      }),
    });
  }
}

async function main() {
  const args = parseSeedArgs(process.argv.slice(2));
  const prefs = loadFixtureJson(FIXTURE_DIR, 'user-preferences.json');
  const budgets = MONTHS.map((m) => loadFixtureJson(FIXTURE_DIR, `budgets-${m}.json`));
  const txs = loadFixtureJson(FIXTURE_DIR, 'transactions-all.json');
  const goals = loadFixtureJson(FIXTURE_DIR, 'financial-goals.json');
  const neraca = loadFixtureJson(FIXTURE_DIR, 'neraca-opening.json');
  const periods = loadFixtureJson(FIXTURE_DIR, 'monthly-periods.json');
  const expected = loadFixtureJson(FIXTURE_DIR, 'expected-values.json');

  const { userId, useDb, email } = await resolveUserId({ viaDb: args.viaDb });

  console.log('\n[seed:accuracy-test] Preview');
  console.log(`  User:           ${email}`);
  console.log(`  Transactions:   ${txs.length}`);
  console.log(`  Budget months:  ${MONTHS.join(', ')}`);
  console.log(`  Aug consumption (excl HP): Rp ${fmtIdr(expected.months['2026-08'].consumptionExpense)}`);
  console.log(`  HP anomaly:     Rp ${fmtIdr(expected.months['2026-08'].hpAssetAmount)} (pending)`);

  if (args.dryRun) {
    console.log('\n[seed:accuracy-test] Dry-run only.');
    return;
  }

  if (!args.confirm) {
    console.log('\n[seed:accuracy-test] ABORT — pass --confirm');
    process.exit(1);
  }

  if (!args.skipReset) {
    console.log('\n[seed:accuracy-test] Resetting user data…');
    execSync(`node ${path.join(__dirname, 'reset-test-user.cjs')} --confirm${useDb ? ' --via-db' : ''}`, {
      stdio: 'inherit',
      env: { ...process.env, SEED_USER_ID: userId, SEED_USER_EMAIL: email },
    });
  }

  console.log('\n[seed:accuracy-test] Seeding…');

  if (useDb) {
    dbExec(buildSeedSql(userId, prefs, budgets, txs, goals, neraca, periods));
    console.log('  ✓ Applied via linked DB');
  } else {
    await applyViaRest(userId, prefs, budgets, txs, goals, neraca, periods);
    console.log('  ✓ Applied via REST');
  }

  console.log('\n[seed:accuracy-test] Done.');
  console.log('  Logout → login, period Agustus 2026.');
  console.log('  Run: npm run verify:accuracy');
  console.log('  Run: npm run test:accuracy');
}

main().catch((err) => {
  console.error('[seed:accuracy-test] FAILED:', err.message || err);
  process.exit(1);
});
