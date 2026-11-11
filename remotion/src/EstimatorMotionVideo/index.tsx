import React from "react";
import {
  Audio,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { DynamicBackground } from "./components/DynamicBackground";
import { SubtitlesOverlay } from "./components/SubtitlesOverlay";
import { Scene0Hook } from "./scenes/Scene0Hook";
import { Scene1NoModal } from "./scenes/Scene1NoModal";
import { Scene2OtakAtik } from "./scenes/Scene2OtakAtik";
import { Scene3Tawaran } from "./scenes/Scene3Tawaran";
import { Scene4AkarMasalah } from "./scenes/Scene4AkarMasalah";
import { Scene5EstimatorSolution } from "./scenes/Scene5EstimatorSolution";
import { Scene6OutroCTA } from "./scenes/Scene6OutroCTA";

export const ESTIMATOR_VIDEO_DURATION = 2415; // 80.5 seconds @ 30 fps

export const EstimatorMotionVideo: React.FC = () => {
  const frame = useCurrentFrame();

  // Dynamic Mood based on narrative flow
  let mood: "alert" | "problem" | "neutral" | "solution" | "celebrate" = "alert";
  if (frame < 125) {
    mood = "alert"; // 3 hal haram saat survei
  } else if (frame < 437) {
    mood = "problem"; // Kesalahan 1: Hitung harga tanpa modal
  } else if (frame < 955) {
    mood = "problem"; // Kesalahan 2: Otak-atik harga meleset
  } else if (frame < 1369) {
    mood = "problem"; // Kesalahan 3: Salah menyikapi tawaran
  } else if (frame < 1534) {
    mood = "neutral"; // Akar masalah
  } else if (frame < 2200) {
    mood = "solution"; // Estimator: live calculation, slider, batas aman diskon, WA & PDF
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
      <Sequence from={0} durationInFrames={125} name="Scene 0: Hook - 3 Hal Haram Saat Survei">
        <Scene0Hook />
      </Sequence>

      <Sequence from={125} durationInFrames={312} name="Scene 1: Kesalahan Fatal 1 - Tanpa Modal">
        <Scene1NoModal />
      </Sequence>

      <Sequence from={437} durationInFrames={518} name="Scene 2: Kesalahan Fatal 2 - Otak Atik Spek">
        <Scene2OtakAtik />
      </Sequence>

      <Sequence from={955} durationInFrames={414} name="Scene 3: Kesalahan Fatal 3 - Salah Tawaran">
        <Scene3Tawaran />
      </Sequence>

      <Sequence from={1369} durationInFrames={165} name="Scene 4: Akar Masalah">
        <Scene4AkarMasalah />
      </Sequence>

      <Sequence from={1534} durationInFrames={666} name="Scene 5: Solusi Nyata Estimator">
        <Scene5EstimatorSolution />
      </Sequence>

      <Sequence from={2200} durationInFrames={215} name="Scene 6: Outro & Call To Action">
        <Scene6OutroCTA />
      </Sequence>

      {/* Kinetic Animated Subtitles Overlay */}
      <SubtitlesOverlay />
    </div>
  );
};
