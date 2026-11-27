import { CONFIG, PACKAGE_LABELS, createBuildingModel } from "../data/config";
import type { ActualRecord, AppSettings, CalibrationFactors, Catalog, Finishing } from "../data/types";
import { computeRab } from "./rab";

export interface BacktestRow {
  area: number;
  finishing: Finishing;
  floors: number;
  location: string;
  rabFinal: number;
  realisasi: number;
  perPaket: Record<string, number>;
}

export interface FactorDetail {
  group: "finishing" | "wilayah" | "produktivitas";
  key: string;
  n: number;
  rawRatio: number;
  shrink: number;
  proposed: number;
  reason: string;
}

export interface BacktestResult {
  rows: number;
  mape: number;
  medianError: number;
  p90Error: number;
  bias: number;
  underYPercent: number;
  underYTarget: number;
  packageErrors: { key: string; label: string; mape: number; n: number }[] | null;
  proposals: FactorDetail[];
}

const FINISHING_PAKET = ["lantai", "kusen", "cat", "sanitair"];
const TENAGA_PAKET = ["tanah_pondasi", "struktur", "dinding"];

export function parseBacktestCsv(csv: string): { rows: BacktestRow[]; errors: string[] } {
  const lines = csv.trim().split(/\r?\n/).filter(Boolean);
  if (!lines.length) return { rows: [], errors: ["CSV kosong."] };
  const sep = lines[0].includes(";") ? ";" : ",";
  const header = lines[0].split(sep).map((cell) => cell.trim().toLowerCase());
  const required = ["area", "finishing", "floors", "rab_final", "realisasi"];
  const missing = required.filter((key) => !header.includes(key));
  if (missing.length) return { rows: [], errors: [`Kolom wajib belum ada: ${missing.join(", ")}.`] };
  const paketCols = header.filter((h) => h.startsWith("aktual_"));
  const rows: BacktestRow[] = [];
  const errors: string[] = [];
  lines.slice(1).forEach((line, index) => {
    const cells = line.split(sep).map((cell) => cell.trim());
    const rec = Object.fromEntries(header.map((key, i) => [key, cells[i] ?? ""]));
    const nums = [Number(rec.area), Number(rec.floors), Number(rec.rab_final), Number(rec.realisasi)];
    if (nums.some((n) => !Number.isFinite(n) || n <= 0)) { errors.push(`Baris ${index + 2}: angka tidak valid.`); return; }
    if (!["standar", "menengah", "premium"].includes(rec.finishing)) { errors.push(`Baris ${index + 2}: finishing harus standar/menengah/premium.`); return; }
    const perPaket: Record<string, number> = {};
    for (const col of paketCols) {
      const v = Number(rec[col]);
      if (rec[col] !== "" && Number.isFinite(v) && v > 0) perPaket[col.replace("aktual_", "")] = v;
    }
    rows.push({ area: nums[0], floors: nums[1], rabFinal: nums[2], realisasi: nums[3], finishing: rec.finishing as Finishing, location: rec.location || "Yogyakarta", perPaket });
  });
  return { rows, errors };
}

/** Faktor dengan penyusutan: n < minSample → 1 (usulan nol); selain itu exp(k·mean ln rasio), k = n/(n+n0). */
export function shrunkFactor(logRatios: number[]): { factor: number; shrink: number; raw: number } {
  const n = logRatios.length;
  if (n === 0) return { factor: 1, shrink: 0, raw: 1 };
  const mean = logRatios.reduce((s, v) => s + v, 0) / n;
  if (n < CONFIG.calibration.minSample) return { factor: 1, shrink: 0, raw: Math.exp(mean) };
  const k = n / (n + CONFIG.calibration.shrinkN0);
  const max = CONFIG.calibration.maxAdjust;
  const factor = Math.min(1 + max, Math.max(1 - max, Math.exp(k * mean)));
  return { factor: Math.round(factor * 1000) / 1000, shrink: Math.round(k * 100) / 100, raw: Math.round(Math.exp(mean) * 1000) / 1000 };
}

function detail(group: FactorDetail["group"], key: string, logs: number[]): FactorDetail {
  const s = shrunkFactor(logs);
  const reason = logs.length < CONFIG.calibration.minSample
    ? `Sampel ${logs.length} < ${CONFIG.calibration.minSample}; usulan nol (faktor 1).`
    : `${logs.length} sampel, rasio mentah ${s.raw}, disusutkan k=${s.shrink}.`;
  return { group, key, n: logs.length, rawRatio: s.raw, shrink: s.shrink, proposed: s.factor, reason };
}

