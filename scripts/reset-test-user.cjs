#!/usr/bin/env node
/**
 * Reset all test-user data (destructive). Does NOT delete auth.users.
 *
 * Usage:
 *   export SEED_USER_EMAIL="test@monefyi.com"
 *   npm run reset:test-user -- --dry-run
 *   npm run reset:test-user -- --confirm
 *   npm run reset:test-user -- --via-db --confirm
 */
const {
  parseSeedArgs,
  sqlLiteral,
  dbExec,
  dbQuery,
  requireEnv,
  rest,
  resolveUserId,
} = require('./seed-utils.cjs');

const TABLES_REST_ORDER = [
  'transaction_impact_logs',
  'journal_entries',
  'transactions',
  'neraca_assets',
  'neraca_debts',
  'neraca_receivables',
  'neraca_equity_events',
  'neraca_chart_accounts',
  'balance_snapshots',
  'financial_goals',
  'financial_targets',
  'budgets',
  'email_imports',
  'weekly_digests',
  'user_notifications',
  'user_offer_interactions',
  'user_habits',
  'insights_generated',
  'debts',
  'recurring_transactions',
  'monthly_periods',
  'household_members',
  'suspense_log',
];

function buildResetSql(userId) {
  const lines = ['BEGIN;'];
  for (const table of TABLES_REST_ORDER) {
    lines.push(`DELETE FROM public.${table} WHERE user_id = ${sqlLiteral(userId)}::uuid;`);
  }
  lines.push(`UPDATE public.user_preferences SET
    financial_problems = '{}'::text[],
    payday_day = NULL,
    fixed_bills = '{}'::jsonb,
    monthly_income = NULL,
    updated_at = now()
    WHERE user_id = ${sqlLiteral(userId)}::uuid;`);
  lines.push(`UPDATE public.profiles SET
    onboarding_completed = FALSE,
    onboarding_version = NULL,
    updated_at = now()
    WHERE id = ${sqlLiteral(userId)}::uuid;`);
  lines.push('COMMIT;');
  return lines.join('\n');
}

async function resetViaRest(baseUrl, serviceKey, userId) {
  for (const table of TABLES_REST_ORDER) {
    try {
      await rest(baseUrl, serviceKey, `${table}?user_id=eq.${userId}`, {
        method: 'DELETE',
        prefer: 'return=minimal',
      });
      console.log(`  ✓ Cleared ${table}`);
    } catch (e) {
      if (String(e.message).includes('404') || String(e.message).includes('does not exist')) {
        console.log(`  · Skipped ${table} (not found)`);
      } else {
        throw e;
      }
    }
  }
}

async function countRowsViaDb(userId, table) {
  try {
    const res = dbQuery(
      `SELECT count(*)::int AS n FROM public.${table} WHERE user_id = ${sqlLiteral(userId)}::uuid`,
    );
    return Number(res?.rows?.[0]?.n) || 0;
  } catch {
    return 0;
  }
}

async function main() {
  const args = parseSeedArgs(process.argv.slice(2));
  const { userId, useDb, email } = await resolveUserId({ viaDb: args.viaDb });

  console.log('\n[reset:test-user] Preview');
  console.log(`  User:  ${email} (${userId})`);
  console.log(`  Mode:  ${useDb ? 'supabase db (linked)' : 'REST API'}`);

  if (useDb) {
    for (const table of ['transactions', 'budgets', 'financial_goals']) {
      const n = await countRowsViaDb(userId, table);
      console.log(`  ${table}: ${n} row(s)`);
    }
  }

  if (args.dryRun) {
    console.log('\n[reset:test-user] Dry-run — no changes.');
    return;
  }

  if (!args.confirm) {
    console.log('\n[reset:test-user] ABORT — pass --confirm to delete all user data.');
    process.exit(1);
  }

  console.log('\n[reset:test-user] Applying…');

  if (useDb) {
    dbExec(buildResetSql(userId));
    console.log('  ✓ Reset via linked DB');
  } else {
    const supabaseUrl = process.env.SUPABASE_URL || 'https://zzwqfmdyncxbolestkqp.supabase.co';
    const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
    await resetViaRest(supabaseUrl, serviceKey, userId);
  }

  console.log('\n[reset:test-user] Done.');
  console.log('  Logout → login or clear site data (IndexedDB) before re-seeding.');
}

main().catch((err) => {
  console.error('[reset:test-user] FAILED:', err.message || err);
  process.exit(1);
});
