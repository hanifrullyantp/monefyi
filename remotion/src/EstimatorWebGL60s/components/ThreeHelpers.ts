import * as THREE from "three";

/**
 * Creates an ultra-clean, bright Apple-style studio floor
 */
export function createFloorGrid(): THREE.Group {
  const group = new THREE.Group();

  // Subtle clean grid helper in soft slate
  const grid = new THREE.GridHelper(50, 50, 0x10b981, 0xe2e8f0);
  grid.position.y = -2.5;
  group.add(grid);

  // Soft white floor plane
  const floorGeo = new THREE.PlaneGeometry(80, 80);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.2,
    metalness: 0.05,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -2.52;
  floor.receiveShadow = true;
  group.add(floor);

  // Soft diffuse contact shadow beneath the center stage
  const shadowGeo = new THREE.CircleGeometry(7, 64);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x94a3b8,
    transparent: true,
    opacity: 0.18,
  });
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -2.51;
  group.add(shadow);

  return group;
}

/**
 * Creates 400 soft ambient sparkle / bokeh orbs in emerald & white
 */
export function createParticleField(): THREE.Points {
  const count = 400;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 35;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 22;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 35;

    // Soft mint & pearlescent colors
    const isEmerald = Math.random() > 0.4;
    colors[i * 3] = isEmerald ? 0.06 : 0.8;
    colors[i * 3 + 1] = isEmerald ? 0.72 : 0.85;
    colors[i * 3 + 2] = isEmerald ? 0.5 : 0.95;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.15,
    vertexColors: true,
    transparent: true,
    opacity: 0.55,
  });

  return new THREE.Points(geometry, material);
}

/**
 * Scene 1 Asset: Desk with manual papers, old calculator, and red warning badges
 */
export function createDeskManualScene(): {
  group: THREE.Group;
  paperStack: THREE.Group;
  calculator: THREE.Group;
} {
  const group = new THREE.Group();

  // Floating Desk Platter (Clean Nordic Birch Wood)
  const deskGeo = new THREE.CylinderGeometry(5.2, 5.2, 0.3, 64);
  const deskMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.25,
    metalness: 0.05,
  });
  const desk = new THREE.Mesh(deskGeo, deskMat);
  desk.position.y = -0.5;
  desk.receiveShadow = true;
  group.add(desk);

  // Stack of manual paper blueprints
  const paperStack = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const paperGeo = new THREE.BoxGeometry(2.4, 0.02, 3.2);
    const paperMat = new THREE.MeshStandardMaterial({
      color: i === 0 ? 0xfffbeb : 0xffffff,
      roughness: 0.5,
    });
    const paper = new THREE.Mesh(paperGeo, paperMat);
    paper.position.set((i - 1.5) * 0.15, -0.3 + i * 0.04, (i - 1.5) * 0.1);
    paper.rotation.y = (i - 1.5) * 0.2;
    paper.castShadow = true;
    paperStack.add(paper);
  }
  group.add(paperStack);

  // 3D Classic Calculator
  const calcGroup = new THREE.Group();
  const calcBodyGeo = new THREE.BoxGeometry(1.6, 0.18, 2.2);
  const calcBodyMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.3,
    metalness: 0.2,
  });
  const calcBody = new THREE.Mesh(calcBodyGeo, calcBodyMat);
  calcBody.castShadow = true;
  calcGroup.add(calcBody);

  // LCD Screen
  const lcdGeo = new THREE.PlaneGeometry(1.3, 0.45);
  const lcdMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8 });
  const lcd = new THREE.Mesh(lcdGeo, lcdMat);
  lcd.rotation.x = -Math.PI / 2;
  lcd.position.set(0, 0.1, -0.65);
  calcGroup.add(lcd);

  // Keys grid
  const keyMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.4 });
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 3; c++) {
      const keyGeo = new THREE.BoxGeometry(0.3, 0.08, 0.25);
      const key = new THREE.Mesh(keyGeo, keyMat);
      key.position.set(-0.4 + c * 0.4, 0.1, -0.15 + r * 0.35);
      calcGroup.add(key);
    }
  }

  calcGroup.position.set(2.2, -0.25, 0.5);
  calcGroup.rotation.y = -0.4;
  group.add(calcGroup);

  return { group, paperStack, calculator: calcGroup };
}

