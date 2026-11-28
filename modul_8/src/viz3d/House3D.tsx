import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { BuildingModel, FacadeSpec, SpecState } from "../data/types";
import { buildHouse } from "./buildingMesh";
import { isometricSvg } from "../geometry/svg";
import { cn } from "../utils/cn";

export interface SelectedPart {
  kind: "room" | "roof" | "wall" | "floor";
  name: string;
  level?: number;
  area?: number;
  wet?: boolean;
  roomId?: string;
}

export type CameraPreset = "isometrik" | "depan" | "samping" | "atas";

interface Props {
  model: BuildingModel;
  facade?: FacadeSpec;
  spec?: SpecState;
  className?: string;
  exploded?: boolean;
  preset?: CameraPreset;
  quality?: "hemat" | "standar" | "tinggi";
  onSelect?: (part: SelectedPart) => void;
  onWarnings?: (warnings: string[]) => void;
}

const PRESET_VECTORS: Record<CameraPreset, { pos: [number, number, number]; target: [number, number, number] }> = {
  isometrik: { pos: [1, 0.78, 1.15], target: [0, 0.28, 0] },
  depan: { pos: [0, 0.42, 1.75], target: [0, 0.32, 0] },
  samping: { pos: [1.75, 0.4, 0.08], target: [0, 0.32, 0] },
  atas: { pos: [0.001, 2.1, 0.02], target: [0, 0, 0] },
};

