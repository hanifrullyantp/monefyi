// monefyi_planner/src/lib/estimatorDimension.ts
// Ukuran: angka langsung, perkalian (2x3, 2 kali 3), atau segmen sudut L (2+2).
// Perkalian menjadi quantity. Tanda + tetap panjang dinding untuk 3D Intero.

import type { EstimationItemDraft } from '../types/estimator';

export interface ParsedDimension {
  /** Nilai total hasil perhitungan (contoh: 2+2 => 4) */
  total: number;
  /** Ekspresi segmen yang tersimpan (contoh: "2+2", "2.4+1.8"), kosong jika total biasa */
  expr: string;
  /** Daftar segmen panjang dinding (contoh: [2, 2]) */
  segments: number[];
  /** Apakah terdeteksi sebagai bentuk sudut L atau U */
  isL: boolean;
}

const DIMENSION_NUMBER = String.raw`\d+(?:[.,]\d+)?`;
const COMPLETE_NUMBER = new RegExp(`^${DIMENSION_NUMBER}$`);
const COMPLETE_SUM = new RegExp(`^${DIMENSION_NUMBER}(?:\\+${DIMENSION_NUMBER})+$`);
const COMPLETE_PRODUCT = new RegExp(`^${DIMENSION_NUMBER}(?:[x*]${DIMENSION_NUMBER})+$`);

/**
 * Memeriksa apakah satuan adalah satuan panjang / meter lari (m, lm, meter, m1, dll).
 */
export function isLinearUnit(unit?: string): boolean {
  if (!unit) return false;
  const u = unit.trim().toLowerCase();
  return (
    u === 'm' ||
    u === 'lm' ||
    u === 'm1' ||
    u === 'm¹' ||
    u === "m'" ||
    u === 'meter' ||
    u === 'mtr' ||
    u === 'meter lari' ||
    u === 'ml'
  );
}

/** Format ekspresi segmen ke tampilan standar Indonesia (2.6+1.6 -> 2,6 + 1,6). */
export function formatDimensionDisplay(expr: string): string {
  if (!expr) return '';
  return expr
    .replace(/\./g, ',')
    .replace(/\+/g, ' + ')
    .replace(/x/g, ' x ');
}

/** Samakan "2 kali 3", "2×3", dan "2 x 3" menjadi "2x3". */
export function normalizeDimensionRaw(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/×/g, 'x')
    .replace(/\s+/g, '')
    .replace(/kali/g, 'x');
}

function parseDimensionNumbers(parts: string[]): number[] | null {
  const nums = parts.map((part) => parseFloat(part.replace(',', '.')));
  if (nums.some((n) => !Number.isFinite(n) || n < 0)) return null;
  return nums;
}

