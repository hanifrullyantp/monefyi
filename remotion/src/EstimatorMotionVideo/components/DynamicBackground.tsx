import React from "react";
import { useCurrentFrame } from "remotion";

interface DynamicBackgroundProps {
  mood?: "alert" | "problem" | "neutral" | "solution" | "celebrate";
}

export const DynamicBackground: React.FC<DynamicBackgroundProps> = ({
  mood = "neutral",
}) => {
  const frame = useCurrentFrame();

  const pulse = Math.sin(frame / 30) * 0.08 + 0.92;

  let orbColor1 = "rgba(33, 171, 123, 0.16)"; // Emerald
  let orbColor2 = "rgba(13, 90, 67, 0.22)";

  if (mood === "alert" || mood === "problem") {
    orbColor1 = "rgba(239, 68, 68, 0.20)"; // Red alert
    orbColor2 = "rgba(217, 119, 6, 0.16)"; // Amber
  } else if (mood === "solution" || mood === "celebrate") {
    orbColor1 = "rgba(16, 185, 129, 0.22)"; // Radiant Emerald
    orbColor2 = "rgba(5, 150, 105, 0.26)";
  }

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden bg-[#070D0B]">
      {/* Background radial gradient base */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 35%, #0F1F1A 0%, #08110E 60%, #040807 100%)",
        }}
      />

      {/* Stable Radial Ambient Glow 1 (Top Left) */}
      <div
        className="absolute w-[900px] h-[900px] pointer-events-none"
        style={{
          top: "-200px",
          left: "-200px",
          background: `radial-gradient(circle, ${orbColor1} 0%, transparent 70%)`,
          transform: `scale(${pulse})`,
        }}
      />

      {/* Stable Radial Ambient Glow 2 (Bottom Right) */}
      <div
        className="absolute w-[850px] h-[850px] pointer-events-none"
        style={{
          bottom: "-150px",
          right: "-150px",
          background: `radial-gradient(circle, ${orbColor2} 0%, transparent 70%)`,
          transform: `scale(${2 - pulse})`,
        }}
      />

      {/* Subtle Grid Matrix Pattern */}
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px),
                            linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Vignette Overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at center, transparent 45%, rgba(4, 8, 7, 0.8) 100%)",
        }}
      />
    </div>
  );
};
