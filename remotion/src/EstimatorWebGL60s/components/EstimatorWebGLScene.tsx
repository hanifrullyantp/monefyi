import React, { useRef } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { WebGLCanvas, WebGLRenderContext } from "./WebGLCanvas";
import {
  createFloorGrid,
  createParticleField,
  createDeskManualScene,
  createLaserScannerModel,
  createPBRModularCabinet,
  createLightPhoneMesh,
  createLightPdfMesh,
} from "./ThreeHelpers";

export const EstimatorWebGLScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const isReels = height > width;

  const objectsRef = useRef<{
    particles: THREE.Points;
    desk: ReturnType<typeof createDeskManualScene>;
    scanner: ReturnType<typeof createLaserScannerModel>;
    cabinet: ReturnType<typeof createPBRModularCabinet>;
    phone: ReturnType<typeof createLightPhoneMesh>;
    pdf: ReturnType<typeof createLightPdfMesh>;
    mainLight: THREE.DirectionalLight;
  } | null>(null);

  const handleInit = (ctx: WebGLRenderContext) => {
    const { scene } = ctx;

    // 1. Bright Daylight Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.9);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 2.8);
    mainLight.position.set(6, 12, 8);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 1024;
    mainLight.shadow.mapSize.height = 1024;
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0xd1fae5, 1.4);
    fillLight.position.set(-6, 8, -4);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight(0x34d399, 2.5, 30);
    rimLight.position.set(0, 4, 6);
    scene.add(rimLight);

    // 2. Clean White Studio Floor with Contact Shadows
    const floor = createFloorGrid();
    scene.add(floor);

    // 3. Floating Light Ambient Particles
    const particles = createParticleField();
    scene.add(particles);

    // 4. Scene 1 Desk Manual
    const desk = createDeskManualScene();
    scene.add(desk.group);

    // 5. Scene 2 Laser Scanner
    const scanner = createLaserScannerModel();
    scene.add(scanner.group);

    // 6. Scene 3 Modular Cabinet
    const cabinet = createPBRModularCabinet();
    scene.add(cabinet.group);

    // 7. Scene 3 & 4 Light Smartphone
    const phone = createLightPhoneMesh();
    scene.add(phone.group);

    // 8. Scene 4 Light PDF Document
    const pdf = createLightPdfMesh();
    scene.add(pdf.group);

    objectsRef.current = {
      particles,
      desk,
      scanner,
      cabinet,
      phone,
      pdf,
      mainLight,
    };
  };

  const handleUpdate = (ctx: WebGLRenderContext) => {
    const { camera } = ctx;
    const objs = objectsRef.current;
    if (!objs) return;

    // Ambient particle rotation
    objs.particles.rotation.y = frame * 0.001;

    // Phase 1 (0 - 555 frames): Jebakan Omset Semu (Kertas Manual & Kalkulator)
    if (frame < 555) {
      objs.desk.group.visible = true;
      objs.scanner.group.visible = false;
      objs.cabinet.group.visible = false;
      objs.phone.group.visible = false;
      objs.pdf.group.visible = false;

      // Camera orbital pan around the desk
      const camAngle = interpolate(frame, [0, 555], [-0.35, 0.35]);
      const camRadius = isReels ? 14 : 11;
      camera.position.x = Math.sin(camAngle) * camRadius;
      camera.position.z = Math.cos(camAngle) * camRadius;
      camera.position.y = interpolate(frame, [0, 555], [4.5, 3.2]);
      camera.lookAt(0, -0.2, 0);

      // Desk gentle bobbing
      objs.desk.group.rotation.y = frame * 0.003;
    }
    // Phase 2 (555 - 1170 frames): X-Ray Biaya Gaib (Laser Scanner)
    else if (frame < 1170) {
      objs.desk.group.visible = false;
      objs.scanner.group.visible = true;
      objs.cabinet.group.visible = false;
      objs.phone.group.visible = false;
      objs.pdf.group.visible = false;

      // Laser sweep animation up and down
      const laserY = Math.sin((frame - 555) * 0.07) * 1.8 + 1.2;
      objs.scanner.laserPlane.position.y = laserY;

      // Scanner model slow rotation
      objs.scanner.group.rotation.y = (frame - 555) * 0.004 - 0.2;

      // Camera push in
      const t = (frame - 555) / (1170 - 555);
      const camDist = interpolate(t, [0, 1], [12, 8.5]);
      camera.position.set(Math.sin((frame - 555) * 0.004) * camDist, 2.2, Math.cos((frame - 555) * 0.004) * camDist);
      camera.lookAt(0, 1.2, 0);
    }
    // Phase 3 (1170 - 1746 frames): Presisi Estimator (Modular Cabinet Expansion + Phone)
    else if (frame < 1746) {
      objs.desk.group.visible = false;
      objs.scanner.group.visible = false;
      objs.cabinet.group.visible = true;
      objs.phone.group.visible = true;
      objs.pdf.group.visible = false;

      // Smooth cabinet expansion along X (3.8m -> 4.5m)
      const expandProgress = interpolate(frame, [1340, 1480], [1, 1.24], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      objs.cabinet.setExpansion(expandProgress);

      const sizeStr = interpolate(frame, [1340, 1480], [3.8, 4.5], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      }).toFixed(1);

      const priceNum = Math.round(parseFloat(sizeStr) * 2900000 + 21982000);
      const priceStr = `Rp ${priceNum.toLocaleString("id-ID")}`;

      // Show shield drawer after frame 1500
      const showShield = frame >= 1500;
      objs.phone.updateScreen(priceStr, sizeStr, showShield);

      if (isReels) {
        objs.cabinet.group.position.set(0, -1.8, -1.2);
        objs.cabinet.group.rotation.set(0.18, -0.35, 0);

        objs.phone.group.position.set(0, 1.6, 1.6);
        objs.phone.group.rotation.set(0.1, -0.2, 0.02);
        objs.phone.group.scale.set(0.88, 0.88, 0.88);

        camera.position.set(0, 0.9, 12);
      } else {
        objs.cabinet.group.position.set(-2.8, -0.4, 0);
        objs.cabinet.group.rotation.set(0.12, 0.32, 0);

        objs.phone.group.position.set(2.8, 0.3, 0);
        objs.phone.group.rotation.set(0.08, -0.28, 0.02);
        objs.phone.group.scale.set(0.92, 0.92, 0.92);

        camera.position.set(0, 1.2, 10.5);
      }
      camera.lookAt(0, 0.2, 0);
    }
    // Phase 4 (1746 - 2070 frames): PDF Penawaran Resmi & Closing CTA
    else {
      objs.desk.group.visible = false;
      objs.scanner.group.visible = false;
      objs.cabinet.group.visible = false;
      objs.phone.group.visible = true;
      objs.pdf.group.visible = true;

      // PDF floats gracefully in center
      const floatY = Math.sin((frame - 1746) * 0.04) * 0.25 + 0.3;
      objs.pdf.group.position.set(0, floatY, 1.6);
      objs.pdf.group.rotation.set(0.08, Math.sin((frame - 1746) * 0.02) * 0.25 - 0.08, 0.03);

      // Rotating gold seal
      objs.pdf.goldSeal.rotation.z = (frame - 1746) * 0.025;

      // Phone in background
      objs.phone.group.position.set(isReels ? 0 : 4.2, -0.5, -2);
      objs.phone.group.scale.set(0.72, 0.72, 0.72);

      camera.position.set(0, 0.8, isReels ? 11 : 9.5);
      camera.lookAt(0, 0.2, 0);
    }
  };

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none">
      <WebGLCanvas onInit={handleInit} onUpdate={handleUpdate} />
    </div>
  );
};
