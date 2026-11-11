import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

try {
  const compositorDir = path.resolve(root, "node_modules/@remotion/compositor-darwin-x64");
  const ffmpegStaticPath = path.resolve(root, "node_modules/ffmpeg-static/ffmpeg");
  const ffprobeShimPath = path.resolve(__dirname, "ffprobe-shim.mjs");

  if (fs.existsSync(compositorDir) && fs.existsSync(ffmpegStaticPath)) {
    // 1. Patch ffmpeg
    const targetFfmpeg = path.resolve(compositorDir, "ffmpeg");
    let needsPatchFfmpeg = false;

    try {
      execSync(`"${targetFfmpeg}" -version`, { stdio: "ignore" });
    } catch {
      needsPatchFfmpeg = true;
    }

    if (needsPatchFfmpeg) {
      const origPath = path.resolve(compositorDir, "ffmpeg.orig");
      if (!fs.existsSync(origPath) && !fs.lstatSync(targetFfmpeg).isSymbolicLink()) {
        fs.renameSync(targetFfmpeg, origPath);
      } else if (fs.existsSync(targetFfmpeg)) {
        fs.unlinkSync(targetFfmpeg);
      }
      fs.symlinkSync(ffmpegStaticPath, targetFfmpeg);
      console.log("✓ Patched Remotion compositor ffmpeg with ffmpeg-static.");
    }

    // 2. Patch ffprobe
    const targetFfprobe = path.resolve(compositorDir, "ffprobe");
    let needsPatchFfprobe = false;

    try {
      execSync(`"${targetFfprobe}" -version`, { stdio: "ignore" });
    } catch {
      needsPatchFfprobe = true;
    }

    if (needsPatchFfprobe) {
      const origPath = path.resolve(compositorDir, "ffprobe.orig");
      if (!fs.existsSync(origPath) && !fs.lstatSync(targetFfprobe).isSymbolicLink()) {
        fs.renameSync(targetFfprobe, origPath);
      } else if (fs.existsSync(targetFfprobe)) {
        fs.unlinkSync(targetFfprobe);
      }
      fs.chmodSync(ffprobeShimPath, "755");
      fs.symlinkSync(ffprobeShimPath, targetFfprobe);
      console.log("✓ Patched Remotion compositor ffprobe with ffprobe-shim.");
    }
  }

  // 3. Patch libfdk_aac -> aac for standard ffmpeg compatibility
  const audioCodecPath = path.resolve(root, "node_modules/@remotion/renderer/dist/options/audio-codec.js");
  if (fs.existsSync(audioCodecPath)) {
    let content = fs.readFileSync(audioCodecPath, "utf8");
    if (content.includes("return 'libfdk_aac'")) {
      content = content.replace("return 'libfdk_aac'", "return 'aac'");
      fs.writeFileSync(audioCodecPath, content, "utf8");
      console.log("✓ Patched Remotion audio codec to standard AAC.");
    }
  }

  const esmRendererPath = path.resolve(root, "node_modules/@remotion/renderer/dist/esm/index.mjs");
  if (fs.existsSync(esmRendererPath)) {
    let content = fs.readFileSync(esmRendererPath, "utf8");
    if (content.includes('return "libfdk_aac"')) {
      content = content.replace('return "libfdk_aac"', 'return "aac"');
      fs.writeFileSync(esmRendererPath, content, "utf8");
    }
  }
} catch (err) {
  console.warn("Notice: ensure-macos-compat check finished:", err.message);
}
