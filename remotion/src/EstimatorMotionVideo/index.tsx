import React from "react";
import {
  Audio,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { DynamicBackground } from "./components/DynamicBackground";
import { SubtitlesOverlay } from "./components/SubtitlesOverlay";
import { Scene1Hook } from "./scenes/Scene1Hook";
import { Scene2Funneling } from "./scenes/Scene2Funneling";
import { Scene3FilterHarga } from "./scenes/Scene3FilterHarga";
import { Scene4EstimatorSolution } from "./scenes/Scene4EstimatorSolution";
import { Scene5OutroCTA } from "./scenes/Scene5OutroCTA";

export const ESTIMATOR_VIDEO_DURATION = 2745; // 91.5 seconds @ 30 fps

export const EstimatorMotionVideo: React.FC = () => {
  const frame = useCurrentFrame();

  // Dynamic Mood based on narrative flow
  let mood: "alert" | "problem" | "neutral" | "solution" | "celebrate" = "alert";
  if (frame < 309) {
    mood = "alert"; // WA banjir notifikasi & stop buang tenaga
  } else if (frame < 773) {
    mood = "problem"; // Funneling: Leads Dingin cuma banding harga
  } else if (frame < 1205) {
    mood = "neutral"; // Leads Hangat & Panas
  } else if (frame < 2150) {
    mood = "neutral"; // 2 Langkah: Tanya Kebutuhan & Beri Harga
  } else if (frame < 2620) {
    mood = "solution"; // Estimator live calculation, bottom sheet, & WhatsApp PDF
  } else {
    mood = "celebrate"; // Outro CTA
  }

  return (
    <div className="relative w-full h-full bg-[#070D0B] font-['Plus_Jakarta_Sans'] select-none overflow-hidden">
      {/* Dynamic Background with ambient light shifts */}
      <DynamicBackground mood={mood} />

      {/* Synchronized Voiceover Audio */}
      <Audio src={staticFile("audio.mp3")} volume={1} />

      {/* Scene Sequences */}
      <Sequence from={0} durationInFrames={309} name="Scene 1: Hook - Chat WA vs Siap Beli">
        <Scene1Hook />
      </Sequence>

      <Sequence from={309} durationInFrames={896} name="Scene 2: Funneling 3 Kategori Leads">
        <Scene2Funneling />
      </Sequence>

      <Sequence from={1205} durationInFrames={945} name="Scene 3: 2 Langkah & Saringan Harga">
        <Scene3FilterHarga />
      </Sequence>

      <Sequence from={2150} durationInFrames={470} name="Scene 4: Solusi Nyata Estimator">
        <Scene4EstimatorSolution />
      </Sequence>

      <Sequence from={2620} durationInFrames={125} name="Scene 5: Outro & Call To Action">
        <Scene5OutroCTA />
      </Sequence>

      {/* Kinetic Animated Subtitles Overlay */}
      <SubtitlesOverlay />
    </div>
  );
};
