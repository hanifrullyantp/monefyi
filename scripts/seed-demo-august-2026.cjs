#!/usr/bin/env node
/**
 * Seed demo data — Agustus 2026 (gaji Rp 5 jt, gajian tgl 25).
 *
 * Menghapus SEMUA transaksi user, mengganti budget 2026-08, upsert prefs, insert tx fixture.
 *
 * Usage:
 *   export SUPABASE_URL="https://zzwqfmdyncxbolestkqp.supabase.co"
 *   export SUPABASE_SERVICE_ROLE_KEY="..."
 *   export SEED_USER_EMAIL="you@example.com"   # or SEED_USER_ID=uuid
 *   npm run seed:demo-august -- --confirm
 *
 * Tanpa service role key (pakai Supabase CLI linked DB):
 *   npm run seed:demo-august -- --via-db --confirm
 *
 * Dry-run (preview only):
 *   npm run seed:demo-august -- --dry-run
 *
 * Setelah seed: logout/login atau clear site data agar IndexedDB sync ulang.
 */

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execSync } = require('node:child_process');

const FIXTURE_DIR = path.join(__dirname, 'fixtures', 'demo-august-2026');
const SUPABASE_DIR = path.join(__dirname, '..', 'my-supabase-project');
const MONTH = '2026-08';
const CHUNK = 300;

function loadJson(name) {
  return JSON.parse(fs.readFileSync(path.join(FIXTURE_DIR, name), 'utf8'));
}

function parseArgs(argv) {
  return {
    confirm: argv.includes('--confirm'),
    dryRun: argv.includes('--dry-run'),
    viaDb: argv.includes('--via-db'),
  };
}

/**
 * @param {string} sql
 * @returns {{ rows: object[] }|null}
 */
