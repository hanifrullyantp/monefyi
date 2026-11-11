import React, { useEffect, useLayoutEffect, useRef } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { createMotion3DEngine, Motion3DEngine } from "./Motion3DEngine";

export const Motion3DCanvas: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<Motion3DEngine | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    try {
      const engine = createMotion3DEngine(canvasRef.current, width, height);
      engineRef.current = engine;
      engine.draw(frame / fps);
    } catch (e) {
      console.error("Failed to initialize Motion3DEngine:", e);
    }

    return () => {
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
    };
  }, [width, height]);

  useLayoutEffect(() => {
    if (engineRef.current) {
      engineRef.current.draw(frame / fps);
    }
  }, [frame, fps]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        backgroundColor: "#c0e0ff",
      }}
    />
  );
};