/**
 * Scene 2 Asset: Sleek Modern Kitchen Architectural Model with Laser Scanner
 */
export function createLaserScannerModel(): {
  group: THREE.Group;
  laserPlane: THREE.Mesh;
  leakBadges: THREE.Group;
} {
  const group = new THREE.Group();

  // Clean White Solid-Surface Counter & Base
  const baseGeo = new THREE.BoxGeometry(4.8, 2.4, 2.0);
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.15,
    metalness: 0.05,
  });
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  // Upper Cabinet in Soft Matte Emerald / Charcoal
  const upperGeo = new THREE.BoxGeometry(4.8, 1.8, 1.3);
  const upperMat = new THREE.MeshStandardMaterial({
    color: 0x064e3b,
    roughness: 0.3,
    metalness: 0.1,
  });
  const upper = new THREE.Mesh(upperGeo, upperMat);
  upper.position.y = 2.8;
  upper.castShadow = true;
  group.add(upper);

  // Sweeping Laser Scanline Plane (Vibrant Emerald Light)
  const laserGeo = new THREE.PlaneGeometry(6.2, 3.2);
  const laserMat = new THREE.MeshBasicMaterial({
    color: 0x10b981,
    transparent: true,
    opacity: 0.35,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  const laserPlane = new THREE.Mesh(laserGeo, laserMat);
  laserPlane.rotation.x = Math.PI / 2;
  group.add(laserPlane);

  // 3D Callout Floating Badges (Biaya Gaib)
  const leakBadges = new THREE.Group();

  const badgeData = [
    { text: "Baut & Aksesoris: +Rp 450rb", pos: [-2.2, 0.4, 1.2] },
    { text: "Ongkir Bahan: +Rp 600rb", pos: [2.0, -0.6, 1.1] },
    { text: "Upah Lembur Molor: +Rp 850rb", pos: [0.3, 3.0, 0.9] },
  ];

  badgeData.forEach((item) => {
    const badgeGroup = new THREE.Group();

    // Red sphere marker
    const sphereGeo = new THREE.SphereGeometry(0.16, 16, 16);
    const sphereMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xef4444,
      emissiveIntensity: 1.5,
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    badgeGroup.add(sphere);

    // Callout box
    const cardGeo = new THREE.BoxGeometry(2.4, 0.55, 0.08);
    const cardMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.1,
    });
    const card = new THREE.Mesh(cardGeo, cardMat);
    card.position.set(1.4, 0.4, 0);
    badgeGroup.add(card);

    // Red pill border
    const borderGeo = new THREE.BoxGeometry(2.44, 0.59, 0.04);
    const borderMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const border = new THREE.Mesh(borderGeo, borderMat);
    border.position.set(1.4, 0.4, -0.02);
    badgeGroup.add(border);

    badgeGroup.position.set(item.pos[0], item.pos[1], item.pos[2]);
    leakBadges.add(badgeGroup);
  });

  group.add(leakBadges);

  return { group, laserPlane, leakBadges };
}

/**
 * Scene 3 Asset: Pristine High-End PBR Modular Furniture with Measurement Ruler
 */
