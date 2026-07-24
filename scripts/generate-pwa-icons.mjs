#!/usr/bin/env node
/**
 * Generate clean Monefyi icons: solid emerald (#10B981) + black M mark only.
 * Usage: node scripts/generate-pwa-icons.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const ICON_VERSION = '2026-07-25-logo';
const EMERALD = { r: 16, g: 185, b: 129, alpha: 1 };

const sourcePath = path.join(root, 'app', 'icons', 'monefyi-logo-source.png');
const outDirs = [
  path.join(root, 'app', 'icons'),
  path.join(root, 'app', 'public', 'icons'),
];

/**
 * @param {number} r
 * @param {number} g
 * @param {number} b
 */
function isGreen(r, g, b) {
  return g >= 130 && r >= 90 && b <= 130 && g > b;
}

/**
 * @param {number} r
 * @param {number} g
 * @param {number} b
 */
function isBlack(r, g, b) {
  return r <= 40 && g <= 40 && b <= 40;
}

/**
 * @param {Buffer} data
 * @param {number} width
 * @param {number} height
 */
function getGreenBounds(data, width, height) {
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      if (isGreen(data[i], data[i + 1], data[i + 2])) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX < minX) {
    return { left: 0, top: 0, width, height };
  }
  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

/**
 * @param {Buffer} src
 * @param {number} srcWidth
 * @param {{ left: number, top: number, width: number, height: number }} bounds
 */
/**
 * @param {Buffer} data
 * @param {number} width
 * @param {number} height
 */
function buildGreenMask(data, width, height) {
  const mask = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      if (isGreen(data[i], data[i + 1], data[i + 2])) {
        mask[y * width + x] = 1;
      }
    }
  }
  return mask;
}

/**
 * @param {Buffer} src
 * @param {number} srcWidth
 * @param {number} srcHeight
 * @param {{ left: number, top: number, width: number, height: number }} bounds
 */
function buildMarkBuffer(src, srcWidth, srcHeight, bounds) {
  const { left, top, width, height } = bounds;
  const fullGreen = buildGreenMask(src, srcWidth, srcHeight);
  const mask = new Uint8Array(width * height);
  const touchesGreen = new Uint8Array(width * height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sx = left + x;
      const sy = top + y;
      const si = (sy * srcWidth + sx) * 4;
      if (!isBlack(src[si], src[si + 1], src[si + 2])) continue;
      mask[y * width + x] = 1;

      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = sx + dx;
          const ny = sy + dy;
          if (nx < 0 || ny < 0 || nx >= srcWidth || ny >= srcHeight) continue;
          if (fullGreen[ny * srcWidth + nx]) {
            touchesGreen[y * width + x] = 1;
            break;
          }
        }
      }
    }
  }

  const visited = new Uint8Array(width * height);
  const keep = new Uint8Array(width * height);
  const cornerMargin = 0.16;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const start = y * width + x;
      if (!mask[start] || !touchesGreen[start] || visited[start]) continue;

      const stack = [start];
      const component = [];
      visited[start] = 1;

      while (stack.length) {
        const idx = stack.pop();
        component.push(idx);
        const cx = idx % width;
        const cy = (idx - cx) / width;
        const candidates = [
          [cx - 1, cy],
          [cx + 1, cy],
          [cx, cy - 1],
          [cx, cy + 1],
        ];
        for (const [nx, ny] of candidates) {
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const ni = ny * width + nx;
          if (!mask[ni] || visited[ni]) continue;
          visited[ni] = 1;
          stack.push(ni);
        }
      }

      let sumX = 0;
      let sumY = 0;
      let interior = 0;
      for (const idx of component) {
        sumX += idx % width;
        sumY += (idx - (idx % width)) / width;
        if (!touchesGreen[idx]) interior += 1;
      }

      const centerX = sumX / component.length;
      const centerY = sumY / component.length;
      const nx = centerX / width;
      const ny = centerY / height;
      const inCorner =
        (nx < cornerMargin && ny < cornerMargin) ||
        (nx > 1 - cornerMargin && ny < cornerMargin) ||
        (nx < cornerMargin && ny > 1 - cornerMargin) ||
        (nx > 1 - cornerMargin && ny > 1 - cornerMargin);
      const interiorRatio = interior / component.length;
      if (inCorner || interiorRatio < 0.08) continue;

      for (const idx of component) keep[idx] = 1;
    }
  }

  const out = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    const di = i * 4;
    out[di] = 0;
    out[di + 1] = 0;
    out[di + 2] = 0;
    out[di + 3] = keep[i] ? 255 : 0;
  }

  return out;
}

/**
 * @param {Buffer} markRaw
 * @param {number} markW
 * @param {number} markH
 * @param {number} size
 * @param {number} markScale
 */
async function renderIcon(markRaw, markW, markH, size, markScale) {
  const markSize = Math.round(size * markScale);
  const markPng = await sharp(markRaw, {
    raw: { width: markW, height: markH, channels: 4 },
  })
    .resize(markSize, markSize, { fit: 'fill' })
    .png()
    .toBuffer();

  const offset = Math.round((size - markSize) / 2);
  return sharp({
    create: { width: size, height: size, channels: 4, background: EMERALD },
  })
    .composite([{ input: markPng, left: offset, top: offset }])
    .png()
    .toBuffer();
}

async function main() {
  if (!fs.existsSync(sourcePath)) {
    console.error('Missing source logo:', sourcePath);
    process.exit(1);
  }

  outDirs.forEach((dir) => fs.mkdirSync(dir, { recursive: true }));

  const { data, info } = await sharp(sourcePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const bounds = getGreenBounds(data, info.width, info.height);
  const markRaw = buildMarkBuffer(data, info.width, info.height, bounds);

  const outputs = [
    { name: 'monefyi-logo.png', size: 1024, scale: 0.78 },
    { name: 'icon-180.png', size: 180, scale: 0.78 },
    { name: 'icon-192.png', size: 192, scale: 0.78 },
    { name: 'icon-512.png', size: 512, scale: 0.78 },
    { name: 'icon-maskable-512.png', size: 512, scale: 0.58 },
  ];

  for (const { name, size, scale } of outputs) {
    const buf = await renderIcon(markRaw, bounds.width, bounds.height, size, scale);
    for (const dir of outDirs) {
      fs.writeFileSync(path.join(dir, name), buf);
    }
    console.log('Wrote', name, `${size}x${size}`);
  }

  console.log('Done. Bump icon ?v= to:', ICON_VERSION);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
