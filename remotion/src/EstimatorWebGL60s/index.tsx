import React from "react";
import { Audio, staticFile } from "remotion";
import { EstimatorWebGLScene } from "./components/EstimatorWebGLScene";
import { OverlayUI60s } from "./components/OverlayUI60s";
import { SubtitlesOverlay60s } from "./components/SubtitlesOverlay60s";

export const ESTIMATOR_WEBGL_60S_DURATION = 2070; // 69 seconds @ 30 fps

export const EstimatorWebGLVideo: React.FC = () => {
  return (
    <div className="relative w-full h-full bg-gradient-to-b from-[#FFFFFF] via-[#F8FAFC] to-[#EFF6F2] font-['Plus_Jakarta_Sans'] select-none overflow-hidden">
      {/* 60s Voiceover Audio generated via ElevenLabs */}
      <Audio src={staticFile("audio-60s.mp3")} volume={1} />

      {/* True WebGL 3D Canvas in Bright Studio Lighting */}
      <EstimatorWebGLScene />

      {/* Clean Light-Themed Overlay UI */}
      <OverlayUI60s />

      {/* Kinetic Synchronized Subtitles */}
      <SubtitlesOverlay60s />
    </div>
  );
};
