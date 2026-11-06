// monefyi_planner/src/services/intero3dService.ts
// Service jembatan antara Monefyi Estimator dan 3D Intero (3d.intero.id)
import { compressToEncodedURIComponent } from 'lz-string';
import type { EstimationFormDraft, EstimationItem } from '../types/estimator';

export type InteroKitchenShape = 'I' | 'L' | 'U' | 'G';
export type InteroDoorMaterial = 'HPL' | 'Duco' | 'PVC' | 'ACP' | 'Solid Wood' | 'Glass';
export type InteroCountertopType =
  | 'granit_hitam'
  | 'granit_putih'
  | 'granit_grey'
  | 'marble_putih'
  | 'marble_hitam'
  | 'carrara'
  | 'calacatta'
  | 'solid_surface'
  | 'butcher_block'
  | 'hpl';

export interface InteroDimensionProposal {
  shape: InteroKitchenShape;
  totalBaseM: number;
  totalWallM: number;
  lengthsCm: {
    left: number;
    back: number;
    right: number;
    front: number;
  };
  ceilingCm: number;
  detectedAppliances: {
    sink: boolean;
    cooktop: boolean;
    hood: boolean;
    fridge: boolean;
    island: boolean;
    dishRack: boolean;
    gasRack: boolean;
    spiceRack: boolean;
  };
  material: {
    doorMaterial: InteroDoorMaterial;
    doorColor: string;
    bodyColor: string;
    countertop: InteroCountertopType;
    handleType: 'bar' | 'knob' | 'j' | 'gola' | 'push';
    handleColor: string;
    led: boolean;
  };
}

export interface InteroV2 {
  x: number;
  z: number;
}

export interface InteroV3 {
  x: number;
  y: number;
  z: number;
}

export interface InteroWall {
  id: string;
  name: string;
  start: InteroV2;
  end: InteroV2;
}

export interface InteroCabinetItem {
  id: string;
  name: string;
  type: string;
  wallId: string | null;
  orderIndex: number;
  position: InteroV3;
  rotationY: number;
  dims: { w: number; h: number; d: number };
  materials: {
    doorMaterial: InteroDoorMaterial;
    doorColor: string;
    bodyFollowsDoor: boolean;
    bodyColor: string;
    sidesFollowDoor: boolean;
    toeKickFollowsDoor: boolean;
    handleColor: string;
    handleType: string;
    handleLength: number;
    handlePosition: string;
    softClose: boolean;
  };
  config: Record<string, unknown>;
  led: {
    underCabinet: boolean;
    insideUpper: boolean;
    insideBase: boolean;
    plinth: boolean;
    temperature: number;
    trigger: string;
    intensity: number;
  };
  visible: boolean;
  locked: boolean;
  colorLabel: string | null;
  createdAt: string;
}

export interface InteroProjectData {
  formatVersion: string;
  appVersion: string;
  projectName: string;
  createdAt: string;
  modifiedAt: string;
  settings: {
    globalCabinetHeight: number;
    baseHeight: number;
    wallGap: number;
    wallDepth: number;
    toeKick: number;
    unit: 'mm';
    countertop: {
      type: InteroCountertopType;
      thickness: number;
      overhang: number;
      backsplash: boolean;
      backsplashAuto: boolean;
      backsplashHeight: number;
      backsplashColor: string;
    };
    appearance: {
      canvasColor: string;
      wallColor: string;
      floorColor: string;
    };
    production: Record<string, unknown>;
  };
  walls: InteroWall[];
  cabinets: InteroCabinetItem[];
  dimensions: Array<{ id: string; a: InteroV3; b: InteroV3; label?: string }>;
  customComponents: unknown[];
}

/**
 * Menganalisis daftar item estimasi Monefyi dan mengusulkan parameter 3D Intero.
 */
