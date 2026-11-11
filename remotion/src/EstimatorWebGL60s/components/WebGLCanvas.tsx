import React, { useEffect, useRef } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";

export interface WebGLRenderContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  frame: number;
  width: number;
  height: number;
  aspect: number;
}

interface WebGLCanvasProps {
  onInit: (ctx: WebGLRenderContext) => void;
  onUpdate: (ctx: WebGLRenderContext) => void;
  className?: string;
}

export const WebGLCanvas: React.FC<WebGLCanvasProps> = ({
  onInit,
  onUpdate,
  className = "",
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const ctxRef = useRef<WebGLRenderContext | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // High quality WebGL renderer with soft shadow mapping
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });

    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    // Clean bright pearl white fog
    scene.fog = new THREE.FogExp2(0xf8fafc, 0.018);

    const aspect = width / height;
    const camera = new THREE.PerspectiveCamera(42, aspect, 0.1, 100);
    camera.position.set(0, 3, 11);
    camera.lookAt(0, 0, 0);

    const ctx: WebGLRenderContext = {
      scene,
      camera,
      renderer,
      frame: 0,
      width,
      height,
      aspect,
    };
    ctxRef.current = ctx;

    onInit(ctx);

    return () => {
      renderer.dispose();
    };
  }, [width, height]);

  // Synchronize render loop with Remotion frame
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    ctx.frame = frame;
    onUpdate(ctx);
    ctx.renderer.render(ctx.scene, ctx.camera);
  }, [frame]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={`absolute inset-0 w-full h-full block ${className}`}
    />
  );
};
