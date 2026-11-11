import { execSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.resolve(root, "out");

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const compositions = [
  { id: "EstimatorMotionReels", out: "EstimatorMotionReels.mp4", desc: "9:16 Vertical Reels (1080x1920)" },
  { id: "EstimatorMotionSquare", out: "EstimatorMotionSquare.mp4", desc: "1:1 Square Feed (1080x1080)" },
  { id: "EstimatorMotionLandscape", out: "EstimatorMotionLandscape.mp4", desc: "16:9 Landscape YouTube (1920x1080)" },
];

console.log("=== STARTING BATCH RENDER: ALL NON-3D MOTION GRAPHIC VIDEOS ===");
console.log(`Total compositions to render: ${compositions.length}`);

for (let i = 0; i < compositions.length; i++) {
  const { id, out, desc } = compositions[i];
  const outPath = path.resolve(outDir, out);
  console.log(`\n------------------------------------------------------------`);
  console.log(`[${i + 1}/${compositions.length}] Rendering ${id} (${desc})...`);
  console.log(`Output target: ${outPath}`);
  console.log(`------------------------------------------------------------`);

  if (fs.existsSync(outPath)) {
    const stats = fs.statSync(outPath);
    if (stats.size > 10 * 1024 * 1024) {
      const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`✓ SKIP: ${out} already exists (${sizeMb} MB) and is complete!`);
      continue;
    }
  }

  const port = 3010 + i;
  const startTime = Date.now();
  try {
    execSync(
      `npx remotion render src/index.ts ${id} "${outPath}" --concurrency=1 --port=${port} --timeout=120000`,
      {
        cwd: root,
        stdio: "inherit",
      }
    );
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const stats = fs.statSync(outPath);
    const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`\n✓ SUCCESS [${id}]: Finished in ${elapsed}s, file size: ${sizeMb} MB`);
  } catch (err) {
    console.error(`\n✗ FAILED to render ${id}:`, err.message);
    process.exit(1);
  }
}

console.log("\n============================================================");
console.log("🎉 ALL NON-3D VIDEOS RENDERED SUCCESSFULLY!");
console.log("============================================================");

