#!/usr/bin/env node
/**
 * Launch gate CLI — runs growth tests + parity/flag readiness check.
 * Exit 0 = ready, 1 = blocked.
 *
 * Optional: --with-accuracy runs test:accuracy (non-blocking warning on failure until fixtures stabilize).
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { evaluateLaunchReadiness } from '../app/js/services/launch-readiness.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const withAccuracy = process.argv.includes('--with-accuracy');

/** @type {Record<string, object>} */
const launchFlags = {};
for (const key of [
  'household_mode',
  'weekly_ai_digest',
  'multiple_goals',
  'debt_payoff_planner',
  'monthly_auto_report',
  'in_app_marketing',
  'ai_coach_pro',
  'neraca_advanced',
]) {
  launchFlags[key] = { enabled: true, status: 'active', rollout_pct: 100 };
}

const readiness = evaluateLaunchReadiness(launchFlags);

console.log('\n=== Launch Gate — Readiness ===');
console.log(`Score: ${readiness.score}%`);
console.log(`Ready: ${readiness.ready ? 'YES ✅' : 'NO ❌'}`);

if (readiness.blockers.length) {
  console.log('\nBlockers:');
  for (const b of readiness.blockers) {
    console.log(`  - ${b.label}: ${b.message}`);
  }
}

console.log('\n=== Running test:all ===');
const test = spawnSync('npm', ['run', 'test:all'], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
});

const testsOk = test.status === 0;
if (!testsOk) {
  console.error('\n❌ Tests failed — launch blocked');
  process.exit(1);
}

if (withAccuracy) {
  console.log('\n=== Running test:accuracy (optional) ===');
  const accuracy = spawnSync('npm', ['run', 'test:accuracy'], {
    cwd: root,
    stdio: 'inherit',
    shell: true,
  });
  if (accuracy.status !== 0) {
    console.warn('\n⚠️  Accuracy tests failed — review docs/testing/MONEFYI_ACCURACY_TESTING.md');
    console.warn('    (Non-blocking until fixtures stabilize)');
  } else {
    console.log('\n✅ Accuracy tests passed');
  }
}

if (!readiness.ready) {
  console.error('\n❌ Launch gate checks failed');
  process.exit(1);
}

console.log('\n✅ Launch gate passed (tests + parity/flags)');
process.exit(0);
