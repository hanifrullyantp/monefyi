import { CONFIG, PACKAGE_LABELS, PACKAGE_SCHEDULE, indexForJenis } from "../data/config";
import type {
  Analisis, AppSettings, AuditKomponen, BoqItem, BuildingModel, CalibrationFactors, Catalog, ConfidenceLabel,
  Komponen, KomponenJenis, PackageBreakdown, Project, RabResult, RekapRow, ScenarioVersion, WorkItem,
} from "../data/types";
import { SPEC_GROUPS, materialFactorsFor, facadeCostElements } from "../data/spec";
import type { FacadeSpec, SpecGroupKey, SpecState } from "../data/types";
import { formulaVariables } from "../geometry/derived";
import { computePricing, computeRap, type PricingPolicy, type RapConfig } from "./pricing";
import { evaluateFormula } from "./formula";
import { lineAmount, roundVolume } from "./money";
import { mulberry32 } from "./prng";
import { runChecks } from "./checks";

/* ============ Harga satuan dari analisis ============ */

export interface UnitPriceOptions {
  location: string;
  /** Faktor pengali hasil kalibrasi yang disetujui (default 1). */
  factor?: number;
  /** Faktor produktivitas tenaga (kalibrasi, default 1). */
  tenagaFactor?: number;
  materialFactor?: number;
  /** 1 + (overhead+profit)/100 bila mode dalam_harga. */
  uplift?: number;
  now?: Date;
}

export function isStale(tanggal: string, months: number, now: Date = new Date()): boolean {
  const t = new Date(tanggal).getTime();
  if (!Number.isFinite(t)) return true;
  return now.getTime() - t > months * 30.44 * 24 * 3600 * 1000;
}

export const isContoh = (sumber: string) => /contoh/i.test(sumber);

/**
 * Harga satuan = round( Σ(koefisien × (1+waste) × harga komponen × indeks wilayah[jenis]) × faktor × uplift ).
 * Pembulatan HANYA di akhir, ke rupiah integer.
 */
function allocateContributions(rows: AuditKomponen[], budget: number, weights: number[]): number[] {
  const result = rows.map(() => 0);
  const present = (['tenaga', 'alat', 'bahan'] as const).filter(kind => rows.some(r => r.jenis === kind));
  let remaining = budget;
  // Round wages and equipment independently; material absorbs the final rupiah residual.
  present.forEach((kind, groupIndex) => {
    const indices = rows.flatMap((r, i) => r.jenis === kind ? [i] : []);
    const sum = indices.reduce((s, i) => s + weights[i], 0);
    const part = groupIndex === present.length - 1 ? remaining : Math.min(remaining, Math.round(sum));
    let rest = part;
    indices.forEach((i, j) => {
      result[i] = j === indices.length - 1 ? rest : Math.min(rest, Math.round(weights[i]));
      rest -= result[i];
    });
    remaining -= part;
  });
  return result;
}

export function unitPriceFromAnalysis(analysis: Analisis, komponen: Map<string, Komponen>, opts: UnitPriceOptions) {
  const audit: AuditKomponen[] = [];
  const missing: string[] = [];
  for (const row of analysis.komponen) {
    const k = komponen.get(row.komponenId);
    if (!k) { missing.push(row.komponenId); continue; }
    const waste = row.waste ?? 0;
    const indeks = indexForJenis(opts.location, k.jenis) * (k.jenis === 'tenaga' ? opts.tenagaFactor ?? 1 : 1);
    const specFactor = k.jenis === 'bahan' ? opts.materialFactor ?? 1 : 1;
    const subtotal = row.koefisien * (1 + waste) * k.harga * indeks * specFactor * (opts.factor ?? 1);
    audit.push({ ...k, koefisien: row.koefisien, waste, indeks, specFactor, subtotal });
  }
  const raw = audit.reduce((sum, row) => sum + row.subtotal, 0);
  const netUnitPrice = Math.round(raw);
  const allocation = allocateContributions(audit, netUnitPrice, audit.map(r => r.subtotal));
  audit.forEach((row, i) => { row.subtotal = allocation[i]; });
  return { unitPrice: Math.round(netUnitPrice * (opts.uplift ?? 1)), netUnitPrice, raw, audit, missing };
}

