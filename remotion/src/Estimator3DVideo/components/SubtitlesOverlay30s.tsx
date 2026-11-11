import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { SUBTITLES_30S } from "../../data/subtitles30s";

export const SubtitlesOverlay30s: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isReels = height > width;

  // Find the active subtitle cue
  const activeCue = SUBTITLES_30S.find(
    (c) => frame >= c.startFrame && frame <= c.endFrame
  );

  if (!activeCue) {
    return null;
  }

  // Calculate cue entrance animation
  const cueProgress = spring({
    frame: frame - activeCue.startFrame,
    fps,
    config: { damping: 14, stiffness: 180 },
  });

  const translateY = interpolate(cueProgress, [0, 1], [15, 0]);
  const opacity = interpolate(cueProgress, [0, 0.4, 1], [0, 1, 1]);
  const scale = interpolate(cueProgress, [0, 1], [0.94, 1]);

  // Words inside active cue
  const words = activeCue.text.trim().split(/\s+/);
  const totalDuration = activeCue.endFrame - activeCue.startFrame;
  const timePerWord = Math.max(1, totalDuration / words.length);
  const currentWordIndex = Math.min(
    words.length - 1,
    Math.floor((frame - activeCue.startFrame) / timePerWord)
  );

  return (
    <div
      className={`absolute left-0 right-0 flex justify-center items-center px-6 pointer-events-none z-50 ${
        isReels ? "bottom-20" : "bottom-12"
      }`}
    >
      <div
        style={{
          transform: `translateY(${translateY}px) scale(${scale})`,
          opacity,
        }}
        className="max-w-[960px] bg-black/80 backdrop-blur-xl border border-white/20 px-6 py-3.5 rounded-3xl shadow-2xl flex flex-wrap justify-center items-center gap-x-2.5 gap-y-1.5 text-center"
      >
        {words.map((word, idx) => {
          const isCurrent = idx === currentWordIndex;
          const isPassed = idx < currentWordIndex;

          let colorClass = "text-white/60";
          let scaleStyle = "scale-100";
          let glowStyle = {};

          if (isCurrent) {
            colorClass = "text-emerald-400 font-black";
            scaleStyle = "scale-110";
            glowStyle = {
              textShadow: "0 0 18px rgba(52, 211, 153, 0.9)",
            };
          } else if (isPassed) {
            colorClass = "text-white font-bold";
          }

          return (
            <span
              key={`${activeCue.id}-${idx}`}
              style={glowStyle}
              className={`tracking-tight transition-all duration-150 inline-block transform ${
                isReels ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"
              } ${colorClass} ${scaleStyle}`}
            >
              {word}
            </span>
          );
        })}
      </div>
    </div>
  );
};