export function analyzeEstimationForIntero(
  draft: EstimationFormDraft,
  items: EstimationItem[]
): InteroDimensionProposal {
  let totalBaseM = 0;
  let totalWallM = 0;
  let hasLHint = false;
  let hasUHint = false;

  const activeItems = items.filter((i) => i.included !== false);
  const textPool = [
    draft.title,
    draft.notes || '',
    ...activeItems.map((i) => `${i.name} ${i.notes || ''}`),
  ]
    .join(' ')
    .toLowerCase();

  // 1. Hitung total volume meter lari kabinet bawah & atas
  for (const item of activeItems) {
    const name = item.name.toLowerCase();
    const qty = Number(item.qty) || 0;
    const isMeter = /m|meter|m1|m'|ml/i.test(item.unit || '');

    if (name.includes('bawah') || name.includes('base') || name.includes('bottom')) {
      totalBaseM += isMeter ? qty : qty * 0.6; // default 60cm jika per unit
    } else if (name.includes('atas') || name.includes('wall') || name.includes('gantung') || name.includes('upper')) {
      totalWallM += isMeter ? qty : qty * 0.6;
    } else if (name.includes('kitchen set') && !name.includes('atas') && !name.includes('bawah')) {
      // Jika paket kitchen set gabungan (bawah + atas)
      totalBaseM += isMeter ? qty : 2.4;
      totalWallM += isMeter ? qty : 2.4;
    }

    if (name.includes('sudut') || name.includes('letter l') || name.includes('bentuk l')) {
      hasLHint = true;
    }
    if (name.includes('letter u') || name.includes('bentuk u')) {
      hasUHint = true;
    }
  }

  // Fallback jika tidak terdeteksi eksplisit
  if (totalBaseM <= 0) totalBaseM = 3.0;
  if (totalWallM <= 0) totalWallM = Math.min(totalBaseM, 2.4);

  // 2. Deteksi Appliances & Aksesoris
  const sink = /sink|wastafel|cuci piring/i.test(textPool);
  const cooktop = /kompor|cooktop|tanam|gas/i.test(textPool);
  const hood = /hood|cooker hood|penghisap|exhaust/i.test(textPool) || cooktop;
  const fridge = /kulkas|fridge|refrigerator|chiller/i.test(textPool);
  const island = /island|meja pulau|meja tengah/i.test(textPool);
  const dishRack = /rak piring|dish rack/i.test(textPool);
  const gasRack = /rak gas|tabung gas/i.test(textPool) || cooktop;
  const spiceRack = /rak bumbu|spice/i.test(textPool);

  // 3. Tentukan bentuk dapur
  let shape: InteroKitchenShape = 'I';
  if (hasUHint || totalBaseM >= 5.0) {
    shape = 'U';
  } else if (hasLHint || totalBaseM >= 3.2) {
    shape = 'L';
  }

  // 4. Hitung panjang dinding dalam cm
  const lengthsCm = { left: 180, back: 240, right: 180, front: 240 };
  if (shape === 'I') {
    lengthsCm.back = Math.max(160, Math.round(totalBaseM * 100));
  } else if (shape === 'L') {
    // Rasio standar: dinding belakang 60%, dinding kiri 40%
    const totalCm = Math.round(totalBaseM * 100);
    const backCm = Math.max(180, Math.round(totalCm * 0.58 / 10) * 10);
    const leftCm = Math.max(140, totalCm - backCm);
    lengthsCm.back = backCm;
    lengthsCm.left = leftCm;
  } else if (shape === 'U') {
    const totalCm = Math.round(totalBaseM * 100);
    const backCm = Math.max(200, Math.round(totalCm * 0.45 / 10) * 10);
    const sideCm = Math.max(140, Math.round(((totalCm - backCm) / 2) / 10) * 10);
    lengthsCm.back = backCm;
    lengthsCm.left = sideCm;
    lengthsCm.right = sideCm;
  }

  // 5. Deteksi Material
  let doorMaterial: InteroDoorMaterial = 'HPL';
  let doorColor = '#C9A97A'; // Warm Wood default
  let bodyColor = '#F5F5F3';

  if (/duco|cat duco/i.test(textPool)) {
    doorMaterial = 'Duco';
    doorColor = '#F5F5F3';
  } else if (/acp/i.test(textPool)) {
    doorMaterial = 'ACP';
    doorColor = '#3B3F45';
  } else if (/solid wood|kayu solid|jati/i.test(textPool)) {
    doorMaterial = 'Solid Wood';
    doorColor = '#5C3F2A';
  }

  // Deteksi Countertop
  let countertop: InteroCountertopType = 'granit_hitam';
  if (/granit putih/i.test(textPool)) countertop = 'granit_putih';
  else if (/granit grey|abu/i.test(textPool)) countertop = 'granit_grey';
  else if (/marmer putih|carrara/i.test(textPool)) countertop = 'carrara';
  else if (/calacatta/i.test(textPool)) countertop = 'calacatta';
  else if (/solid surface/i.test(textPool)) countertop = 'solid_surface';
  else if (/butcher|kayu/i.test(textPool) && /top table|countertop/i.test(textPool)) countertop = 'butcher_block';

  return {
    shape,
    totalBaseM,
    totalWallM,
    lengthsCm,
    ceilingCm: 260,
    detectedAppliances: {
      sink: sink || true, // default kitchen set memiliki sink
      cooktop: cooktop || true,
      hood,
      fridge,
      island,
      dishRack,
      gasRack,
      spiceRack,
    },
    material: {
      doorMaterial,
      doorColor,
      bodyColor,
      countertop,
      handleType: 'gola',
      handleColor: '#1A1A1A',
      led: /led|lampu/i.test(textPool),
    },
  };
}