/** Compatibility for a standalone invoice without indirect costs or contingency. */
export function computeTotals(subtotal: number, settings: PricingPolicy['settings']) {
  return computeRap({ directCost: subtotal, settings, ppnEnabled: true, rap: { indirectPercent: 0, contingencyPercent: 0 } });
}

/* ============ Input engine ============ */

export interface EngineInput {
  model: BuildingModel;
  settings: AppSettings;
  catalog: Catalog;
  calibration?: CalibrationFactors | null;
  calibrationId?: string;
  overrides?: Project["boqOverrides"];
  extraItems?: BoqItem[];
  actualProgress?: number[];
  now?: Date;
  iterations?: number;
  /** Tingkat spesifikasi per kelompok; menentukan faktor harga bahan. */
  spec?: SpecState;
  facade?: FacadeSpec;
  scope?: { carport: boolean; canopy: boolean; balcony: boolean; secondarySkin: boolean };
  ppnEnabled?: boolean;
  rapConfig?: Partial<RapConfig>;
  /** Aturan struktur minimum yang diimpor (override config bawaan). */
  minSpecLevelOverride?: number;
}

export function specGroupForItem(pkg: string, workId: string): SpecGroupKey | null {
  if (workId === 'sanitair.air' || workId.startsWith('air.')) return 'air';
  return SPEC_GROUPS.find(g => g.packages.includes(pkg))?.key ?? null;
}

export const isConfirmed = (model: BuildingModel, slot: string) => model.assumptions[slot]?.confirmed === true;

export function resolveAnalysisId(item: WorkItem, model: BuildingModel) {
  return item.analisisId.replace("{finishing}", model.finishing);
}

interface PreparedItem {
  boq: BoqItem;
  /** Jumlah pra-pembulatan per jenis (untuk Monte Carlo). */
  byJenis: Record<KomponenJenis, number>;
  cvVolume: number;
  cvKoef: number;
}