function roundDimension(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Input selesai jika berupa angka, perkalian (2x3 / 2 kali 3), atau jumlah dinding (2+2).
 * "2x" dan "2+" belum selesai, jadi tidak boleh menimpa quantity.
 */
export function isCompleteDimensionInput(raw: string): boolean {
  const clean = normalizeDimensionRaw(raw);
  if (!clean) return false;
  return COMPLETE_NUMBER.test(clean) || COMPLETE_SUM.test(clean) || COMPLETE_PRODUCT.test(clean);
}

/**
 * Angka langsung jadi quantity. "2x3", "2*3", dan "2 kali 3" dikalikan.
 * Untuk satuan linear (m, lm, meter), perkalian (2,6 x 1,6) diartikan sebagai segmen siku L
 * dengan total panjang = akumulasi sisi dinding (2,6 + 1,6 = 4,2 m).
 * "2+2" tetap jumlah segmen dinding siku.
 */
export function parseDimensionInput(raw: string, unit?: string): ParsedDimension {
  if (!raw || !raw.trim()) {
    return { total: 0, expr: '', segments: [], isL: false };
  }

  const clean = normalizeDimensionRaw(raw);

  if (COMPLETE_SUM.test(clean)) {
    const nums = parseDimensionNumbers(clean.split('+'));
    if (nums && nums.length >= 2) {
      const sum = roundDimension(nums.reduce((acc, cur) => acc + cur, 0));
      return {
        total: sum,
        expr: nums.join('+'),
        segments: nums,
        isL: true,
      };
    }
  }

  if (COMPLETE_PRODUCT.test(clean)) {
    const nums = parseDimensionNumbers(clean.split(/[x*]/));
    if (nums && nums.length >= 2) {
      // Jika satuan adalah satuan panjang / meter lari (m, lm, meter, m1, dll):
      // Format perkalian seperti "2,6 x 1,6" mengindikasikan segmen dinding sudut L,
      // sehingga total panjang dihitung dari penjumlahan segmen (2,6 + 1,6 = 4,2 m).
      if (isLinearUnit(unit)) {
        const sum = roundDimension(nums.reduce((acc, cur) => acc + cur, 0));
        return {
          total: sum,
          expr: nums.join('+'),
          segments: nums,
          isL: true,
        };
      }

      // Untuk satuan luas (m2), volume (m3), atau quantity (pcs):
      const product = roundDimension(nums.reduce((acc, cur) => acc * cur, 1));
      return {
        total: product,
        expr: nums.join('x'),
        segments: [],
        isL: false,
      };
    }
  }

  if (COMPLETE_NUMBER.test(clean)) {
    const num = parseFloat(clean.replace(',', '.'));
    if (Number.isFinite(num) && num >= 0) {
      return {
        total: num,
        expr: '',
        segments: [],
        isL: false,
      };
    }
  }

  return { total: 0, expr: '', segments: [], isL: false };
}

/**
 * Memeriksa apakah nama item mengindikasikan Kabinet Atas / Gantung
 */
export function isCabinetAtas(name: string): boolean {
  const lower = (name || '').toLowerCase();
  return (
    (lower.includes('atas') || lower.includes('wall') || lower.includes('gantung') || lower.includes('upper')) &&
    !lower.includes('bawah')
  );
}

/**
 * Memeriksa apakah nama item mengindikasikan Kabinet Bawah / Base
 */
export function isCabinetBawah(name: string): boolean {
  const lower = (name || '').toLowerCase();
  return (
    (lower.includes('bawah') || lower.includes('base') || lower.includes('bottom')) &&
    !lower.includes('atas')
  );
}

/**
 * Mencari indeks pasangan kabinet (Atas -> Bawah, atau Bawah -> Atas)
 */
export function findCabinetPairIndex(items: EstimationItemDraft[], currentIndex: number): number | null {
  const current = items[currentIndex];
  if (!current) return null;

  const currentName = current.name || '';
  const currentIsAtas = isCabinetAtas(currentName);
  const currentIsBawah = isCabinetBawah(currentName);

  if (!currentIsAtas && !currentIsBawah) return null;

  for (let i = 0; i < items.length; i++) {
    if (i === currentIndex) continue;
    const otherName = items[i].name || '';
    if (currentIsAtas && isCabinetBawah(otherName)) return i;
    if (currentIsBawah && isCabinetAtas(otherName)) return i;
  }

  return null;
}

/**
 * Menyinkronkan ukuran kabinet atas dan kabinet bawah:
 * Jika salah satu diisi, pasangannya otomatis terisi nilai yang sama
 * jika pasangannya masih kosong (qty === 0) atau sebelumnya nilainya identik (belum di-override manual).
 */
export function applyCabinetPairSync(
  items: EstimationItemDraft[],
  changedIndex: number,
  newQty: number,
  newExpr?: string
): { updatedItems: EstimationItemDraft[]; mirroredIndex: number | null } {
  const pairIdx = findCabinetPairIndex(items, changedIndex);
  if (pairIdx == null) {
    return { updatedItems: items, mirroredIndex: null };
  }

  const current = items[changedIndex];
  const pair = items[pairIdx];

  // Syarat auto-mirror:
  // Pasangan masih kosong (qty === 0) ATAU nilai pasangan sama persis dengan nilai lama current sebelum diedit
  const shouldMirror =
    pair.qty === 0 ||
    pair.qty === current.qty;

  if (!shouldMirror) {
    return { updatedItems: items, mirroredIndex: null };
  }

  const next = [...items];
  const nextPair = {
    ...pair,
    qty: newQty,
    dimension_expr: newExpr ?? (newQty > 0 ? pair.dimension_expr : ''),
  };

  next[pairIdx] = nextPair;
  return { updatedItems: next, mirroredIndex: pairIdx };
}