function dbQuery(sql) {
  const out = execSync(`npx supabase db query --linked ${JSON.stringify(sql)}`, {
    cwd: SUPABASE_DIR,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const start = out.indexOf('{');
  const end = out.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  return JSON.parse(out.slice(start, end + 1));
}

/**
 * @param {string} sql
 */
function dbExec(sql) {
  const tmp = path.join(os.tmpdir(), `monefyi-seed-${Date.now()}.sql`);
  fs.writeFileSync(tmp, sql, 'utf8');
  try {
    execSync(`npx supabase db query --linked --file ${JSON.stringify(tmp)}`, {
      cwd: SUPABASE_DIR,
      encoding: 'utf8',
      stdio: ['inherit', 'inherit', 'inherit'],
    });
  } finally {
    try { fs.unlinkSync(tmp); } catch { /* ignore */ }
  }
}

/**
 * @param {unknown} value
 */
function sqlLiteral(value) {
  if (value == null) return 'NULL';
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'object') {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

/**
 * @param {string} userId
 * @param {object} prefsFixture
 * @param {object} budgetFixture
 * @param {object[]} txFixture
 */
function buildSeedSql(userId, prefsFixture, budgetFixture, txFixture) {
  const now = new Date().toISOString();
  const lines = ['BEGIN;'];
  lines.push(`DELETE FROM public.transactions WHERE user_id = ${sqlLiteral(userId)};`);
  lines.push(`DELETE FROM public.budgets WHERE user_id = ${sqlLiteral(userId)} AND month = ${sqlLiteral(MONTH)};`);

  const prefsRow = { user_id: userId, ...prefsFixture, updated_at: now };
  lines.push(`INSERT INTO public.user_preferences (user_id, financial_problems, payday_day, payday_irregular, fixed_bills, has_debt, debt_amount, debt_name, near_term_goal, near_term_goal_custom, monthly_income, income_source, created_at, updated_at)
    VALUES (
      ${sqlLiteral(userId)},
      '{}'::text[],
      ${prefsFixture.payday_day},
      ${prefsFixture.payday_irregular ? 'TRUE' : 'FALSE'},
      ${sqlLiteral(prefsFixture.fixed_bills)},
      FALSE,
      NULL,
      NULL,
      NULL,
      NULL,
      ${prefsFixture.monthly_income},
      ${sqlLiteral(prefsFixture.income_source)},
      ${sqlLiteral(now)},
      ${sqlLiteral(now)}
    )
    ON CONFLICT (user_id) DO UPDATE SET
      payday_day = EXCLUDED.payday_day,
      payday_irregular = EXCLUDED.payday_irregular,
      fixed_bills = EXCLUDED.fixed_bills,
      monthly_income = EXCLUDED.monthly_income,
      income_source = EXCLUDED.income_source,
      updated_at = EXCLUDED.updated_at;`);

  lines.push(`INSERT INTO public.budgets (user_id, month, income, categories, updated_at)
    VALUES (
      ${sqlLiteral(userId)},
      ${sqlLiteral(MONTH)},
      ${budgetFixture.income},
      ${sqlLiteral(budgetFixture.categories)},
      ${sqlLiteral(now)}
    )
    ON CONFLICT (user_id, month) DO UPDATE SET
      income = EXCLUDED.income,
      categories = EXCLUDED.categories,
      updated_at = EXCLUDED.updated_at;`);

  for (const tx of txFixture) {
    lines.push(`INSERT INTO public.transactions (id, user_id, date, type, amount, currency, category, subcategory, account, merchant, payment_method, notes, meta, created_at, updated_at)
      VALUES (
        ${sqlLiteral(tx.id)},
        ${sqlLiteral(userId)},
        ${sqlLiteral(tx.date)},
        ${sqlLiteral(tx.type)},
        ${Number(tx.amount)},
        ${sqlLiteral(tx.currency || 'IDR')},
        ${sqlLiteral(tx.category)},
        ${sqlLiteral(tx.subcategory || '')},
        ${sqlLiteral(tx.account)},
        ${sqlLiteral(tx.merchant || '')},
        ${sqlLiteral(tx.payment_method || tx.account)},
        ${sqlLiteral(tx.notes || '')},
        ${sqlLiteral(tx.meta || { source: 'seed' })},
        ${sqlLiteral(now)},
        ${sqlLiteral(now)}
      );`);
  }

  lines.push('COMMIT;');
  return lines.join('\n');
}

/**
 * @param {string} email
 */
async function resolveUserIdViaDb(email) {
  const res = dbQuery(
    `SELECT id::text AS id FROM auth.users WHERE lower(email) = lower(${sqlLiteral(email)}) LIMIT 1`,
  );
  const row = res?.rows?.[0];
  if (!row?.id) throw new Error(`User not found for email: ${email}`);
  return row.id;
}

/**
 * @param {string} userId
 */
async function countTransactionsViaDb(userId) {
  const res = dbQuery(
    `SELECT count(*)::int AS n FROM public.transactions WHERE user_id = ${sqlLiteral(userId)}::uuid`,
  );
  return Number(res?.rows?.[0]?.n) || 0;
}

/**
 * @param {string} userId
 * @param {object} prefsFixture
 * @param {object} budgetFixture
 * @param {object[]} txFixture
 */
async function applyViaDb(userId, prefsFixture, budgetFixture, txFixture) {
  const sql = buildSeedSql(userId, prefsFixture, budgetFixture, txFixture);
  dbExec(sql);
}

function requireEnv(name) {
  const v = process.env[name];
  if (!v || !String(v).trim()) {
    throw new Error(`Missing env ${name}`);
  }
  return String(v).trim();
}

function fmtIdr(n) {
  return new Intl.NumberFormat('id-ID').format(Math.round(n || 0));
}

/**
 * @param {string} baseUrl
 * @param {string} serviceKey
 * @param {string} routePath
 * @param {RequestInit & { prefer?: string }} [opts]
 */
async function rest(baseUrl, serviceKey, routePath, opts = {}) {
  const url = `${baseUrl.replace(/\/$/, '')}/rest/v1/${routePath}`;
  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
    ...(opts.prefer ? { Prefer: opts.prefer } : {}),
    ...(opts.headers || {}),
  };
  const { prefer, headers: _h, ...init } = opts;
  const res = await fetch(url, { ...init, headers });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${init.method || 'GET'} ${routePath} → ${res.status}: ${text.slice(0, 500)}`);
  }
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * @param {string} baseUrl
 * @param {string} serviceKey
 * @param {string} email
 */
async function resolveUserId(baseUrl, serviceKey, email) {
  const url = `${baseUrl.replace(/\/$/, '')}/auth/v1/admin/users?per_page=1000`;
  const res = await fetch(url, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`Auth admin list users failed: ${JSON.stringify(body)}`);
  }
  const users = body.users || [];
  const match = users.find((u) => String(u.email || '').toLowerCase() === email.toLowerCase());
  if (!match) {
    throw new Error(`User not found for email: ${email}`);
  }
  return match.id;
}

/**
 * @param {string} baseUrl
 * @param {string} serviceKey
 * @param {string} userId
 */
async function countTransactions(baseUrl, serviceKey, userId) {
  const url = `${baseUrl.replace(/\/$/, '')}/rest/v1/transactions?user_id=eq.${userId}&select=id`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Prefer: 'count=exact',
      Range: '0-0',
    },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Count transactions failed: ${res.status} ${t}`);
  }
  const range = res.headers.get('content-range') || '';
  const total = range.split('/')[1];
  return Number(total) || 0;
}

/**
 * @param {object[]} rows
 */
function summarizeExpenses(rows) {
  const expenses = rows.filter((r) => r.type === 'expense');
  const total = expenses.reduce((s, r) => s + Number(r.amount || 0), 0);
  const byCat = {};
  for (const r of expenses) {
    byCat[r.category] = (byCat[r.category] || 0) + Number(r.amount || 0);
  }
  return { count: expenses.length, total, byCat };
}

/**
 * @param {object} budgetFixture
 */
