// monefyi_planner/src/lib/estimatorDimension.ts
// Utilitas cerdas untuk parsing dimensi ukuran (Total m vs Segmen Sudut L: 2+2, 2.4+1.8, 2x2)
// dan sinkronisasi otomatis Kabinet Atas & Kabinet Bawah untuk pembacaan presisi di 3D Intero

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

/**
 * Mem-parsing string input ukuran (bisa angka biasa "4", atau format segmen "2+2", "2.4+1.8", "2x2", "2,5+1,5")
 */
export function parseDimensionInput(raw: string): ParsedDimension {
  if (!raw || !raw.trim()) {
    return { total: 0, expr: '', segments: [], isL: false };
  }

  const clean = raw.trim().replace(/\s+/g, '');

  // 1. Cek format penjumlahan segmen (misal "2+2", "2.4+1.8", "2,5+1,5")
  if (clean.includes('+')) {
    const parts = clean.split('+').filter(Boolean);
    const nums = parts.map((p) => {
      const normalized = p.replace(',', '.');
      const val = parseFloat(normalized);
      return Number.isFinite(val) ? val : 0;
    });

    if (nums.length >= 2) {
      const sum = Math.round(nums.reduce((acc, cur) => acc + cur, 0) * 100) / 100;
      return {
        total: sum,
        expr: nums.join('+'),
        segments: nums,
        isL: true,
      };
    }
  }

  // 2. Cek format perkalian segmen (misal "2x2", "2*2")
  if (/^(\d+(?:[.,]\d+)?)[x*](\d+(?:[.,]\d+)?)$/i.test(clean)) {
    const match = clean.match(/^(\d+(?:[.,]\d+)?)[x*](\d+(?:[.,]\d+)?)$/i);
    if (match) {
      const a = parseFloat(match[1].replace(',', '.'));
      const b = parseFloat(match[2].replace(',', '.'));
      if (Number.isFinite(a) && Number.isFinite(b)) {
        // Untuk ukuran L, format 2x2 biasanya diartikan dinding 2m + 2m
        const sum = Math.round((a + b) * 100) / 100;
        return {
          total: sum,
          expr: `${a}+${b}`,
          segments: [a, b],
          isL: true,
        };
      }
    }
  }

  // 3. Format angka tunggal (Total manual langsung)
  const norm = clean.replace(',', '.');
  const num = parseFloat(norm);
  if (Number.isFinite(num) && num >= 0) {
    return {
      total: num,
      expr: '', // Ukuran L terhapus jika diisi total langsung
      segments: [],
      isL: false,
    };
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

