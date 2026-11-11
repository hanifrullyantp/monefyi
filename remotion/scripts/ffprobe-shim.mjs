#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const ffmpegPath = path.resolve(root, "node_modules/ffmpeg-static/ffmpeg");

const args = process.argv.slice(2);
const targetFile = args.find((a) => !a.startsWith("-") && fs.existsSync(a));

if (!targetFile) {
  process.exit(0);
}

try {
  const res = spawnSync(ffmpegPath, ["-i", targetFile]);
  const output = (res.stderr?.toString() || "") + (res.stdout?.toString() || "");

  let duration = 0;
  const durMatch = output.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
  if (durMatch) {
    const [, h, m, s] = durMatch;
    duration = parseInt(h) * 3600 + parseInt(m) * 60 + parseFloat(s);
  }

  let channels = 2;
  if (output.includes("mono")) channels = 1;
  else if (output.includes("stereo")) channels = 2;

  let formatName = "mp3";
  if (targetFile.endsWith(".wav")) formatName = "wav";
  else if (targetFile.endsWith(".aac")) formatName = "aac";
  else if (targetFile.endsWith(".m4a")) formatName = "mov,mp4,m4a,3gp,3g2,mj2";

  console.log(`channels=${channels}`);
  console.log(`start_time=0.000000`);
  console.log(`duration=${duration.toFixed(6)}`);
  console.log(`format_name=${formatName}`);
  process.exit(0);
} catch (err) {
  process.exit(1);
}
