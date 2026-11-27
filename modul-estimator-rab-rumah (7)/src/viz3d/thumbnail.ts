import * as THREE from "three";
import type { BuildingModel, FacadeSpec, SpecState } from "../data/types";
import { buildHouse } from "./buildingMesh";
import { previewStudio } from './previewStudio';

/**
 * Satu renderer offscreen bersama untuk thumbnail kartu proyek.
 * Hasil di-cache per versi model (geometri + finishing + facade) di memori.
 */
let renderer: THREE.WebGLRenderer | null = null;
let unavailable = false;
const cache = new Map<string, string>();
let queue: Promise<unknown> = Promise.resolve();

export function thumbnailKey(model: BuildingModel, facade?: FacadeSpec, spec?: SpecState) {
  const s = JSON.stringify([model.levels, model.rooms, model.floors, model.roof, model.finishing, facade ?? null, spec?.lantai ?? null]);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return `studio-1-${(h >>> 0).toString(36)}`;
}

function getRenderer(): THREE.WebGLRenderer | null {
  if (unavailable) return null;
  if (renderer) return renderer;
  try {
    const canvas = document.createElement("canvas");
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.setSize(840, 400, false);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    return renderer;
  } catch {
    unavailable = true;
    return null;
  }
}

export function renderThumbnail(model: BuildingModel, facade?: FacadeSpec, spec?: SpecState): Promise<string | null> {
  const key = thumbnailKey(model, facade, spec);
  const hit = cache.get(key);
  if (hit) return Promise.resolve(hit);
  const job = queue.then(() => new Promise<string | null>((resolve) => {
    const r = getRenderer();
    if (!r) return resolve(null);
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight('#ffffff', '#a4aa98', 1.7));
    const sun = new THREE.DirectionalLight('#fff6df', 3.0);
    sun.position.set(-12, 19, -10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16 });
    sun.shadow.normalBias = 0.025;
    scene.add(sun);
    const rim = new THREE.DirectionalLight("#CFE9FF", 0.8);
    rim.position.set(12, 8, -12);
    scene.add(rim);
    const built = buildHouse(model, facade, spec, { shadows: true });
    scene.add(built.group);
    const studio = previewStudio(model, built.group);
    scene.add(studio.stage);
    const camera = new THREE.OrthographicCamera(-12, 12, 7, -7, 0.1, 200);
    camera.position.set(23, 17, -29); camera.lookAt(0, 1.5, 0); camera.updateMatrixWorld();
    scene.updateMatrixWorld(true);
    const bounds = new THREE.Box3(); const point = new THREE.Vector3();
    scene.traverseVisible(object => {
      if (!(object instanceof THREE.Mesh)) return;
      const attr = object.geometry.attributes.position;
      for (let i = 0; i < attr.count; i++) bounds.expandByPoint(point.fromBufferAttribute(attr, i).applyMatrix4(object.matrixWorld).applyMatrix4(camera.matrixWorldInverse));
    });
    const aspect = 840 / 400;
    const h = Math.max(bounds.max.y - bounds.min.y, (bounds.max.x - bounds.min.x) / aspect) * 0.62;
    const center = bounds.getCenter(new THREE.Vector3());
    Object.assign(camera, { left: center.x - h * aspect, right: center.x + h * aspect, top: center.y + h, bottom: center.y - h });
    camera.updateProjectionMatrix();
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.ShadowMaterial({ opacity: 0.14 }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = -.55; shadow.receiveShadow = true; scene.add(shadow);
    try {
      r.render(scene, camera);
      const url = r.domElement.toDataURL('image/png');
      cache.set(key, url);
      resolve(url);
    } catch {
      resolve(null);
    } finally {
      built.dispose(); studio.dispose(); shadow.geometry.dispose(); shadow.material.dispose(); sun.shadow.map?.dispose();
    }
  }));
  queue = job.catch(() => null);
  return job;
}
