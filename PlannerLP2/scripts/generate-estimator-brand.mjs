#!/usr/bin/env node
/**
 * Generate Estimator PNG icons from SVG mark (sharp).
 * Run: node scripts/generate-estimator-brand.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const brandDir = path.join(root, "public/brand/estimator");
const spaIcons = path.join(root, "../monefyi_planner/public/icons/estimator");

const markSvg = fs.readFileSync(path.join(brandDir, "mark.svg"));
const maskableSvg = fs.readFileSync(path.join(brandDir, "mark-maskable.svg"));

async function pngFromSvg(svgBuf, size, outPath, { flatten = null } = {}) {
  let pipeline = sharp(svgBuf).resize(size, size, { fit: "contain" });
  if (flatten) pipeline = pipeline.flatten({ background: flatten });
  await pipeline.png().toFile(outPath);
  console.log("wrote", path.relative(root, outPath));
}

async function main() {
  fs.mkdirSync(brandDir, { recursive: true });
  fs.mkdirSync(spaIcons, { recursive: true });

  for (const name of ["mark.svg", "lockup-light.svg", "lockup-dark.svg"]) {
    const src = path.join(brandDir, name);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(spaIcons, name));
    }
  }

  // Favicons / PWA
  await pngFromSvg(markSvg, 32, path.join(brandDir, "favicon-32.png"));
  await pngFromSvg(markSvg, 180, path.join(brandDir, "apple-touch-icon.png"), {
    flatten: "#157F5F",
  });
  // iOS wants no transparency / no rounded corners — use maskable full-bleed
  await pngFromSvg(maskableSvg, 180, path.join(brandDir, "apple-touch-icon.png"));
  await pngFromSvg(markSvg, 192, path.join(brandDir, "icon-192.png"));
  await pngFromSvg(markSvg, 512, path.join(brandDir, "icon-512.png"));
  await pngFromSvg(maskableSvg, 512, path.join(brandDir, "icon-maskable-512.png"));

  // Legacy paths used by layout (keep aliases)
  await pngFromSvg(markSvg, 32, path.join(brandDir, "../estimator-favicon-32.png"));
  await pngFromSvg(maskableSvg, 180, path.join(brandDir, "../estimator-icon-180.png"));
  await pngFromSvg(markSvg, 192, path.join(brandDir, "../estimator-icon-192.png"));
  await pngFromSvg(markSvg, 512, path.join(brandDir, "../estimator-icon-512.png"));
  await pngFromSvg(markSvg, 512, path.join(brandDir, "../estimator-logo.png"));

  // OG 1200x630
  const ogSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#0B1A15"/>
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#21AB7B"/>
      <stop offset="1" stop-color="#157F5F"/>
    </linearGradient>
  </defs>
  <g transform="translate(120, 170)">
    <rect width="120" height="120" rx="28" fill="url(#g)"/>
    <rect x="36" y="30" width="15" height="60" rx="3" fill="#fff"/>
    <rect x="36" y="30" width="48" height="15" rx="3" fill="#fff"/>
    <rect x="36" y="52" width="39" height="15" rx="3" fill="#fff"/>
    <rect x="36" y="75" width="48" height="15" rx="3" fill="#fff"/>
  </g>
  <text x="280" y="250" font-family="system-ui,sans-serif" font-size="72" font-weight="800" letter-spacing="-2" fill="#FFFFFF">Estimator</text>
  <text x="280" y="330" font-family="system-ui,sans-serif" font-size="36" font-weight="500" fill="#A7C4B8">Kirim Penawaran Sebelum Kamu Pulang Survei</text>
</svg>`);
  await sharp(ogSvg).png().toFile(path.join(brandDir, "og-image.png"));
  console.log("wrote og-image.png");

  // Copy to SPA icons
  const copies = [
    ["favicon-32.png", "favicon.png"],
    ["apple-touch-icon.png", "icon-180.png"],
    ["icon-192.png", "icon-192.png"],
    ["icon-512.png", "icon-512.png"],
    ["icon-maskable-512.png", "icon-maskable-512.png"],
    ["icon-512.png", "estimator-logo.png"],
  ];
  for (const [from, to] of copies) {
    fs.copyFileSync(path.join(brandDir, from), path.join(spaIcons, to));
    console.log("copied SPA", to);
  }

  // favicon.ico multi-size (16+32+48 as PNG pack via sharp - simple 32 ico as png renamed not ideal)
  // Generate 16/32/48 PNGs; browsers accept SVG favicon primarily
  await pngFromSvg(markSvg, 16, path.join(brandDir, "favicon-16.png"));
  await pngFromSvg(markSvg, 48, path.join(brandDir, "favicon-48.png"));
  // Use 32 as .ico fallback (PNG content — modern browsers OK with SVG)
  fs.copyFileSync(path.join(brandDir, "favicon-32.png"), path.join(brandDir, "favicon.ico"));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
