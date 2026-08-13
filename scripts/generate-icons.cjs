#!/usr/bin/env node
/**
 * Generate & sync Monefyi brand icons from app/icons/monefyi-logo-source.png
 * Usage: node scripts/generate-icons.cjs
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = path.join(root, 'app', 'icons', 'monefyi-logo-source.png');
const ICON_VERSION = '2026-08-13-m';
/** Brand squircle green — matches official Monefyi mark */
const BRAND_GREEN = { r: 121, g: 200, b: 95, alpha: 1 };

const outDirs = [
  path.join(root, 'app', 'icons'),
  path.join(root, 'app', 'public', 'icons'),
  path.join(root, 'landing page', 'public', 'icons'),
  path.join(root, 'monefyi-marketing-landing-page', 'public', 'icons'),
  path.join(root, 'landing', 'public', 'icons'),
  path.join(root, 'planner', 'icons'),
  path.join(root, 'planner', 'public', 'icons'),
  path.join(root, 'monefyi_planner', 'public', 'icons'),
];

async function main() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.error('Install sharp first: npm install --save-dev sharp');
    process.exit(1);
  }

  if (!fs.existsSync(src)) {
    console.error('Missing source logo:', src);
    process.exit(1);
  }

  for (const dir of outDirs) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const meta = await sharp(src).metadata();
  const side = Math.min(meta.width || 512, meta.height || 512);
  const left = Math.floor(((meta.width || side) - side) / 2);
  const top = Math.floor(((meta.height || side) - side) / 2);

  const square = sharp(src).extract({ left, top, width: side, height: side });

  const logo1024 = await square.clone().resize(1024, 1024).png().toBuffer();
  for (const dir of outDirs) {
    fs.writeFileSync(path.join(dir, 'monefyi-logo.png'), logo1024);
    fs.copyFileSync(src, path.join(dir, 'monefyi-logo-source.png'));
  }
  console.log('Wrote monefyi-logo.png (1024) →', outDirs.length, 'dirs');

  const sizes = [
    { name: 'icon-32.png', size: 32 },
    { name: 'icon-180.png', size: 180 },
    { name: 'icon-192.png', size: 192 },
    { name: 'icon-512.png', size: 512 },
  ];

  for (const { name, size } of sizes) {
    const buf = await square.clone().resize(size, size).png().toBuffer();
    for (const dir of outDirs) {
      fs.writeFileSync(path.join(dir, name), buf);
    }
    console.log('Wrote', name);
  }

  const favicon32 = await square.clone().resize(32, 32).png().toBuffer();
  for (const dir of outDirs) {
    fs.writeFileSync(path.join(dir, 'favicon.png'), favicon32);
  }
  console.log('Wrote favicon.png (32)');

  const pad = Math.round(512 * 0.12);
  const inner = 512 - pad * 2;
  const maskable = await square
    .clone()
    .resize(inner, inner)
    .extend({
      top: pad,
      bottom: pad,
      left: pad,
      right: pad,
      background: BRAND_GREEN,
    })
    .png()
    .toBuffer();

  for (const dir of outDirs) {
    fs.writeFileSync(path.join(dir, 'icon-maskable-512.png'), maskable);
  }
  console.log('Wrote icon-maskable-512.png');

  console.log('Done. Icon cache version:', ICON_VERSION);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
