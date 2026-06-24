#!/usr/bin/env node
/**
 * Generate square PWA icons from icons/monefyi-logo.png
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = path.join(root, 'app', 'icons', 'monefyi-logo.png');
const outDirs = [
  path.join(root, 'app', 'icons'),
  path.join(root, 'app', 'public', 'icons'),
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

  outDirs.forEach((dir) => fs.mkdirSync(dir, { recursive: true }));

  const meta = await sharp(src).metadata();
  const side = Math.min(meta.width || 512, meta.height || 512);
  const left = Math.floor(((meta.width || side) - side) / 2);
  const top = Math.floor(((meta.height || side) - side) / 2);

  const square = sharp(src).extract({ left, top, width: side, height: side });

  const sizes = [
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

  // Maskable: 512 with ~10% safe padding
  const pad = Math.round(512 * 0.1);
  const inner = 512 - pad * 2;
  const maskable = await square
    .clone()
    .resize(inner, inner)
    .extend({
      top: pad,
      bottom: pad,
      left: pad,
      right: pad,
      background: { r: 15, g: 17, b: 23, alpha: 1 },
    })
    .png()
    .toBuffer();

  for (const dir of outDirs) {
    fs.writeFileSync(path.join(dir, 'icon-512-maskable.png'), maskable);
  }
  console.log('Wrote icon-512-maskable.png');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
