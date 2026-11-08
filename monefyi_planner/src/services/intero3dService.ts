// monefyi_planner/src/services/intero3dService.ts
// Service jembatan antara Monefyi Estimator dan 3D Intero (3d.intero.id)
import { compressToEncodedURIComponent } from 'lz-string';
import type { EstimationFormDraft, EstimationItem, EstimationItemDraft } from '../types/estimator';
import { parseDimensionInput } from '../lib/estimatorDimension';

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

/** Meter lari. "cm" dan "lembar" tidak dihitung sebagai meter. */
function lengthMeters(unit: string, qty: number): number | null {
  const u = unit.trim().toLowerCase();
  if (/^(m|m1|m'|ml|meter|meter lari)$/.test(u)) return qty;
  if (u === 'cm') return qty / 100;
  if (u === 'mm') return qty / 1000;
  return null;
}

/**
 * Menganalisis daftar item estimasi Monefyi dan mengusulkan parameter 3D Intero.
 */
export function analyzeEstimationForIntero(
  draft: EstimationFormDraft,
  items: Array<EstimationItem | EstimationItemDraft>
): InteroDimensionProposal {
  let totalBaseM = 0;
  let totalWallM = 0;
  let hasLHint = false;
  let hasUHint = false;
  let explicitSegments: number[] = [];

  const activeItems = items.filter((i) => i.included !== false);
  const textPool = [
    draft.title,
    draft.notes || '',
    ...activeItems.map((i) => `${i.name} ${i.notes || ''}`),
  ]
    .join(' ')
    .toLowerCase();

  // 1. Hitung total volume meter lari kabinet bawah & atas serta baca segmen L jika ada
  for (const item of activeItems) {
    const name = item.name.toLowerCase();
    const qty = Number(item.qty) || 0;
    const meters = lengthMeters(item.unit || '', qty);

    // Cek apakah item memiliki segmen L eksplisit (misal "2+2", "2.4+1.8")
    const itemWithDim = item as unknown as { dimension_expr?: string };
    if (itemWithDim.dimension_expr) {
      const parsedDim = parseDimensionInput(itemWithDim.dimension_expr);
      if (parsedDim.isL && parsedDim.segments.length >= 2 && explicitSegments.length === 0) {
        explicitSegments = parsedDim.segments;
        hasLHint = true;
      }
    }

    if (name.includes('bawah') || name.includes('base') || name.includes('bottom')) {
      totalBaseM += meters ?? qty * 0.6;
    } else if (name.includes('atas') || name.includes('wall') || name.includes('gantung') || name.includes('upper')) {
      totalWallM += meters ?? qty * 0.6;
    } else if (name.includes('kitchen set') && !name.includes('atas') && !name.includes('bawah')) {
      totalBaseM += meters ?? 2.4;
      totalWallM += meters ?? 2.4;
    }

  }
  if (/sudut|letter l|bentuk l/.test(textPool)) hasLHint = true;
  if (/bentuk u|letter u|tapal kuda/.test(textPool)) hasUHint = true;

  if (totalBaseM <= 0) totalBaseM = 3.0;

  // 2. Deteksi Appliances & Aksesoris
  const sink = /sink|wastafel|cuci piring/i.test(textPool);
  const cooktop = /kompor|cooktop|tanam|gas/i.test(textPool);
  const hood = /hood|cooker hood|penghisap|exhaust/i.test(textPool) || cooktop;
  const fridge = /kulkas|fridge|refrigerator|chiller/i.test(textPool);
  const island = /island|meja pulau|meja tengah/i.test(textPool);
  const dishRack = /rak piring|dish rack/i.test(textPool);
  const gasRack = /rak gas|tabung gas/i.test(textPool) || cooktop;
  const spiceRack = /rak bumbu|spice/i.test(textPool);

  // Bentuk hanya dari teks atau segmen eksplisit. Panjang meter lari tidak mengubah dapur lurus menjadi L/U.
  let shape: InteroKitchenShape = 'I';
  if (hasUHint || explicitSegments.length >= 3) shape = 'U';
  else if (hasLHint || explicitSegments.length === 2) shape = 'L';

  // 4. Hitung panjang dinding dalam cm (utamakan segmen eksplisit dari input 2+2)
  const lengthsCm = { left: 180, back: 240, right: 180, front: 240 };
  if (explicitSegments.length >= 2 && (shape === 'L' || shape === 'U')) {
    // Presisi langsung dari input estimator (misal 2+2 => back: 200, left: 200)
    lengthsCm.back = Math.round(explicitSegments[0] * 100);
    lengthsCm.left = Math.round(explicitSegments[1] * 100);
    if (explicitSegments.length >= 3) {
      lengthsCm.right = Math.round(explicitSegments[2] * 100);
    }
  } else if (shape === 'I') {
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
      sink,
      cooktop,
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

export interface InteroWizardLaunch {
  app: '3d-intero';
  kind: 'wizard';
  version: 1;
  projectName: string;
  clientName: string;
  notes: string;
  ceilingCm: number;
  input: {
    shape: InteroKitchenShape;
    lengths: InteroDimensionProposal['lengthsCm'];
    island: boolean;
    islandDims: { w: number; d: number };
    sink: { enabled: boolean; wallId: string; fromCorner: number };
    cooktop: { enabled: boolean; wallId: string; fromCorner: number };
    fridge: { enabled: boolean; wallId: string; fromCorner: number };
    electronic: { enabled: boolean; wallId: string; fromCorner: number };
    options: {
      magiccom: boolean;
      dispenser: boolean;
      microwave: boolean;
      bar: boolean;
      dishRack: boolean;
      spiceRack: boolean;
      gasRack: boolean;
      wallCabinets: boolean;
      hood: boolean;
    };
    style: null;
    material: InteroDimensionProposal['material'] & { bodyFollowsDoor: boolean };
  };
}

function spot(enabled: boolean, wallId: string, fromCorner: number) {
  return { enabled, wallId, fromCorner };
}

/** Parameter wizard saja. Koordinat kabinet dihitung oleh mesin 3D Intero. */
export function buildInteroWizardLaunch(
  draft: EstimationFormDraft,
  proposal: InteroDimensionProposal,
): InteroWizardLaunch {
  const a = proposal.detectedAppliances;
  const sideWall = proposal.shape === 'I' ? 'back' : 'left';
  return {
    app: '3d-intero',
    kind: 'wizard',
    version: 1,
    projectName: draft.title || 'Desain Kitchen Set Monefyi',
    clientName: draft.customer_name || '',
    notes: draft.notes || '',
    ceilingCm: proposal.ceilingCm,
    input: {
      shape: proposal.shape,
      lengths: { ...proposal.lengthsCm },
      island: a.island,
      islandDims: { w: 140, d: 75 },
      sink: spot(a.sink, 'back', 0),
      cooktop: spot(a.cooktop, 'back', 160),
      fridge: spot(a.fridge, sideWall, 0),
      electronic: spot(false, sideWall, 0),
      options: {
        magiccom: false,
        dispenser: false,
        microwave: false,
        bar: false,
        dishRack: a.dishRack,
        spiceRack: a.spiceRack,
        gasRack: a.gasRack,
        wallCabinets: proposal.totalWallM > 0,
        hood: a.hood,
      },
      style: null,
      material: { ...proposal.material, bodyFollowsDoor: false },
    },
  };
}

/** URL yang dibaca 3D Intero sebagai wizard, lalu digambar mesin layout. */
export function generateInteroLaunchUrl(
  launch: InteroWizardLaunch,
  domain: string = 'https://3d.intero.id',
): string {
  const compressed = compressToEncodedURIComponent(JSON.stringify(launch));
  const cleanDomain = domain.replace(/\/+$/, '');
  return `${cleanDomain}/#s=edit.${compressed}`;
}

/** Unduh muatan wizard. 3D Intero membangun kabinet saat file dibuka. */
export function downloadInteroFile(launch: InteroWizardLaunch, filename?: string): void {
  const json = JSON.stringify(launch, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename || launch.projectName.replace(/[^a-zA-Z0-9_-]/g, '_')}.intero`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