export function House3D({ model, facade, spec, className, exploded = false, preset = "isometrik", quality = "standar", onSelect, onWarnings }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const builtRef = useRef<ReturnType<typeof buildHouse> | null>(null);
  const frameRef = useRef<number | null>(null);
  const dirtyRef = useRef(true);
  const onSelectRef = useRef(onSelect);
  const onWarnRef = useRef(onWarnings);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  onSelectRef.current = onSelect;
  onWarnRef.current = onWarnings;

  const geoKey = useMemo(
    () => JSON.stringify([model.levels, model.rooms, model.floors, facade ?? null, spec?.lantai ?? null, exploded]),
    [model.levels, model.rooms, model.floors, facade, spec?.lantai, exploded],
  );

  const reduceMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  // Setup sekali
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: quality !== "hemat", alpha: true, powerPreference: "high-performance" });
    } catch {
      setFailed(true);
      return;
    }
    const shadows = quality === "tinggi" && (navigator.hardwareConcurrency ?? 4) > 4;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality === "hemat" ? 1 : quality === "tinggi" ? 2 : 1.6));
    renderer.setSize(Math.max(1, container.clientWidth), Math.max(1, container.clientHeight));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = shadows;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = "none";
    renderer.domElement.setAttribute("role", "img");
    renderer.domElement.setAttribute("aria-label", "Model 3D rumah. Seret untuk memutar, cubit atau scroll untuk zoom.");
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(40, Math.max(0.2, container.clientWidth / Math.max(1, container.clientHeight)), 0.1, 240);
    cameraRef.current = camera;

    scene.add(new THREE.HemisphereLight("#FBFFFD", "#7E9A8B", 2.15));
    const key = new THREE.DirectionalLight("#FFF3DC", 2.4);
    key.position.set(-11, 17, 13);
    key.castShadow = shadows;
    if (shadows) {
      key.shadow.mapSize.set(1024, 1024);
      key.shadow.camera.left = -22; key.shadow.camera.right = 22;
      key.shadow.camera.top = 22; key.shadow.camera.bottom = -22;
      key.shadow.bias = -0.0008;
    }
    scene.add(key);
    const rim = new THREE.DirectionalLight("#CFE9FF", 0.85);
    rim.position.set(12, 8, -12);
    scene.add(rim);
    const fill = new THREE.DirectionalLight("#E8FFF4", 0.5);
    fill.position.set(4, 3, 14);
    scene.add(fill);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !reduceMotion();
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 7;
    controls.maxDistance = 70;
    controls.minPolarAngle = 0.12;
    controls.maxPolarAngle = Math.PI / 2.03;
    controls.addEventListener("change", () => { dirtyRef.current = true; });
    controlsRef.current = controls;

    // Render loop on-demand: hanya render saat ada perubahan (dirty) atau damping aktif
    const loop = () => {
      frameRef.current = requestAnimationFrame(loop);
      const damping = controls.enableDamping && (controls as unknown as { _isUserInteracting?: boolean })._isUserInteracting !== false;
      if (dirtyRef.current || damping) {
        controls.update();
        renderer.render(scene, camera);
        if (!damping) dirtyRef.current = false;
      }
    };
    loop();

    const resize = () => {
      const c = containerRef.current;
      if (!c) return;
      const w = Math.max(1, c.clientWidth);
      const h = Math.max(1, c.clientHeight);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      dirtyRef.current = true;
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    let down: { x: number; y: number } | null = null;
    const onDown = (e: PointerEvent) => { down = { x: e.clientX, y: e.clientY }; };
    const onUp = (e: PointerEvent) => {
      if (!down || !builtRef.current) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      down = null;
      if (moved > 6) return;
      const rect = renderer.domElement.getBoundingClientRect();
      const pointer = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      const ray = new THREE.Raycaster();
      ray.setFromCamera(pointer, camera);
      const hits = ray.intersectObjects(builtRef.current.group.children, true);
      const hit = hits.find((h) => h.object.userData?.selectable);
      if (hit) onSelectRef.current?.(hit.object.userData.part as SelectedPart);
    };
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointerup", onUp);

    setReady(true);
    return () => {
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointerup", onUp);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      controls.dispose();
      if (builtRef.current) {
        scene.remove(builtRef.current.group);
        builtRef.current.dispose();
        builtRef.current = null;
      }
      renderer.dispose();
      renderer.domElement.remove();
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
    };
  }, [quality]);

  // Bangun ulang geometri hanya saat bentuk/spesifikasi berubah
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (builtRef.current) {
      scene.remove(builtRef.current.group);
      builtRef.current.dispose();
      builtRef.current = null;
    }
    const shadows = Boolean(rendererRef.current?.shadowMap.enabled);
    const built = buildHouse(model, facade, spec, { exploded, shadows });
    scene.add(built.group);
    builtRef.current = built;
    if (built.warnings.length) onWarnRef.current?.(built.warnings);
    dirtyRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoKey]);

  // Preset kamera
  useEffect(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;
    const fp = model.levels[0]?.footprint ?? { width: 8, depth: 7 };
    const radius = Math.max(11, Math.max(fp.width, fp.depth) * 1.75 + (model.floors - 1) * 2.2);
    const v = PRESET_VECTORS[preset];
    const target = new THREE.Vector3(v.target[0] * radius, v.target[1] * radius, v.target[2] * radius);
    const dest = new THREE.Vector3(v.pos[0] * radius, v.pos[1] * radius, v.pos[2] * radius);
    if (reduceMotion()) {
      camera.position.copy(dest);
      controls.target.copy(target);
      controls.update();
      dirtyRef.current = true;
      return;
    }
    const from = camera.position.clone();
    const fromTarget = controls.target.clone();
    const t0 = performance.now();
    let raf = 0;
    const tween = () => {
      const t = Math.min(1, (performance.now() - t0) / 380);
      const e = 1 - Math.pow(1 - t, 3);
      camera.position.lerpVectors(from, dest, e);
      controls.target.lerpVectors(fromTarget, target, e);
      controls.update();
      dirtyRef.current = true;
      if (t < 1) raf = requestAnimationFrame(tween);
    };
    tween();
    return () => cancelAnimationFrame(raf);
  }, [preset, model.levels, model.floors, geoKey]);

  const fallbackSvg = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(isometricSvg(model, 560))}`;
  return (
    <div className={cn("relative h-full w-full overflow-hidden", className)}>
      {failed ? (
        <div className="flex h-full min-h-[240px] w-full flex-col items-center justify-center bg-[#E7F0EA] p-4">
          <img src={fallbackSvg} alt="Ilustrasi isometrik rumah (WebGL tidak tersedia)" className="w-full max-w-[520px]" />
          <p className="mt-2 text-[11px] font-semibold text-muted">WebGL tidak tersedia — denah isometrik tetap mengikuti model.</p>
        </div>
      ) : (
        <div ref={containerRef} className="h-full min-h-[240px] w-full" />
      )}
      {!ready && !failed && <div className="absolute inset-0 flex items-center justify-center bg-[#E7F0EA]"><div className="skeleton h-24 w-40 rounded-xl" /></div>}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#D5E7DC]/60 to-transparent" />
    </div>
  );
}

export { buildHouse };
export type { BuiltScene } from "./buildingMesh";
