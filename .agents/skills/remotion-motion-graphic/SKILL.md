---
name: remotion-motion-graphic
description: >-
  Standardized SOP and workflow to generate premium marketing motion graphics in Remotion from audio voiceovers and SRT transcripts.
  Includes faceless vector character design, exact real app UI mockups, live price recalculations, 
  and multi-aspect-ratio compositions (9:16 Reels, 1:1 Square, 16:9 Landscape).
---

# Remotion Motion Graphic Engineering SOP

This skill defines the end-to-end standard procedure for creating high-converting, broadcast-quality motion graphics and animated ads using Remotion, synced to voiceover audio and SRT transcripts.

---

## 1. Environment & Remotion Setup

All Remotion video projects reside in the `remotion/` directory.

### macOS & Node Compatibility Fixes
* **Browser Executable:** Remotion's bundled headless shell may require macOS 14/15. In `remotion/remotion.config.ts`, always set the local browser:
  ```ts
  import fs from "node:fs";
  import { Config } from "@remotion/cli/config";
  const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  if (fs.existsSync(chromePath)) {
    Config.setBrowserExecutable(chromePath);
  }
  ```
* **FFmpeg Symbol Missing Fix:** To prevent macOS `_AVCaptureDeviceTypeContinuityCamera` crashes in `@remotion/compositor-darwin-x64`, use `ffmpeg-static` via `scripts/ensure-macos-compat.mjs` on `postinstall`.
* **Dev Server (Studio):** Run `npm --prefix remotion run dev` (running at `http://localhost:3000`).

---

## 2. Ingestion: Voiceover Audio & SRT Subtitles

1. **Audio:** Copy audio file to `remotion/public/audio.mp3`.
2. **SRT Parsing:** Convert SRT blocks to JSON in `remotion/src/data/subtitles.ts`:
   ```ts
   export interface SubtitleCue {
     id: number;
     startSec: number;
     endSec: number;
     startFrame: number; // Math.round(startSec * 30)
     endFrame: number;   // Math.round(endSec * 30)
     text: string;
   }
   ```
3. **Kinetic Subtitles Component:**
   * Place at `bottom-20` (Reels) or `bottom-12` (Square/Landscape).
   * Highlight the active word using `Math.floor((frame - cue.startFrame) / timePerWord)` with glowing color (`text-emerald-400 font-black scale-110 drop-shadow`).
   * Never place static footer text beneath subtitles to avoid visual overlap.

---

## 3. Faceless Characters Design (Bulletproof Vectors)

> [!CAUTION]
> **NEVER use `<linearGradient id="...">` inside `<defs>` with `url(#...)` for character strokes or fills!**
> SVG `objectBoundingBox` on strokes or paths with no area causes browsers and headless Chromium to render elements completely black or invisible (leading to missing faces/bodies).

### Standard Color Tokens:
* **Skin Base:** `#FCD5B5` | **Skin Shadow:** `#E5AA82`
* **Safety Helmet:** `#F59E0B` (amber) | Ridge Highlight: `#FDE68A`
* **Work Vest:** `#10B981` (emerald green) | Reflectors: `#A7F3D0` | Shadow: `#047857`
* **Work Shirt:** `#334155` | Pants: `#1E293B` | Boots: `#92400E`
* **Customer Coat:** `#2563EB` (royal blue) | White collared shirt `#FFFFFF`

### Poses & Body Language:
* **Breathing / Bobbing Animation:** `transform: translateY(${Math.sin(frame / 15) * 3}px)`
* **Vendor Poses:**
  * `scratch_head`: Hand on helmet, question mark `?` badge, holding paper sheet.
  * `panicking`: Both hands on head, blue sweat droplets, nervous stance.
  * `exhausted`: Slumping posture, holding heavy iron pipe/tool ("kerja bakti").
  * `confident`: Proud posture, thumb up `👍`, holding phone displaying the green app.
* **Customer Poses:**
  * `skeptical`: Crossed arms, questioning badge `?!`.
  * `bargaining`: Outstretched hand pressing down `📉`.
  * `pleased`: Two thumbs up / handshake `🤝`.

---

## 4. Real App UI Mockup Architecture

When the audio introduces the software, display high-fidelity UI matching the real product:

1. **Dashboard View:**
   * Top bar with brand mark, notification bell, profile icon.
   * Hero metric card (e.g. `18 dari 50 total`, `+ Baru`).
   * Quick status cards (`Active`, `Leads`).
   * Project card with 3 metric columns: `Nilai Proyek`, `Est. Profit`, `Margin %`, tags, and action buttons.
2. **Editor / Calculation View:**
   * Grand Emerald header banner with project title, client name, and bold totals.
   * Itemized product breakdown with expandable accordions, units, and unit prices.
   * **Animative Live Recalculation:**
     * Animate inputs (e.g. dimension slider moves from `3.8m` $\to$ `4.5m`).
     * Instantly update item subtotal and project total price in real time with glowing numbers.
   * **Batas Aman Diskon (Safe Margin Guard):**
     * Drawer popping up showing maximum allowable discount before profit drops below safety floor.
   * **WhatsApp & PDF Modal:**
     * Pop-up dialog with official PDF Quotation preview card and verified digital signature stamp.

---

## 5. Multi-Aspect Ratio & Layout Rules

Support 3 responsive formats in `remotion/src/Root.tsx`:
1. **`9:16 Vertical (1080 x 1920)` - Reels / TikTok / Shorts / WA Status**
2. **`1:1 Square (1080 x 1080)` - Instagram Feed / LinkedIn / Facebook Ads**
3. **`16:9 Landscape (1920 x 1080)` - YouTube / Web Landing Page**

### Avoid Downscaling Mistakes:
* **DO NOT** just shrink a landscape layout into 9:16!
* Detect format via `const { width, height } = useVideoConfig(); const isReels = height > width;`
* **Vertical 9:16 Hierarchy:**
  * **Top 25%:** Big punchy headline (`text-5xl` s/d `text-6xl font-black`), bold pill badges.
  * **Center 55%:** Massive smartphone mockup (`scale: 1.05 - 1.2`) or large full-width interactive cards with the faceless character integrated beside/over it.
  * **Bottom 20%:** Kinetic karaoke subtitles in a dedicated clear zone.
* **Landscape 16:9:** Show **Dual-Phone Display** side-by-side (Left: Dashboard, Right: Editor) to maximize wide canvas without dead space.

---

## 6. Commands Quick Reference

```bash
# Start Remotion Studio preview
cd remotion && npm run dev

# Render Reels (9:16)
npx remotion render EstimatorMotionReels out/estimator-reels.mp4

# Render Square (1:1)
npx remotion render EstimatorMotionSquare out/estimator-square.mp4

# Render Landscape (16:9)
npx remotion render EstimatorMotionLandscape out/estimator-landscape.mp4
```

