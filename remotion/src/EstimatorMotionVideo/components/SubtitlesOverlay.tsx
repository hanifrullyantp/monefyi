import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { SUBTITLES } from "../../data/subtitles";

export const SubtitlesOverlay: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const isReels = height > width;

  // Find the active subtitle
  const activeCue = SUBTITLES.find(
    (c) => frame >= c.startFrame && frame <= c.endFrame
  );

  if (!activeCue) {
    return null;
  }

  // Words inside active cue
  const words = activeCue.text.trim().split(/\s+/);
  const totalDuration = Math.max(1, activeCue.endFrame - activeCue.startFrame);
  const timePerWord = totalDuration / words.length;
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
      <div className="max-w-[960px] bg-[#050B09]/90 border border-white/20 px-6 py-4 rounded-3xl shadow-2xl flex flex-wrap justify-center items-center gap-x-3 gap-y-1.5 text-center">
        {words.map((word, idx) => {
          const isCurrent = idx === currentWordIndex;
          const isPassed = idx < currentWordIndex;

          let colorClass = "text-white/60 font-semibold";
          let scaleTransform = "scale(1)";
          let glowStyle: React.CSSProperties = {};

          if (isCurrent) {
            colorClass = "text-emerald-400 font-black";
            scaleTransform = "scale(1.08)";
            glowStyle = {
              textShadow: "0 0 16px rgba(52, 211, 153, 0.8)",
            };
          } else if (isPassed) {
            colorClass = "text-white font-bold";
          }

          return (
            <span
              key={`${activeCue.id}-${idx}`}
              style={{
                ...glowStyle,
                transform: scaleTransform,
              }}
              className={`tracking-tight inline-block ${
                isReels ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"
              } ${colorClass}`}
            >
              {word}
            </span>
          );
        })}
      </div>
    </div>
  );
};