function prepare(input: EngineInput) {
  const { model, settings, catalog } = input;
  const now = input.now ?? new Date();
  const vars = formulaVariables(model);
  const komponen = new Map(catalog.komponen.map((k) => [k.kode, k]));
  const analisis = new Map(catalog.analisis.map((a) => [a.id, a]));
  const uplift = settings.overheadMode === "dalam_harga" ? 1 + (settings.overheadPercent + settings.profitPercent) / 100 : 1;
  const cal = input.calibration;
  const wilayahFactor = cal?.wilayah[model.location] ?? 1;
  const finishingFactor = cal?.finishing[model.finishing] ?? 1;
  const tenagaFactor = cal?.produktivitas ?? 1;
  const warnings: string[] = [];
  const prepared: PreparedItem[] = [];

  const facadeItems: WorkItem[] = [];
  if (input.facade) for (const element of facadeCostElements(input.facade)) {
    const scopeKey = ({ carport: 'carport', kanopi: 'canopy', balkon: 'balcony', skin: 'secondarySkin' } as const)[element.key.split('.')[1] as 'carport'];
    if (scopeKey && input.scope?.[scopeKey] === false) continue;
    const variable = element.key.replace('.', '_');
    vars[variable] = element.qty;
    facadeItems.push({ id: element.key, paket: 'tampak', uraian: element.label, satuan: element.satuan,
      rumus: variable, analisisId: `A.TMP.${element.key.split('.')[1].toUpperCase()}`, kelasSumber: 'terukur',
      slots: ['facade'], cvVolume: 0.12, relasi: 'umum', finishingSensitive: true });
  }

  for (const item of [...catalog.workItems, ...facadeItems]) {
    const override = input.overrides?.[`boq-${item.id}`];
    if (override?.removed) continue;
    try {
      if (item.syaratAktif && evaluateFormula(item.syaratAktif, vars) <= 0) continue;
    } catch (error) {
      warnings.push(`Syarat aktif ${item.id} tidak valid: ${(error as Error).message}`);
      continue;
    }
    let volume: number;
    let rumus = item.rumus;
    try {
      if (override?.formula && override.formula !== item.rumus) {
        rumus = override.formula;
        volume = roundVolume(evaluateFormula(override.formula, vars));
      } else {
        volume = roundVolume(evaluateFormula(item.rumus, vars));
      }
      if (override?.volume !== undefined) volume = roundVolume(override.volume);
    } catch (error) {
      warnings.push(`Rumus ${item.id} gagal: ${(error as Error).message}`);
      continue;
    }
    if (volume <= 0) continue;

    const analysisId = resolveAnalysisId(item, model);
    const analysis = analisis.get(analysisId);
    const factorTotal = (item.finishingSensitive ? finishingFactor : 1) * wilayahFactor;
    const faktor: BoqItem["faktor"] = [];
    if (factorTotal !== 1) faktor.push({ nama: "Kalibrasi disetujui", nilai: Math.round(factorTotal * 1000) / 1000, sumber: input.calibrationId ?? "kalibrasi" });
    if (tenagaFactor !== 1) faktor.push({ nama: "Produktivitas tenaga (kalibrasi)", nilai: tenagaFactor, sumber: input.calibrationId ?? "kalibrasi" });
    if (uplift !== 1) faktor.push({ nama: "Overhead+profit dalam harga", nilai: uplift, sumber: "pengaturan proyek" });

    const group = specGroupForItem(item.paket, item.id);
    const factorRow = group ? materialFactorsFor(settings, group) : null;
    const materialFactor = input.spec && group && factorRow ? factorRow.factors[input.spec[group]] : 1;
    if (materialFactor !== 1) faktor.push({ nama: `Faktor bahan: ${item.paket}`, nilai: materialFactor, sumber: factorRow!.source });
    const priced = analysis ? unitPriceFromAnalysis(analysis, komponen, { location: model.location, factor: factorTotal, tenagaFactor, materialFactor }) : null;
    if (!priced) warnings.push(`Tanpa AHSP: ${item.uraian} (${analysisId}).`);
    if (priced?.missing.length) warnings.push(`Komponen ${priced.missing.join(', ')} tidak tersedia untuk ${analysisId}.`);
    const audit = priced?.audit ?? [];
    const directUnitPrice = Math.round(override?.unitPrice ?? priced?.netUnitPrice ?? 0);
    const directAmount = lineAmount(volume, directUnitPrice);
    const unitPrice = Math.round(directUnitPrice * uplift);
    const overrideRatio = priced?.netUnitPrice ? directUnitPrice / priced.netUnitPrice : 1;
    const amounts = allocateContributions(audit, directAmount, audit.map(r => volume * r.subtotal * overrideRatio));
    const byJenis: Record<KomponenJenis, number> = { tenaga: 0, bahan: 0, alat: 0 };
    audit.forEach((r, i) => { r.directAmount = amounts[i]; byJenis[r.jenis] += amounts[i]; });
    if (!audit.length) byJenis.bahan = directAmount;
    if (override?.unitPrice !== undefined) faktor.push({ nama: 'Harga langsung kustom', nilai: directUnitPrice, sumber: 'pengguna' });

    const slotsOk = item.slots.every((slot) => isConfirmed(model, slot));
    const fresh = audit.length > 0 && audit.every((row) => !isStale(row.tanggalBerlaku, settings.priceStaleMonths, now));
    const verified = Boolean(analysis && analysis.keyakinan === "terverifikasi" && audit.every((row) => !isContoh(row.sumber)) && fresh && !priced?.missing.length && (materialFactor === 1 || factorRow?.calibrated));
    const keyakinan: ConfidenceLabel = !analysis
      ? "Tidak lengkap"
      : item.kelasSumber === "estimasi_struktur"
        ? (slotsOk ? "Perlu cek" : "Tidak lengkap")
        : !slotsOk ? "Tidak lengkap" : verified && !override ? "Akurat" : "Perlu cek";
    const priceDate = audit.map((row) => row.tanggalBerlaku).sort()[0] ?? "";

    const boq: BoqItem = {
      id: `boq-${item.id}`,
      workItemId: item.id,
      packageKey: item.paket,
      packageLabel: PACKAGE_LABELS[item.paket] ?? item.paket,
      uraian: override?.uraian ?? item.uraian,
      satuan: item.satuan,
      volume,
      unitPrice, directUnitPrice, directAmount,
      amount: lineAmount(volume, unitPrice),
      rumus,
      variables: pickVariables(rumus, vars),
      kelasSumber: item.kelasSumber,
      keyakinan,
      relasi: item.relasi,
      analisisId: analysis?.id,
      analisisSumber: analysis ? formatSumber(analysis) : undefined,
      analisisKeyakinan: analysis?.keyakinan,
      komponen: audit,
      faktor,
      priceDate,
      verified,
      isStructure: item.kelasSumber === "estimasi_struktur",
    };
    const analysisVerified = analysis?.keyakinan === "terverifikasi";
    prepared.push({
      boq,
      byJenis,
      cvVolume: slotsOk ? CONFIG.uncertainty.volumeTerkonfirmasi : item.cvVolume,
      cvKoef: analysisVerified ? CONFIG.uncertainty.koefisienTerverifikasi : CONFIG.uncertainty.koefisienBelum,
    });
  }

  for (const extra of input.extraItems ?? []) {
    const directUnitPrice = Math.round(extra.directUnitPrice ?? extra.unitPrice);
    const volume = roundVolume(extra.volume);
    const directAmount = lineAmount(volume, directUnitPrice);
    const unitPrice = Math.round(directUnitPrice * uplift);
    prepared.push({ boq: { ...extra, volume, unitPrice, directUnitPrice, directAmount, amount: lineAmount(volume, unitPrice), custom: true, keyakinan: 'Perlu cek' },
      byJenis: { tenaga: 0, bahan: directAmount, alat: 0 }, cvVolume: 0.05, cvKoef: 0.05 });
  }

  // Ketidakpastian harga pasar per jenis, dibobot biaya.
  const priceCv: Record<KomponenJenis, number> = { tenaga: 0, bahan: 0, alat: 0 };
  const weight: Record<KomponenJenis, number> = { tenaga: 0, bahan: 0, alat: 0 };
  let freshCost = 0, totalCost = 0;
  const usedStale = new Set<string>();
  for (const p of prepared) {
    for (const row of p.boq.komponen) {
      const cost = row.directAmount ?? 0;
      const stale = isStale(row.tanggalBerlaku, settings.priceStaleMonths, now);
      const verifiedPrice = !isContoh(row.sumber);
      const cv = (verifiedPrice ? CONFIG.uncertainty.hargaTerverifikasi : CONFIG.uncertainty.hargaBelum) + (stale ? CONFIG.uncertainty.hargaBasiTambahan : 0);
      priceCv[row.jenis] += cv * cost;
      weight[row.jenis] += cost;
      totalCost += cost;
      if (!stale && verifiedPrice) freshCost += cost;
      if (stale) usedStale.add(row.kode);
    }
  }
  (Object.keys(priceCv) as KomponenJenis[]).forEach((j) => (priceCv[j] = weight[j] > 0 ? priceCv[j] / weight[j] : CONFIG.uncertainty.hargaBelum));

  return { prepared, priceCv, warnings, priceConfidence: totalCost > 0 ? freshCost / totalCost : 0, staleCount: usedStale.size, vars };
}