function summarizeBudget(budgetFixture) {
  const rows = budgetFixture.categories?.rows || [];
  const total = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
  const byPriority = {};
  for (const r of rows) {
    byPriority[r.priority] = (byPriority[r.priority] || 0) + Number(r.amount || 0);
  }
  return { rows: rows.length, total, byPriority };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const prefsFixture = loadJson('user-preferences.json');
  const budgetFixture = loadJson('budget-2026-08.json');
  const txFixture = loadJson('transactions.json');

  let userId = process.env.SEED_USER_ID?.trim();
  const email = process.env.SEED_USER_EMAIL?.trim() || 'hanif.rullyant@gmail.com';
  const useDb = args.viaDb || !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!userId) {
    if (useDb) {
      userId = await resolveUserIdViaDb(email);
    } else {
      if (!email) throw new Error('Set SEED_USER_ID or SEED_USER_EMAIL');
      const supabaseUrl = process.env.SUPABASE_URL || 'https://zzwqfmdyncxbolestkqp.supabase.co';
      const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
      userId = await resolveUserId(supabaseUrl, serviceKey, email);
    }
  }

  const txSummary = summarizeExpenses(txFixture);
  const budgetSummary = summarizeBudget(budgetFixture);
  const existingCount = useDb
    ? await countTransactionsViaDb(userId)
    : await countTransactions(
      process.env.SUPABASE_URL || 'https://zzwqfmdyncxbolestkqp.supabase.co',
      requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
      userId,
    );

  console.log('\n[seed:demo-august] Preview');
  console.log(`  Mode:        ${useDb ? 'supabase db (linked)' : 'REST API (service role)'}`);
  console.log(`  User ID:     ${userId}`);
  console.log(`  Month:       ${MONTH}`);
  console.log(`  Will delete: ${existingCount} existing transaction(s) (ALL months)`);
  console.log(`  Will insert: ${txFixture.length} transaction(s), total expense Rp ${fmtIdr(txSummary.total)}`);
  console.log(`  Budget rows: ${budgetSummary.rows}, planned Rp ${fmtIdr(budgetSummary.total)} / income Rp ${fmtIdr(budgetFixture.income)}`);
  console.log(`  Prefs:       income Rp ${fmtIdr(prefsFixture.monthly_income)}, gajian tgl ${prefsFixture.payday_day}`);
  console.log('\n  Top expense categories:');
  Object.entries(txSummary.byCat)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .forEach(([cat, amt]) => console.log(`    - ${cat}: Rp ${fmtIdr(amt)}`));

  if (args.dryRun) {
    console.log('\n[seed:demo-august] Dry-run only — no changes applied.');
    return;
  }

  if (!args.confirm) {
    console.log('\n[seed:demo-august] ABORT — pass --confirm to apply (destructive: deletes ALL transactions).');
    process.exit(1);
  }

  console.log('\n[seed:demo-august] Applying…');

  if (useDb) {
    await applyViaDb(userId, prefsFixture, budgetFixture, txFixture);
    console.log('  ✓ Applied via linked Supabase DB');
  } else {
    const supabaseUrl = process.env.SUPABASE_URL || 'https://zzwqfmdyncxbolestkqp.supabase.co';
    const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
    const now = new Date().toISOString();

    await rest(supabaseUrl, serviceKey, `transactions?user_id=eq.${userId}`, {
      method: 'DELETE',
      prefer: 'return=minimal',
    });
    console.log('  ✓ Deleted all transactions');

    await rest(supabaseUrl, serviceKey, `budgets?user_id=eq.${userId}&month=eq.${MONTH}`, {
      method: 'DELETE',
      prefer: 'return=minimal',
    });
    console.log(`  ✓ Cleared budget ${MONTH}`);

    const prefsRow = {
      user_id: userId,
      ...prefsFixture,
      updated_at: now,
    };
    await rest(supabaseUrl, serviceKey, 'user_preferences', {
      method: 'POST',
      prefer: 'resolution=merge-duplicates,return=minimal',
      body: JSON.stringify(prefsRow),
    });
    console.log('  ✓ Upserted user_preferences');

    const budgetRow = {
      user_id: userId,
      month: MONTH,
      income: budgetFixture.income,
      categories: budgetFixture.categories,
      updated_at: now,
    };
    await rest(supabaseUrl, serviceKey, 'budgets', {
      method: 'POST',
      prefer: 'resolution=merge-duplicates,return=minimal',
      body: JSON.stringify(budgetRow),
    });
    console.log(`  ✓ Upserted budget ${MONTH}`);

    const payload = txFixture.map((tx) => ({
      ...tx,
      user_id: userId,
      currency: tx.currency || 'IDR',
      meta: tx.meta || { source: 'seed' },
      created_at: tx.created_at || now,
      updated_at: tx.updated_at || now,
    }));

    for (let i = 0; i < payload.length; i += CHUNK) {
      const slice = payload.slice(i, i + CHUNK);
      await rest(supabaseUrl, serviceKey, 'transactions', {
        method: 'POST',
        prefer: 'return=minimal',
        body: JSON.stringify(slice),
      });
    }
    console.log(`  ✓ Inserted ${payload.length} transactions`);
  }

  console.log('\n[seed:demo-august] Done.');
  console.log('  Refresh app: logout → login, or clear site data (IndexedDB cache).');
  console.log('  Open Beranda + Budget with period Agustus 2026.');
}

main().catch((err) => {
  console.error('[seed:demo-august] FAILED:', err.message || err);
  process.exit(1);
});
