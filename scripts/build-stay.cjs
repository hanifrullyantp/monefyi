#!/usr/bin/env node
/**
 * Build STAY — tolerates STAY vs stay folder casing (macOS vs Linux/Vercel).
 */
const { existsSync } = require('fs');
const { execSync } = require('child_process');

// Prefer lowercase `stay/` — git must track one casing (Linux/Vercel is case-sensitive).
const dir = existsSync('stay/package.json')
  ? 'stay'
  : existsSync('STAY/package.json')
    ? 'STAY'
    : null;

if (!dir) {
  console.error('[build:stay] STAY package.json not found');
  process.exit(1);
}

const installCmd = existsSync(`${dir}/package-lock.json`) ? 'npm ci' : 'npm install';
console.log(`[build:stay] Using ${dir}/ (${installCmd})`);
execSync(installCmd, { cwd: dir, stdio: 'inherit' });
execSync('npm run build', { cwd: dir, stdio: 'inherit' });
