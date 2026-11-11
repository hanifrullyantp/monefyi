import React from "react";
import {
  Audio,
  Sequence,
  staticFile,
} from "remotion";
import { SubtitlesOverlay30s } from "./components/SubtitlesOverlay30s";
import { Scene1Hook3D } from "./scenes/Scene1Hook3D";
import { Scene2Funnel3D } from "./scenes/Scene2Funnel3D";
import { Scene3Calculation3D } from "./scenes/Scene3Calculation3D";
import { Scene4PdfWhatsApp3D } from "./scenes/Scene4PdfWhatsApp3D";
import { Scene5Outro3D } from "./scenes/Scene5Outro3D";

export const ESTIMATOR_3D_DURATION = 900; // 30 seconds @ 30 fps

export const Estimator3DVideo: React.FC = () => {
  return (
    <div className="relative w-full h-full bg-[#060B09] font-['Plus_Jakarta_Sans'] select-none overflow-hidden">
      {/* 30s Voiceover Audio */}
      <Audio src={staticFile("audio-30s.mp3")} volume={1} />

      {/* 5 Dynamic 3D Isometric Sequences */}
      <Sequence from={0} durationInFrames={150} name="3D Scene 1: Hook Zonk">
        <Scene1Hook3D />
      </Sequence>

      <Sequence from={150} durationInFrames={180} name="3D Scene 2: Funneling Serius">
        <Scene2Funnel3D />
      </Sequence>

      <Sequence from={330} durationInFrames={150} name="3D Scene 3: Hitung Realtime & Modul 3D">
        <Scene3Calculation3D />
      </Sequence>

      <Sequence from={480} durationInFrames={180} name="3D Scene 4: PDF TTD & WA Export">
        <Scene4PdfWhatsApp3D />
      </Sequence>

      <Sequence from={660} durationInFrames={240} name="3D Scene 5: Outro & Closing CTA">
        <Scene5Outro3D />
      </Sequence>

      {/* Synchronized 30s Kinetic Subtitles */}
      <SubtitlesOverlay30s />
    </div>
  );
};

