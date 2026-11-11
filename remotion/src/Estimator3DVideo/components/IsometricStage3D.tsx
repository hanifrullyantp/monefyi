import React from "react";
import { interpolate, useCurrentFrame } from "remotion";

export interface IsometricStageProps {
  children: React.ReactNode;
  tiltX?: number; // tilt angle (e.g. 15 to 35 deg)
  tiltY?: number; // rotation angle (e.g. -20 to 20 deg)
  cameraDistance?: number;
  mood?: "alert" | "funnel" | "tech" | "success";
}

export const IsometricStage3D: React.FC<IsometricStageProps> = ({
  children,
  tiltX = 18,
  tiltY = -12,
  cameraDistance = 1200,
  mood = "tech",
}) => {
  const frame = useCurrentFrame();

  // Gentle ambient camera breathing
  const camBob = Math.sin(frame / 25) * 2;
  const camPan = Math.cos(frame / 30) * 1.5;

  let ambientGlow = "rgba(16, 185, 129, 0.18)"; // Emerald
  let spotColor = "rgba(52, 211, 153, 0.28)";

  if (mood === "alert") {
    ambientGlow = "rgba(239, 68, 68, 0.22)"; // Red alert
    spotColor = "rgba(245, 158, 11, 0.2)";
  } else if (mood === "funnel") {
    ambientGlow = "rgba(56, 189, 248, 0.2)"; // Cyan/Sky
    spotColor = "rgba(16, 185, 129, 0.25)";
  } else if (mood === "success") {
    ambientGlow = "rgba(16, 185, 129, 0.35)"; // Rich emerald gold
    spotColor = "rgba(251, 191, 36, 0.25)";
  }

  // Floating 3D dust/light orbs
  const orbY1 = interpolate(frame % 180, [0, 180], [100, -100]);
  const orbY2 = interpolate((frame + 60) % 180, [0, 180], [120, -80]);

  return (
    <div
      className="relative w-full h-full overflow-hidden bg-[#060B09] flex items-center justify-center select-none"
      style={{
        perspective: `${cameraDistance}px`,
        perspectiveOrigin: "50% 45%",
      }}
    >
      {/* 3D Ambient Studio Atmosphere */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-700"
        style={{
          background: `radial-gradient(circle at 50% 30%, ${ambientGlow} 0%, rgba(6,11,9,0.92) 55%, #030605 100%)`,
        }}
      />

      {/* Floating Light Orb 1 */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full blur-[120px] pointer-events-none"
        style={{
          top: "10%",
          left: "15%",
          backgroundColor: spotColor,
          transform: `translateY(${orbY1}px)`,
        }}
      />

      {/* Floating Light Orb 2 */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full blur-[100px] pointer-events-none"
        style={{
          bottom: "15%",
          right: "15%",
          backgroundColor: ambientGlow,
          transform: `translateY(${orbY2}px)`,
        }}
      />

      {/* Isometric 3D Grid Floor */}
      <div
        className="absolute w-[1800px] h-[1800px] pointer-events-none opacity-20"
        style={{
          bottom: "-450px",
          transform: `rotateX(75deg) rotateZ(${camPan}deg)`,
          transformOrigin: "center center",
          backgroundImage: `
            linear-gradient(to right, rgba(52, 211, 153, 0.3) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(52, 211, 153, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
          maskImage: "radial-gradient(circle at center, black 25%, transparent 70%)",
          WebkitMaskImage: "radial-gradient(circle at center, black 25%, transparent 70%)",
        }}
      />

      {/* Master 3D Transform Pivot */}
      <div
        className="relative w-full h-full flex items-center justify-center pointer-events-auto"
        style={{
          transformStyle: "preserve-3d",
          transform: `rotateX(${tiltX + camBob}deg) rotateY(${tiltY + camPan}deg)`,
          transition: "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {children}
      </div>
    </div>
  );
};

