import React from "react";
import {
  Audio,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { DynamicBackground } from "../EstimatorMotionVideo/components/DynamicBackground";
import { SubtitlesOverlayCustomerHilang } from "./components/SubtitlesOverlayCustomerHilang";
import { Scene1GhostingHook } from "./scenes/Scene1GhostingHook";
import { Scene2EmosiDapur } from "./scenes/Scene2EmosiDapur";
import { Scene3HotColdGap } from "./scenes/Scene3HotColdGap";
import { Scene4EstimatorLive } from "./scenes/Scene4EstimatorLive";
import { Scene5OutroSenyum } from "./scenes/Scene5OutroSenyum";

export const CUSTOMER_HILANG_DURATION = 2020; // 67.33 seconds @ 30 fps

export const CustomerHilangVideo: React.FC = () => {
  const frame = useCurrentFrame();

  // Dynamic Mood
  let mood: "alert" | "problem" | "neutral" | "solution" | "celebrate" = "alert";
  if (frame < 202) {
    mood = "alert"; // Ghosting hook
  } else if (frame < 793) {
    mood = "neutral"; // Dapur impian vs emosi turun
  } else if (frame < 1410) {
    mood = "problem"; // Hot-Cold Empathy gap
  } else if (frame < 1832) {
    mood = "solution"; // Estimator live calculation & WA
  } else {
    mood = "celebrate"; // Outro CTA
  }

  return (
    <div className="relative w-full h-full bg-[#070D0B] font-['Plus_Jakarta_Sans'] select-none overflow-hidden">
      {/* Stable Dynamic Ambient Background */}
      <DynamicBackground mood={mood} />

      {/* Synchronized Voiceover Audio */}
      <Audio src={staticFile("audio-customer-hilang.mp3")} volume={1} />

      {/* Scene Sequences */}
      <Sequence from={0} durationInFrames={202} name="Scene 1: Hook - Customer Tiba-Tiba Hilang">
        <Scene1GhostingHook />
      </Sequence>

      <Sequence from={202} durationInFrames={591} name="Scene 2: Dapur Impian vs Emosi Drop">
        <Scene2EmosiDapur />
      </Sequence>

      <Sequence from={793} durationInFrames={617} name="Scene 3: Hot-Cold Empathy Gap">
        <Scene3HotColdGap />
      </Sequence>

      <Sequence from={1410} durationInFrames={422} name="Scene 4: Solusi Estimator Sebut Harga Panas">
        <Scene4EstimatorLive />
      </Sequence>

      <Sequence from={1832} durationInFrames={188} name="Scene 5: Outro & Sebut Harga Saat Tersenyum">
        <Scene5OutroSenyum />
      </Sequence>

      {/* Kinetic Animated Subtitles Overlay */}
      <SubtitlesOverlayCustomerHilang />
    </div>
  );
};