/**
 * Membuat struktur dinding sesuai aturan Intero
 */
function buildInteroWalls(shape: InteroKitchenShape, lensMm: { left: number; back: number; right: number; front: number }): InteroWall[] {
  const { left: L, back: B, right: R, front: F } = lensMm;
  const walls: InteroWall[] = [];

  if (shape === 'I') {
    walls.push({ id: 'back', name: 'Dinding Belakang', start: { x: 0, z: 0 }, end: { x: B, z: 0 } });
  } else if (shape === 'L') {
    walls.push({ id: 'left', name: 'Dinding Kiri', start: { x: 0, z: L }, end: { x: 0, z: 0 } });
    walls.push({ id: 'back', name: 'Dinding Belakang', start: { x: 0, z: 0 }, end: { x: B, z: 0 } });
  } else if (shape === 'U') {
    walls.push({ id: 'left', name: 'Dinding Kiri', start: { x: 0, z: L }, end: { x: 0, z: 0 } });
    walls.push({ id: 'back', name: 'Dinding Belakang', start: { x: 0, z: 0 }, end: { x: B, z: 0 } });
    walls.push({ id: 'right', name: 'Dinding Kanan', start: { x: B, z: 0 }, end: { x: B, z: R } });
  } else {
    const gap = Math.max(1200, F);
    walls.push({ id: 'back', name: 'Dinding Belakang', start: { x: 0, z: 0 }, end: { x: B, z: 0 } });
    walls.push({ id: 'front', name: 'Dinding Depan', start: { x: B, z: gap }, end: { x: 0, z: gap } });
  }

  return walls;
}

function wallVector(w: InteroWall) {
  const dx = w.end.x - w.start.x;
  const dz = w.end.z - w.start.z;
  const length = Math.hypot(dx, dz) || 1;
  const dir = { x: dx / length, z: dz / length };
  const normal = { x: -dir.z, z: dir.x };
  const angle = Math.atan2(-dir.z, dir.x);
  return { dir, normal, length, angle };
}

function placeOnInteroWall(wall: InteroWall, offset: number, w: number, d: number) {
  const v = wallVector(wall);
  const along = offset + w / 2;
  return {
    position: {
      x: wall.start.x + v.dir.x * along + v.normal.x * (d / 2),
      y: 0,
      z: wall.start.z + v.dir.z * along + v.normal.z * (d / 2),
    },
    rotationY: (v.angle * 180) / Math.PI,
  };
}