function pickVariables(rumus: string, vars: Record<string, number>) {
  const out: Record<string, number> = {};
  for (const name of rumus.match(/[a-zA-Z_]\w*/g) ?? []) if (name in vars) out[name] = vars[name];
  return out;
}

function formatSumber(a: Analisis) {
  return [a.sumber.regulasi, a.sumber.tahun, a.sumber.halaman ? `hlm. ${a.sumber.halaman}` : null].filter(Boolean).join(" · ");
}

/* ============ Monte Carlo ============ */

function normal(rand: () => number) {
  const u = Math.max(1e-12, rand());
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Monte Carlo deterministik (seed tetap). Sumber ketidakpastian:
 * harga pasar per jenis (berkorelasi antar item), koefisien per item, volume per item
 * (mengecil bila slot pembentuk volume dikonfirmasi), dan luas global bila luas belum dikonfirmasi.
 */
export function monteCarloRange(prepared: PreparedItem[], priceCv: Record<KomponenJenis, number>, model: BuildingModel, policy: PricingPolicy, iterations: number, seed: number) {
  const rand = mulberry32(seed);
  const totals = new Float64Array(iterations);
  const areaCv = isConfirmed(model, "area") ? 0 : CONFIG.uncertainty.luasBelumKonfirmasi;
  const locCv = isConfirmed(model, "location") ? 0 : CONFIG.uncertainty.lokasiBelumKonfirmasi;
  const cv = (base: number) => Math.sqrt(base * base + locCv * locCv);
  const cT = cv(priceCv.tenaga), cB = cv(priceCv.bahan), cA = cv(priceCv.alat);
  for (let i = 0; i < iterations; i++) {
    const fT = Math.max(0.3, 1 + normal(rand) * cT);
    const fB = Math.max(0.3, 1 + normal(rand) * cB);
    const fA = Math.max(0.3, 1 + normal(rand) * cA);
    const fArea = Math.max(0.3, 1 + normal(rand) * areaCv);
    let sum = 0;
    for (const p of prepared) {
      const fV = Math.max(0.2, 1 + normal(rand) * p.cvVolume);
      const fK = Math.max(0.2, 1 + normal(rand) * p.cvKoef);
      const scope = p.boq.custom ? 1 : fArea;
      sum += (p.byJenis.tenaga * fT + p.byJenis.bahan * fB + p.byJenis.alat * fA) * fV * fK * scope;
    }
    totals[i] = computePricing({ ...policy, directCost: Math.round(sum) }).total;
  }
  totals.sort();
  return { p10: Math.round(totals[Math.floor(iterations * 0.1)]), p90: Math.round(totals[Math.floor(iterations * 0.9)]) };
}

/* ============ computeRab ============ */

export function completenessOf(model: BuildingModel) {
  const detail = CONFIG.completenessKeys.map((k) => ({ ...k, confirmed: isConfirmed(model, k.key) }));
  const score = Math.round((detail.filter((d) => d.confirmed).length / detail.length) * 100);
  return { score, detail };
}

export function computeRab(input: EngineInput): RabResult {
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
  const { model, settings } = input;
  const { prepared, priceCv, warnings, priceConfidence, staleCount, vars } = prepare(input);
  const items = prepared.map((p) => p.boq);
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const policy: PricingPolicy = { settings, ppnEnabled: input.ppnEnabled ?? true, rap: input.rapConfig ?? settings.rapConfig };
  const directCost = items.reduce((sum, item) => sum + (item.directAmount ?? 0), 0);
  const pricing = computePricing({ ...policy, directCost });
  const { total, overhead, profit, ppn } = pricing;
  const iterations = input.iterations ?? CONFIG.monteCarloIterations;
  const { p10, p90 } = monteCarloRange(prepared, priceCv, model, policy, iterations, CONFIG.monteCarloSeed);

  const packages: PackageBreakdown[] = Object.keys(PACKAGE_LABELS)
    .map((key) => {
      const amount = items.filter((item) => item.packageKey === key).reduce((sum, item) => sum + item.amount, 0);
      return { key, label: PACKAGE_LABELS[key], amount, percent: subtotal ? Math.round((amount / subtotal) * 1000) / 10 : 0 };
    })
    .filter((pkg) => pkg.amount > 0);

  const { materials, labor, equipment } = rekapFromBoq(prepared);
  const completeness = completenessOf(model);
  const perM2 = Math.round(total / Math.max(1, vars.luas_lantai));
  const scope = scopeCheck(model);
  if (scope.level !== "ok" && scope.reason) warnings.push(scope.reason);
  const base = CONFIG.baseM2[model.finishing];
  if (perM2 < base * CONFIG.reasonableness.min || perM2 > base * CONFIG.reasonableness.max) {
    warnings.push(`Biaya ${perM2.toLocaleString("id-ID")}/m² di luar rentang kewajaran contoh untuk finishing ${model.finishing}.`);
  }
  if (staleCount > 0) warnings.push(`${staleCount} harga komponen melewati batas ${settings.priceStaleMonths} bulan sejak tanggal berlaku.`);
  const missingList = prepared.filter((p) => !p.boq.custom && !p.boq.analisisId).map((p) => p.boq.uraian);
  for (const m of missingList) warnings.push(`"${m}" belum punya analisis — ditandai "tanpa AHSP", tidak dihitung diam-diam.`);
  const missingAnalysis = missingList.length > 0;
  const label = completeness.score === 100 && !missingAnalysis && scope.level === "ok" ? "RAB DETAIL" : "INDIKATIF";
  const nonStructure = items.filter((item) => !item.isStructure);
  const confidence: ConfidenceLabel = label === "RAB DETAIL" && nonStructure.every((item) => item.keyakinan === "Akurat")
    ? "Akurat"
    : completeness.score >= 50 ? "Perlu cek" : "Tidak lengkap";
  const verifiedPercent = items.length ? Math.round((items.filter((item) => item.verified).length / items.length) * 100) : 0;

  const t1 = typeof performance !== "undefined" ? performance.now() : Date.now();
  const result: RabResult = {
    label,
    subtotal,
    total, overhead, profit, ppn,
    p10,
    p90,
    perM2,
    completeness: completeness.score,
    completenessDetail: completeness.detail,
    confidence,
    packages,
    items,
    materials,
    labor,
    equipment,
    sCurve: buildSCurve(packages, model.area, input.actualProgress),
    terms: buildTerms(packages, total),
    verifiedPercent,
    priceConfidence: Math.round(priceConfidence * 100) / 100,
    stalePrices: staleCount,
    rap: pricing,
    missingAnalysis: missingList,
    overheadMode: settings.overheadMode,
    warnings,
    checks: [],
    calibrationId: input.calibrationId,
    computeMs: Math.round((t1 - t0) * 10) / 10,
  };
  result.checks = runChecks(model, result, settings);
  return result;
}

/** Lebar rentang P10–P90 bila slot tertentu dianggap dikonfirmasi (dipakai bobot pertanyaan). */
export function rangeWidthIf(input: EngineInput, slots: string[], iterations = 600): number {
  const model: BuildingModel = { ...input.model, assumptions: { ...input.model.assumptions } };
  for (const slot of slots) model.assumptions[slot] = { source: "pengguna", confirmed: true, confidence: 0.9 };
  const { prepared, priceCv } = prepare({ ...input, model });
  const policy = { settings: input.settings, ppnEnabled: input.ppnEnabled ?? true, rap: input.rapConfig ?? input.settings.rapConfig };
  const r = monteCarloRange(prepared, priceCv, model, policy, iterations, CONFIG.monteCarloSeed);
  return r.p90 - r.p10;
}

/** Rekap komponen = Σ(volume × koefisien × (1+waste)) dari BOQ. Biaya = qty × harga × indeks × faktor. */
function rekapFromBoq(prepared: PreparedItem[]) {
  const map = new Map<string, RekapRow & { costRaw: number }>();
  for (const p of prepared) {
    for (const row of p.boq.komponen) {
      const qty = p.boq.volume * row.koefisien * (1 + row.waste);
      const cost = row.directAmount ?? 0;
      const prev = map.get(row.kode) ?? { kode: row.kode, uraian: row.uraian, jenis: row.jenis, satuan: row.satuan, qty: 0, cost: 0, costRaw: 0 };
      prev.qty += qty;
      prev.costRaw += cost;
      map.set(row.kode, prev);
    }
  }
  const rows = [...map.values()].map(({ costRaw, ...row }) => ({ ...row, qty: Math.round(row.qty * 100) / 100, cost: Math.round(costRaw) })).sort((a, b) => b.cost - a.cost);
  return { materials: rows.filter((r) => r.jenis === "bahan"), labor: rows.filter((r) => r.jenis === "tenaga"), equipment: rows.filter((r) => r.jenis === "alat") };
}

/** Kurva S rencana dari bobot paket & jadwal relatif. "actual" hanya dari data realisasi pengguna. */
export function buildSCurve(packages: PackageBreakdown[], area: number, actual?: number[]) {
  const weeks = Math.max(8, Math.round(6 + area / 12));
  const total = packages.reduce((s, p) => s + p.amount, 0) || 1;
  const rows: { week: number; planned: number; actual?: number }[] = [];
  for (let w = 1; w <= weeks; w++) {
    const t = w / weeks;
    let done = 0;
    for (const pkg of packages) {
      const s = PACKAGE_SCHEDULE[pkg.key] ?? { start: 0, end: 1 };
      const frac = Math.min(1, Math.max(0, (t - s.start) / Math.max(0.01, s.end - s.start)));
      done += pkg.amount * frac;
    }
    const row: { week: number; planned: number; actual?: number } = { week: w, planned: Math.round((done / total) * 1000) / 10 };
    if (actual && actual[w - 1] !== undefined && Number.isFinite(actual[w - 1])) row.actual = actual[w - 1];
    rows.push(row);
  }
  return rows;
}

/** Termin diturunkan dari bobot paket (bukan persen tetap) + retensi 5%. */
export function buildTerms(packages: PackageBreakdown[], total: number) {
  const sum = (keys: string[]) => packages.filter((p) => keys.includes(p.key)).reduce((s, p) => s + p.percent, 0);
  const groups = [
    { label: "Termin 1", keys: ["persiapan", "tanah_pondasi"], note: "Persiapan & pondasi selesai" },
    { label: "Termin 2", keys: ["struktur"], note: "Struktur beton selesai" },
    { label: "Termin 3", keys: ["dinding", "atap", "kusen"], note: "Dinding, atap & kusen terpasang" },
    { label: "Termin 4", keys: ["plafon", "lantai", "cat", "sanitair", "listrik_air"], note: "Finishing & MEP selesai" },
  ];
  const retensi = 5;
  const raw = groups.map((g) => ({ ...g, percent: sum(g.keys) }));
  const scale = (100 - retensi) / Math.max(1, raw.reduce((s, g) => s + g.percent, 0));
  const terms = raw.map((g) => ({ label: g.label, note: g.note, percent: Math.round(g.percent * scale * 10) / 10 }));
  const all = [...terms, { label: "Retensi", note: "Masa pemeliharaan", percent: retensi }];
  const amounts = all.map((t) => Math.round((total * t.percent) / 100));
  amounts[amounts.length - 2] += total - amounts.reduce((s, a) => s + a, 0);
  return all.map((t, i) => ({ ...t, amount: amounts[i] }));
}

export function scopeCheck(model: BuildingModel): { level: "ok" | "warning" | "out_of_scope"; reason?: string } {
  if (model.floors >= 4 || model.area > CONFIG.maxArea) return { level: "out_of_scope", reason: `Luas ${model.area} m² / ${model.floors} lantai di luar batas modul (${CONFIG.maxArea} m², maks 3 lantai dengan review).` };
  if (model.floors === 3) return { level: "warning", reason: "Rumah 3 lantai wajib review estimator manusia." };
  if (model.soil === "buruk") return { level: "warning", reason: "Tanah buruk — pondasi perlu dicek estimator." };
  return { level: "ok" };
}

export function compareScenario(a: ScenarioVersion, b: ScenarioVersion) {
  const start = typeof performance !== "undefined" ? performance.now() : Date.now();
  const diff = b.total - a.total;
  const changes: string[] = [];
  for (const field of ["area", "floors", "bedrooms", "bathrooms", "finishing"] as (keyof BuildingModel)[]) {
    if (String(a.modelSnapshot[field]) !== String(b.modelSnapshot[field])) changes.push(`${field}: ${String(a.modelSnapshot[field])} → ${String(b.modelSnapshot[field])}`);
  }
  if (a.modelSnapshot.roof.type !== b.modelSnapshot.roof.type) changes.push(`atap: ${a.modelSnapshot.roof.type} → ${b.modelSnapshot.roof.type}`);
  return {
    diff,
    percent: a.total ? Math.round((diff / a.total) * 1000) / 10 : 0,
    perM2A: Math.round(a.total / Math.max(1, a.modelSnapshot.area)),
    perM2B: Math.round(b.total / Math.max(1, b.modelSnapshot.area)),
    changes,
    elapsedMs: Math.round(((typeof performance !== "undefined" ? performance.now() : Date.now()) - start) * 100) / 100,
  };
}
