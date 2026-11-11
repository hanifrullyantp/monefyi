import React from "react";
import { interpolate, useCurrentFrame } from "remotion";

interface DynamicBackgroundProps {
  mood?: "alert" | "problem" | "neutral" | "solution" | "celebrate";
}

export const DynamicBackground: React.FC<DynamicBackgroundProps> = ({
  mood = "neutral",
}) => {
  const frame = useCurrentFrame();

  // Subtle rotation and pulsing for ambient lights
  const rotate1 = interpolate(frame, [0, 2400], [0, 360]);
  const rotate2 = interpolate(frame, [0, 2400], [360, 0]);
  const pulse = Math.sin(frame / 25) * 0.15 + 0.85;

  let glowColor1 = "rgba(33, 171, 123, 0.18)"; // Emerald
  let glowColor2 = "rgba(13, 90, 67, 0.25)";
  let accentColor = "rgba(33, 171, 123, 0.35)";

  if (mood === "alert" || mood === "problem") {
    glowColor1 = "rgba(239, 68, 68, 0.22)"; // Red alert
    glowColor2 = "rgba(217, 119, 6, 0.18)"; // Amber
    accentColor = "rgba(239, 68, 68, 0.4)";
  } else if (mood === "solution" || mood === "celebrate") {
    glowColor1 = "rgba(16, 185, 129, 0.25)"; // Radiant Emerald
    glowColor2 = "rgba(5, 150, 105, 0.3)";
    accentColor = "rgba(52, 211, 153, 0.45)";
  }

  const scanlineY = interpolate(frame % 120, [0, 120], [-100, 2000]);

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

      {/* Animated Glowing Orb 1 (Top Left) */}
      <div
        className="absolute w-[800px] h-[800px] rounded-full blur-[140px] pointer-events-none transition-all duration-700"
        style={{
          top: "-150px",
          left: "-150px",
          backgroundColor: glowColor1,
          transform: `scale(${pulse}) rotate(${rotate1}deg)`,
        }}
      />

      {/* Animated Glowing Orb 2 (Center Right) */}
      <div
        className="absolute w-[750px] h-[750px] rounded-full blur-[150px] pointer-events-none transition-all duration-700"
        style={{
          bottom: "10%",
          right: "-100px",
          backgroundColor: glowColor2,
          transform: `scale(${2 - pulse}) rotate(${rotate2}deg)`,
        }}
      />

      {/* Subtle Grid Matrix Pattern */}
      <div
        className="absolute inset-0 opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px),
                            linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Subtle scanning light bar */}
      <div
        className="absolute left-0 right-0 h-[2px] opacity-20 pointer-events-none"
        style={{
          top: scanlineY,
          background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
        }}
      />

      {/* Vignette Overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at center, transparent 40%, rgba(4, 8, 7, 0.75) 100%)",
        }}
      />
    </div>
  );
};