let idCounter = 1;
function genId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${(idCounter++).toString(36)}`;
}

/**
 * Menghasilkan ProjectData lengkap untuk Intero dari proposal Monefyi
 */
export function buildInteroProjectData(
  draft: EstimationFormDraft,
  proposal: InteroDimensionProposal
): InteroProjectData {
  const { shape, lengthsCm, material, detectedAppliances } = proposal;
  const lensMm = {
    left: lengthsCm.left * 10,
    back: lengthsCm.back * 10,
    right: lengthsCm.right * 10,
    front: lengthsCm.front * 10,
  };

  const walls = buildInteroWalls(shape, lensMm);
  const cabinets: InteroCabinetItem[] = [];
  const baseHeight = 850;
  const wallDepth = 330;
  const globalHeight = Math.max(2200, Math.min(3000, proposal.ceilingCm * 10));

  const matConfig = {
    doorMaterial: material.doorMaterial,
    doorColor: material.doorColor,
    bodyFollowsDoor: false,
    bodyColor: material.bodyColor,
    sidesFollowDoor: true,
    toeKickFollowsDoor: true,
    handleColor: material.handleColor,
    handleType: material.handleType,
    handleLength: 128,
    handlePosition: 'top',
    softClose: true,
  };

  const defaultLed = {
    underCabinet: material.led,
    insideUpper: false,
    insideBase: false,
    plinth: false,
    temperature: 4000,
    trigger: 'always',
    intensity: 75,
  };

  // Loop setiap dinding untuk menempatkan kabinet
  for (const wall of walls) {
    const v = wallVector(wall);
    const isBack = wall.id === 'back';
    const isLeft = wall.id === 'left';
    let offset = 0;
    let order = 0;

    // Corner kabinet jika junction di awal
    if (shape === 'L' && isBack) {
      // Sudut pertemuan dinding kiri & belakang
      const cornerBaseId = genId('CB');
      const cornerTrans = placeOnInteroWall(wall, 0, 900, 900);
      cabinets.push({
        id: cornerBaseId,
        name: 'Corner Base L 90cm',
        type: 'corner_base',
        wallId: wall.id,
        orderIndex: order++,
        position: { ...cornerTrans.position, y: baseHeight / 2 },
        rotationY: cornerTrans.rotationY,
        dims: { w: 900, h: baseHeight, d: 900 },
        materials: matConfig,
        config: { cornerDoorStyle: 'bifold', lazySusan: true },
        led: defaultLed,
        visible: true,
        locked: false,
        colorLabel: null,
        createdAt: new Date().toISOString(),
      });

      // Corner kabinet atas
      const cornerWallTrans = placeOnInteroWall(wall, 0, 600, 600);
      cabinets.push({
        id: genId('CW'),
        name: 'Corner Wall L 60cm',
        type: 'corner_wall',
        wallId: wall.id,
        orderIndex: order++,
        position: { ...cornerWallTrans.position, y: baseHeight + 500 + 350 },
        rotationY: cornerWallTrans.rotationY,
        dims: { w: 600, h: 700, d: 600 },
        materials: matConfig,
        config: { cornerDoorStyle: 'bifold', parentId: cornerBaseId },
        led: defaultLed,
        visible: true,
        locked: false,
        colorLabel: null,
        createdAt: new Date().toISOString(),
      });

      offset = 900;
    }

    const wallLength = v.length;
    let remLength = wallLength - offset;

    // Tambahkan Kulkas jika di dinding kiri
    if (isLeft && detectedAppliances.fridge && remLength >= 900) {
      const fridgeW = 900;
      const trans = placeOnInteroWall(wall, offset, fridgeW, 650);
      cabinets.push({
        id: genId('FRG'),
        name: 'Kulkas 2 Pintu',
        type: 'fridge',
        wallId: wall.id,
        orderIndex: order++,
        position: { ...trans.position, y: 1750 / 2 },
        rotationY: trans.rotationY,
        dims: { w: fridgeW, h: 1750, d: 650 },
        materials: matConfig,
        config: { fridgeType: 'sbs', fridgeW, fridgeH: 1750, fridgeD: 650 },
        led: defaultLed,
        visible: true,
        locked: false,
        colorLabel: null,
        createdAt: new Date().toISOString(),
      });
      offset += fridgeW;
      remLength -= fridgeW;
    }

    // Tempatkan Sink di dinding belakang
    if (isBack && detectedAppliances.sink && remLength >= 800) {
      const sinkW = 800;
      const trans = placeOnInteroWall(wall, offset, sinkW, 600);
      const sinkId = genId('SNK');
      cabinets.push({
        id: sinkId,
        name: 'Sink Cabinet 80cm',
        type: 'sink_base',
        wallId: wall.id,
        orderIndex: order++,
        position: { ...trans.position, y: baseHeight / 2 },
        rotationY: trans.rotationY,
        dims: { w: sinkW, h: baseHeight, d: 600 },
        materials: matConfig,
        config: { doorCount: 2, leftAccessory: detectedAppliances.dishRack ? 'dish_rack' : 'shelf', rightAccessory: 'trash_bin' },
        led: defaultLed,
        visible: true,
        locked: false,
        colorLabel: null,
        createdAt: new Date().toISOString(),
      });

      // Pasang kabinet atas rak piring di atas sink
      const wallTrans = placeOnInteroWall(wall, offset, sinkW, wallDepth);
      cabinets.push({
        id: genId('W_SNK'),
        name: 'Rak Piring Atas 80cm',
        type: 'wall',
        wallId: wall.id,
        orderIndex: order++,
        position: { ...wallTrans.position, y: baseHeight + 500 + 350 },
        rotationY: wallTrans.rotationY,
        dims: { w: sinkW, h: 700, d: wallDepth },
        materials: matConfig,
        config: { doorCount: 2, parentId: sinkId },
        led: defaultLed,
        visible: true,
        locked: false,
        colorLabel: null,
        createdAt: new Date().toISOString(),
      });

      offset += sinkW;
      remLength -= sinkW;
    }

    // Tempatkan Kompor (Cooktop + Hood)
    if (isBack && detectedAppliances.cooktop && remLength >= 600) {
      const cookW = 800;
      const trans = placeOnInteroWall(wall, offset, cookW, 600);
      const cookId = genId('CKT');
      cabinets.push({
        id: cookId,
        name: 'Cooktop Cabinet 80cm',
        type: 'cooktop_base',
        wallId: wall.id,
        orderIndex: order++,
        position: { ...trans.position, y: baseHeight / 2 },
        rotationY: trans.rotationY,
        dims: { w: cookW, h: baseHeight, d: 600 },
        materials: matConfig,
        config: { doorCount: 2, drawerCount: 1, rightAccessory: detectedAppliances.gasRack ? 'gas_rack' : 'shelf' },
        led: defaultLed,
        visible: true,
        locked: false,
        colorLabel: null,
        createdAt: new Date().toISOString(),
      });

      // Pasang Cooker Hood
      const hoodTrans = placeOnInteroWall(wall, offset, cookW, wallDepth);
      cabinets.push({
        id: genId('HD'),
        name: 'Cooker Hood 80cm',
        type: 'hood',
        wallId: wall.id,
        orderIndex: order++,
        position: { ...hoodTrans.position, y: baseHeight + 500 + 400 },
        rotationY: hoodTrans.rotationY,
        dims: { w: cookW, h: 800, d: wallDepth },
        materials: matConfig,
        config: { hoodHeight: 70, parentId: cookId },
        led: defaultLed,
        visible: true,
        locked: false,
        colorLabel: null,
        createdAt: new Date().toISOString(),
      });

      offset += cookW;
      remLength -= cookW;
    }

    // Isi sisa dinding dengan kabinet bawah dan kabinet atas modular (60cm / 40cm)
    while (remLength >= 400) {
      const w = remLength >= 800 ? 800 : remLength >= 600 ? 600 : 400;
      const baseId = genId('BC');
      const bTrans = placeOnInteroWall(wall, offset, w, 600);

      cabinets.push({
        id: baseId,
        name: `Base Cabinet ${w / 10}cm`,
        type: 'base',
        wallId: wall.id,
        orderIndex: order++,
        position: { ...bTrans.position, y: baseHeight / 2 },
        rotationY: bTrans.rotationY,
        dims: { w, h: baseHeight, d: 600 },
        materials: matConfig,
        config: { doorCount: w <= 450 ? 1 : 2, drawerCount: w >= 600 ? 1 : 0 },
        led: defaultLed,
        visible: true,
        locked: false,
        colorLabel: null,
        createdAt: new Date().toISOString(),
      });

      // Kabinet atas
      const wTrans = placeOnInteroWall(wall, offset, w, wallDepth);
      cabinets.push({
        id: genId('WC'),
        name: `Wall Cabinet ${w / 10}cm`,
        type: 'wall',
        wallId: wall.id,
        orderIndex: order++,
        position: { ...wTrans.position, y: baseHeight + 500 + 350 },
        rotationY: wTrans.rotationY,
        dims: { w, h: 700, d: wallDepth },
        materials: matConfig,
        config: { doorCount: w <= 450 ? 1 : 2, parentId: baseId },
        led: defaultLed,
        visible: true,
        locked: false,
        colorLabel: null,
        createdAt: new Date().toISOString(),
      });

      offset += w;
      remLength -= w;
    }
  }

  // Tambahkan Island Table jika terdeteksi
  if (detectedAppliances.island) {
    const isW = 1400;
    const isD = 750;
    cabinets.push({
      id: genId('ISL'),
      name: 'Island Table 140cm',
      type: 'island',
      wallId: null,
      orderIndex: 999,
      position: { x: lensMm.back / 2, y: baseHeight / 2, z: (lensMm.left || 1800) / 2 + 300 },
      rotationY: 0,
      dims: { w: isW, h: baseHeight, d: isD },
      materials: matConfig,
      config: { islandDoorsPerSide: 2, stools: 2, barOverhang: 200 },
      led: defaultLed,
      visible: true,
      locked: false,
      colorLabel: null,
      createdAt: new Date().toISOString(),
    });
  }

  return {
    formatVersion: '1.0',
    appVersion: '3D Intero 1.0 (Monefyi Sync)',
    projectName: draft.title || 'Desain Kitchen Set Monefyi',
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    settings: {
      globalCabinetHeight: globalHeight,
      baseHeight,
      wallGap: 500,
      wallDepth,
      toeKick: 100,
      unit: 'mm',
      countertop: {
        type: material.countertop,
        thickness: 20,
        overhang: 20,
        backsplash: true,
        backsplashAuto: true,
        backsplashHeight: 600,
        backsplashColor: '#ECE4D8',
      },
      appearance: {
        canvasColor: '#E4E7EB',
        wallColor: '#D2D3D1',
        floorColor: '#D9D2C7',
      },
      production: {
        clientName: draft.customer_name || '',
        notes: draft.notes || '',
      },
    },
    walls,
    cabinets,
    dimensions: [],
    customComponents: [],
  };
}

/**
 * Menghasilkan URL instant untuk membuka 3d.intero.id via LZ-String Hash
 */
export function generateInteroLaunchUrl(
  projectData: InteroProjectData,
  domain: string = 'https://3d.intero.id'
): string {
  const json = JSON.stringify(projectData);
  const compressed = compressToEncodedURIComponent(json);
  const cleanDomain = domain.replace(/\/+$/, '');
  return `${cleanDomain}/#s=edit.${compressed}`;
}

/**
 * Mengunduh berkas `.intero` lokal untuk arsip atau impor manual
 */
export function downloadInteroFile(projectData: InteroProjectData, filename?: string): void {
  const json = JSON.stringify(projectData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename || projectData.projectName.replace(/[^a-zA-Z0-9_-]/g, '_')}.intero`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