export function createPBRModularCabinet(): {
  group: THREE.Group;
  countertop: THREE.Mesh;
  body: THREE.Mesh;
  doors: THREE.Mesh[];
  rulerText: THREE.Mesh;
  setExpansion: (scaleX: number) => void;
} {
  const group = new THREE.Group();

  // White Carrara Marble Countertop
  const topGeo = new THREE.BoxGeometry(4.4, 0.28, 2.1);
  const topMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.1,
    metalness: 0.1,
  });
  const countertop = new THREE.Mesh(topGeo, topMat);
  countertop.position.y = 1.1;
  countertop.castShadow = true;
  group.add(countertop);

  // Natural Warm Oak Body
  const bodyGeo = new THREE.BoxGeometry(4.2, 2.0, 1.9);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xd97706, // Rich warm amber oak
    roughness: 0.4,
    metalness: 0.05,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.castShadow = true;
  group.add(body);

  // 3 Fluted Doors with Brushed Brass Handles
  const doors: THREE.Mesh[] = [];
  const doorMat = new THREE.MeshStandardMaterial({
    color: 0xb45309,
    roughness: 0.35,
    metalness: 0.1,
  });
  const handleMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    metalness: 0.9,
    roughness: 0.15,
  });

  for (let i = 0; i < 3; i++) {
    const doorGeo = new THREE.BoxGeometry(1.3, 1.8, 0.1);
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(-1.4 + i * 1.4, 0, 1.0);
    door.castShadow = true;
    group.add(door);
    doors.push(door);

    const handleGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.55, 16);
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.set(-1.4 + i * 1.4, 0.25, 1.08);
    group.add(handle);
  }

  // Dimension Measurement Beam (3.8m -> 4.5m)
  const rulerGeo = new THREE.BoxGeometry(4.4, 0.15, 0.15);
  const rulerMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
  const rulerText = new THREE.Mesh(rulerGeo, rulerMat);
  rulerText.position.set(0, 1.6, 0);
  group.add(rulerText);

  const setExpansion = (scaleX: number) => {
    countertop.scale.x = scaleX;
    body.scale.x = scaleX;
    rulerText.scale.x = scaleX;
    doors.forEach((door, idx) => {
      door.position.x = (-1.4 + idx * 1.4) * scaleX;
    });
  };

  return { group, countertop, body, doors, rulerText, setExpansion };
}

/**
 * Scene 3 & 4 Asset: Ceramic White & Silver Smartphone 3D with Crisp Canvas UI
 */
