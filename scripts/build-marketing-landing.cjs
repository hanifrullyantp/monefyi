#!/usr/bin/env node
/**
 * Build React marketing landing → dist/ (monefyi.com root).
 */
const { existsSync, mkdirSync, copyFileSync, cpSync } = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const LP_DIR = path.join(ROOT, 'monefyi-marketing-landing-page');
const DIST = path.join(ROOT, 'dist');
const LEGACY = path.join(ROOT, 'landing page');

if (!existsSync(path.join(LP_DIR, 'package.json'))) {
  console.error('[build:landing] monefyi-marketing-landing-page/package.json not found');
  process.exit(1);
}

const installCmd = existsSync(path.join(LP_DIR, 'package-lock.json')) ? 'npm ci' : 'npm install';
console.log(`[build:landing] ${LP_DIR} (${installCmd})`);
execSync(installCmd, { cwd: LP_DIR, stdio: 'inherit' });
execSync('npm run build', { cwd: LP_DIR, stdio: 'inherit' });

if (!existsSync(path.join(DIST, 'index.html'))) {
  console.error('[build:landing] dist/index.html missing after vite build');
  process.exit(1);
}

/** Static assets not inlined by vite singlefile */
mkdirSync(path.join(DIST, 'icons'), { recursive: true });

const iconSrc = path.join(LEGACY, 'public', 'icons');
const lpPublicIcons = path.join(LP_DIR, 'public', 'icons');

if (existsSync(iconSrc)) {
  mkdirSync(lpPublicIcons, { recursive: true });
  cpSync(iconSrc, lpPublicIcons, { recursive: true });
  cpSync(iconSrc, path.join(DIST, 'icons'), { recursive: true });
}

const staticCopies = [
  [path.join(LEGACY, 'privacy.html'), path.join(DIST, 'privacy.html')],
  [path.join(LEGACY, 'terms.html'), path.join(DIST, 'terms.html')],
  [path.join(LEGACY, 'js', 'landing-cookie.js'), path.join(DIST, 'js', 'landing-cookie.js')],
];

for (const [src, dest] of staticCopies) {
  if (!existsSync(src)) continue;
  mkdirSync(path.dirname(dest), { recursive: true });
  copyFileSync(src, dest);
  console.log(`[build:landing] copied ${path.relative(ROOT, dest)}`);
}

console.log('[build:landing] OK → dist/index.html');
