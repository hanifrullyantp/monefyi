import React from "react";
import { AbsoluteFill, Audio, staticFile } from "remotion";
import { Motion3DCanvas } from "./Motion3DCanvas";

export const ESTIMATOR_MOTION3D_DURATION = 785; // 26.17 seconds @ 30 fps

export const EstimatorMotion3DVideo: React.FC = () => {
  return (
    <AbsoluteFill className="bg-[#BFE0FF] overflow-hidden select-none">
      <Audio src={staticFile("audio-motion3d.mp3")} volume={1} />
      <Motion3DCanvas />
    </AbsoluteFill>
  );
};
