#!/usr/bin/env node
/**
 * Build STAY — tolerates STAY vs stay folder casing (macOS vs Linux/Vercel).
 */
const { existsSync } = require('fs');
const { execSync } = require('child_process');

const dir = existsSync('STAY/package.json')
  ? 'STAY'
  : existsSync('stay/package.json')
    ? 'stay'
    : null;

if (!dir) {
  console.error('[build:stay] STAY package.json not found');
  process.exit(1);
}

const installCmd = existsSync(`${dir}/package-lock.json`) ? 'npm ci' : 'npm install';
console.log(`[build:stay] Using ${dir}/ (${installCmd})`);
execSync(installCmd, { cwd: dir, stdio: 'inherit' });
execSync('npm run build', { cwd: dir, stdio: 'inherit' });
