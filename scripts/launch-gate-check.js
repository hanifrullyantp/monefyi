#!/usr/bin/env node
/**
 * Launch gate CLI — runs growth tests + parity/flag readiness check.
 * Exit 0 = ready, 1 = blocked.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { evaluateLaunchReadiness } from '../app/js/services/launch-readiness.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

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

if (!readiness.ready) {
  console.error('\n❌ Launch gate checks failed');
  process.exit(1);
}

console.log('\n✅ Launch gate passed (tests + parity/flags)');
process.exit(0);