export function createLightPhoneMesh(): {
  group: THREE.Group;
  screenTexture: THREE.CanvasTexture;
  updateScreen: (priceStr: string, sizeStr: string, showShield: boolean) => void;
} {
  const group = new THREE.Group();

  // Ceramic Pearl White Chassis
  const chassisGeo = new THREE.BoxGeometry(3.3, 6.6, 0.32);
  const chassisMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.1,
    roughness: 0.15,
  });
  const chassis = new THREE.Mesh(chassisGeo, chassisMat);
  chassis.castShadow = true;
  group.add(chassis);

  // Chrome Silver Bezel Trim
  const bezelGeo = new THREE.BoxGeometry(3.34, 6.64, 0.28);
  const bezelMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.9,
    roughness: 0.1,
  });
  const bezel = new THREE.Mesh(bezelGeo, bezelMat);
  group.add(bezel);

  // Canvas for App Screen (Crisp High-Resolution 1024x2048)
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 2048;
  const ctx = canvas.getContext("2d")!;
  const screenTexture = new THREE.CanvasTexture(canvas);
  screenTexture.generateMipmaps = true;

  const updateScreen = (priceStr: string, sizeStr: string, showShield: boolean) => {
    // Crisp clean background
    ctx.fillStyle = "#F8FAFC";
    ctx.fillRect(0, 0, 1024, 2048);

    // iOS Status Bar
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, 1024, 180);
    ctx.fillStyle = "#0F172A";
    ctx.font = "bold 56px sans-serif";
    ctx.fillText("09:41", 80, 115);

    // Dynamic Island
    ctx.fillStyle = "#0F172A";
    ctx.beginPath();
    ctx.roundRect(380, 60, 264, 75, 40);
    ctx.fill();

    // App Header
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 180, 1024, 160);
    ctx.fillStyle = "#064E3B";
    ctx.font = "900 64px sans-serif";
    ctx.fillText("Monefyi Estimator", 80, 285);

    ctx.fillStyle = "#D1FAE5";
    ctx.beginPath();
    ctx.roundRect(740, 220, 200, 70, 20);
    ctx.fill();
    ctx.fillStyle = "#065F46";
    ctx.font = "bold 36px monospace";
    ctx.fillText("PRO V2", 775, 270);

    // Grand Emerald Hero Card
    const grad = ctx.createLinearGradient(60, 380, 960, 920);
    grad.addColorStop(0, "#065F46");
    grad.addColorStop(1, "#047857");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(60, 380, 904, 520, 48);
    ctx.fill();

    ctx.fillStyle = "#A7F3D0";
    ctx.font = "bold 40px monospace";
    ctx.fillText("TOTAL ESTIMASI PROYEK", 120, 480);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "900 108px monospace";
    ctx.fillText(priceStr, 120, 620);

    ctx.fillStyle = "#D1FAE5";
    ctx.font = "bold 48px sans-serif";
    ctx.fillText("✓ Margin Untung: 36% (Aman)", 120, 730);

    ctx.fillStyle = "#6EE7B7";
    ctx.font = "38px sans-serif";
    ctx.fillText("Proyek: Kitchen Set 4m Pontianak", 120, 810);

    // Interactive Dimension & Spec Row
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.roundRect(60, 940, 904, 320, 40);
    ctx.fill();
    ctx.strokeStyle = "#10B981";
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.fillStyle = "#0F172A";
    ctx.font = "900 52px sans-serif";
    ctx.fillText("Kabinet Atas — Solid Surface", 120, 1040);

    ctx.fillStyle = "#059669";
    ctx.font = "bold 64px monospace";
    ctx.fillText(`Panjang: ${sizeStr} meter`, 120, 1145);

    ctx.fillStyle = "#64748B";
    ctx.font = "40px sans-serif";
    ctx.fillText("Kalkulasi Otomatis Realtime", 120, 1210);

    // Export WhatsApp Button
    ctx.fillStyle = "#10B981";
    ctx.beginPath();
    ctx.roundRect(60, 1310, 904, 160, 36);
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "900 52px sans-serif";
    ctx.fillText("Kirim Penawaran WA + PDF Resmi", 140, 1410);

    // Pop-Up Shield Drawer (Batas Aman Diskon)
    if (showShield) {
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.roundRect(40, 1510, 944, 480, 48);
      ctx.fill();
      ctx.strokeStyle = "#10B981";
      ctx.lineWidth = 8;
      ctx.stroke();

      ctx.fillStyle = "#065F46";
      ctx.font = "900 54px sans-serif";
      ctx.fillText("🛡️ BATAS AMAN DISKON", 100, 1620);

      ctx.fillStyle = "#D97706";
      ctx.font = "900 68px monospace";
      ctx.fillText("Maksimal Diskon: Rp 2jt", 100, 1730);

      ctx.fillStyle = "#047857";
      ctx.font = "bold 46px sans-serif";
      ctx.fillText("Margin Bersih Tetap 31% (Anti Tekor!)", 100, 1830);

      ctx.fillStyle = "#64748B";
      ctx.font = "36px sans-serif";
      ctx.fillText("Kunci keuntunganmu sebelum deal dengan customer.", 100, 1910);
    }

    screenTexture.needsUpdate = true;
  };

  updateScreen("Rp 33.002.000", "3.8", false);

  const screenGeo = new THREE.PlaneGeometry(3.1, 6.2);
  const screenMat = new THREE.MeshBasicMaterial({ map: screenTexture });
  const screen = new THREE.Mesh(screenGeo, screenMat);
  screen.position.z = 0.17;
  group.add(screen);

  return { group, screenTexture, updateScreen };
}

/**
 * Scene 4 Asset: Official White PDF Document with Embossed Gold Seal
 */
export function createLightPdfMesh(): {
  group: THREE.Group;
  goldSeal: THREE.Mesh;
} {
  const group = new THREE.Group();

  // Crisp White Paper Sheet
  const paperGeo = new THREE.BoxGeometry(3.6, 5.0, 0.05);
  const paperMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.15,
    metalness: 0.05,
  });
  const paper = new THREE.Mesh(paperGeo, paperMat);
  paper.castShadow = true;
  group.add(paper);

  // Emerald Header Bar
  const headerGeo = new THREE.PlaneGeometry(3.5, 0.9);
  const headerMat = new THREE.MeshBasicMaterial({ color: 0x065f46 });
  const header = new THREE.Mesh(headerGeo, headerMat);
  header.position.set(0, 1.95, 0.03);
  group.add(header);

  // Embossed Metallic Gold Seal
  const sealGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.09, 32);
  const sealMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    metalness: 0.95,
    roughness: 0.1,
  });
  const goldSeal = new THREE.Mesh(sealGeo, sealMat);
  goldSeal.rotation.x = Math.PI / 2;
  goldSeal.position.set(1.15, -1.6, 0.06);
  group.add(goldSeal);

  return { group, goldSeal };
}