export function runBacktest(rows: BacktestRow[], ctx: { settings: AppSettings; catalog: Catalog }): BacktestResult {
  const abs: number[] = [];
  const signed: number[] = [];
  const pkgErr = new Map<string, number[]>();
  const finLogs = new Map<Finishing, number[]>();
  for (const row of rows) {
    // Blind-run: prediksi dihitung hanya dari parameter, tanpa melihat rabFinal/realisasi.
    const model = createBuildingModel({ area: row.area, floors: row.floors, finishing: row.finishing, location: row.location });
    const rab = computeRab({ model, settings: ctx.settings, catalog: ctx.catalog, iterations: 200 });
    const err = (rab.total - row.realisasi) / row.realisasi;
    abs.push(Math.abs(err));
    signed.push(err);
    const list = finLogs.get(row.finishing) ?? [];
    list.push(Math.log(row.realisasi / rab.total));
    finLogs.set(row.finishing, list);
    const mult = rab.subtotal ? rab.total / rab.subtotal : 1;
    for (const [key, actual] of Object.entries(row.perPaket)) {
      const pred = (rab.packages.find((p) => p.key === key)?.amount ?? 0) * mult;
      if (pred <= 0) continue;
      const arr = pkgErr.get(key) ?? [];
      arr.push(Math.abs(pred - actual) / actual);
      pkgErr.set(key, arr);
    }
  }
  const sorted = [...abs].sort((a, b) => a - b);
  const pct = (q: number) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))] : 0);
  const r1 = (v: number) => Math.round(v * 1000) / 10;
  return {
    rows: rows.length,
    mape: r1(abs.reduce((s, v) => s + v, 0) / Math.max(1, abs.length)),
    medianError: r1(pct(0.5)),
    p90Error: r1(pct(0.9)),
    bias: r1(signed.reduce((s, v) => s + v, 0) / Math.max(1, signed.length)),
    underYPercent: Math.round((abs.filter((e) => e < 0.2).length / Math.max(1, abs.length)) * 100),
    underYTarget: 20,
    packageErrors: pkgErr.size
      ? [...pkgErr.entries()].map(([key, arr]) => ({ key, label: PACKAGE_LABELS[key] ?? key, n: arr.length, mape: r1(arr.reduce((s, v) => s + v, 0) / arr.length) }))
      : null,
    proposals: (["standar", "menengah", "premium"] as Finishing[]).filter((f) => finLogs.has(f)).map((f) => detail("finishing", f, finLogs.get(f) ?? [])),
  };
}

/** Usulan kalibrasi dari data realisasi per paket. Tidak diterapkan sampai disetujui. */
export function proposeCalibration(actuals: ActualRecord[]): { factors: CalibrationFactors; details: FactorDetail[] } {
  const finLogs = new Map<string, number[]>();
  const locLogs = new Map<string, number[]>();
  const prodLogs: number[] = [];
  const sumOf = (rec: Record<string, number>, keys: string[]) => keys.reduce((s, k) => s + (rec[k] ?? 0), 0);
  for (const a of actuals) {
    const finA = sumOf(a.perPaket, FINISHING_PAKET);
    const finE = sumOf(a.estimateAtRecord.perPaket, FINISHING_PAKET);
    if (finA > 0 && finE > 0) {
      const arr = finLogs.get(a.context.finishing) ?? [];
      arr.push(Math.log(finA / finE));
      finLogs.set(a.context.finishing, arr);
    }
    const totA = Object.values(a.perPaket).reduce((s, v) => s + v, 0);
    const keys = Object.keys(a.perPaket);
    const totE = sumOf(a.estimateAtRecord.perPaket, keys);
    if (totA > 0 && totE > 0) {
      const arr = locLogs.get(a.context.location) ?? [];
      arr.push(Math.log(totA / totE));
      locLogs.set(a.context.location, arr);
    }
    const tA = sumOf(a.perPaket, TENAGA_PAKET);
    const tE = sumOf(a.estimateAtRecord.perPaket, TENAGA_PAKET);
    if (tA > 0 && tE > 0) prodLogs.push(Math.log(tA / tE));
  }
  const details: FactorDetail[] = [
    ...[...finLogs.entries()].map(([k, v]) => detail("finishing", k, v)),
    ...[...locLogs.entries()].map(([k, v]) => detail("wilayah", k, v)),
    detail("produktivitas", "tenaga", prodLogs),
  ];
  const factors: CalibrationFactors = { finishing: {}, wilayah: {}, produktivitas: 1 };
  for (const d of details) {
    if (d.group === "finishing") factors.finishing[d.key as Finishing] = d.proposed;
    if (d.group === "wilayah") factors.wilayah[d.key] = d.proposed;
    if (d.group === "produktivitas") factors.produktivitas = d.proposed;
  }
  return { factors, details };
}

export const BACKTEST_SAMPLE = `area,finishing,floors,location,rab_final,realisasi,aktual_struktur,aktual_lantai
45,menengah,1,Yogyakarta,245000000,238000000,,
70,standar,2,Bandung,330000000,345000000,,
100,menengah,1,Surabaya,520000000,498000000,,
54,standar,1,Yogyakarta,250000000,262000000,,
`;
