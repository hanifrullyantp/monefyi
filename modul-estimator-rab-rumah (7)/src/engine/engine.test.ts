import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, createBuildingModel } from "../data/config";
import { SEED_CATALOG, cloneCatalog } from "../data/catalog";
import type { Analisis, AppSettings, BuildingModel, Komponen } from "../data/types";
import { buildAutoRooms } from "../geometry/layout";
import { deriveGeometry, formulaVariables } from "../geometry/derived";
import { computeRab, computeTotals, monteCarloRange, rangeWidthIf, unitPriceFromAnalysis, compareScenario } from "./rab";
import { evaluateFormula, FormulaError } from "./formula";
import { lineAmount, roundVolume, terbilangRupiah } from "./money";
import { proposeCalibration, runBacktest, parseBacktestCsv, shrunkFactor, BACKTEST_SAMPLE } from "./calibration";
import { runChecks } from "./checks";

const settings: AppSettings = { ...DEFAULT_SETTINGS };
const confirmAll = (m: BuildingModel): BuildingModel => {
  const keys = ["area", "floors", "bedrooms", "bathrooms", "roof", "finishing", "location", "landArea", "foundation", "openings", "electrical", "water"];
  return { ...m, assumptions: Object.fromEntries(keys.map((k) => [k, { source: "pengguna" as const, confirmed: true, confidence: 0.9 }])) };
};
const model = (area: number, floors = 1, extra: Partial<BuildingModel> = {}) => {
  const m = createBuildingModel({ area, floors, ...extra });
  return { ...m, rooms: buildAutoRooms(m) };
};

describe("Golden test harga satuan", () => {
  const komponen = new Map<string, Komponen>([
    ["PKJ", { kode: "PKJ", uraian: "Pekerja", jenis: "tenaga", satuan: "OH", harga: 100_000, wilayah: "Yogyakarta", tanggalBerlaku: "2025-01-01", sumber: "test" }],
    ["MDR", { kode: "MDR", uraian: "Mandor", jenis: "tenaga", satuan: "OH", harga: 150_000, wilayah: "Yogyakarta", tanggalBerlaku: "2025-01-01", sumber: "test" }],
  ]);
  const analysis: Analisis = { id: "G", pekerjaanId: "G", uraian: "golden", satuan: "m²", komponen: [{ komponenId: "PKJ", koefisien: 0.1 }, { komponenId: "MDR", koefisien: 0.05 }], sumber: { regulasi: "test", tahun: null, halaman: null }, keyakinan: "belum" };

  it("Golden 1 — mode rekap tanpa overhead: 17.500 / 1.750.000 / PPN 175.000 / 1.925.000", () => {
    const { unitPrice } = unitPriceFromAnalysis(analysis, komponen, { location: "Yogyakarta" });
    expect(unitPrice).toBe(17_500);
    const amount = lineAmount(100, unitPrice);
    expect(amount).toBe(1_750_000);
    const t = computeTotals(amount, { overheadMode: "rekap", overheadPercent: 0, profitPercent: 0, ppnPercent: 10 });
    expect(t.ppn).toBe(175_000);
    expect(t.total).toBe(1_925_000);
  });

  it("Golden 2 — dalam_harga overhead 10%: 19.250 / 1.925.000 / 192.500 / 2.117.500", () => {
    const s = { overheadMode: "dalam_harga" as const, overheadPercent: 10, profitPercent: 0, ppnPercent: 10 };
    const { unitPrice } = unitPriceFromAnalysis(analysis, komponen, { location: "Yogyakarta", uplift: 1 + (s.overheadPercent + s.profitPercent) / 100 });
    expect(unitPrice).toBe(19_250);
    const amount = lineAmount(100, unitPrice);
    expect(amount).toBe(1_925_000);
    const t = computeTotals(amount, s);
    expect(t.ppn).toBe(192_500);
    expect(t.total).toBe(2_117_500);
  });

  it("indeks wilayah dipakai per jenis", () => {
    const { unitPrice } = unitPriceFromAnalysis(analysis, komponen, { location: "Jakarta" });
    expect(unitPrice).toBe(Math.round(17_500 * 1.25));
  });
});

describe("Pembulatan & uang", () => {
  it("volume 2 desimal, jumlah integer", () => {
    expect(roundVolume(1.005)).toBe(1.01);
    expect(lineAmount(2.345, 1000.4)).toBe(Math.round(2.35 * 1000));
    expect(terbilangRupiah(1_925_000)).toBe("Satu juta sembilan ratus dua puluh lima ribu rupiah");
  });
  it("total RAB = Σ jumlah baris (integer)", () => {
    const r = computeRab({ model: model(45), settings, catalog: SEED_CATALOG });
    expect(r.subtotal).toBe(r.items.reduce((s, i) => s + i.amount, 0));
    expect(Number.isInteger(r.total)).toBe(true);
    // The buyer pays real indirect costs and contingency as well as the BOQ.
    expect(r.total).toBe(r.subtotal + r.rap.indirect + r.rap.contingency + r.overhead + r.profit + r.ppn);
  });
});

describe("Parser rumus", () => {
  it("menghitung operator, kurung, fungsi, variabel", () => {
    expect(evaluateFormula("2 + 3 * 4")).toBe(14);
    expect(evaluateFormula("(2 + 3) * 4")).toBe(20);
    expect(evaluateFormula("max(a, b) - min(1, 2) + ceil(1.2) + floor(1.8) + round(2.5)", { a: 3, b: 5 })).toBe(5 - 1 + 2 + 1 + 3);
    expect(evaluateFormula("-x + 1", { x: 2 })).toBe(-1);
  });
  it.each([
    "constructor.constructor('alert(1)')()",
    "process.exit()",
    "a; b",
    "eval(1)",
    "Function('x')",
    "1 +",
    "((1)",
    "1 / 0",
    "__proto__",
    "x[0]",
    "`1`",
    "1 ** 2",
  ])("menolak input berbahaya/rusak: %s", (input) => {
    expect(() => evaluateFormula(input, { a: 1, b: 2, x: 1 })).toThrow(FormulaError);
  });
  it("rumus mapping seed semua valid", () => {
    const vars = formulaVariables(model(70, 2));
    for (const w of SEED_CATALOG.workItems) expect(() => evaluateFormula(w.rumus, vars)).not.toThrow();
  });
});

describe("Engine: harga dari analisis, rekap = BOQ, jejak audit", () => {
  it("harga satuan tiap baris = round(Σ subtotal komponen)", () => {
    const r = computeRab({ model: model(45), settings, catalog: SEED_CATALOG });
    for (const item of r.items) {
      expect(item.analisisId).toBeTruthy();
      expect(item.unitPrice).toBe(Math.round(item.komponen.reduce((s, k) => s + k.subtotal, 0)));
    }
  });
  it("rumus yang ditampilkan = rumus yang dihitung", () => {
    const m = model(54);
    const vars = formulaVariables(m);
    const r = computeRab({ model: m, settings, catalog: SEED_CATALOG });
    for (const item of r.items) expect(item.volume).toBe(roundVolume(evaluateFormula(item.rumus, vars)));
  });
  it("rekap material+upah+alat cocok dengan subtotal BOQ (toleransi pembulatan harga satuan)", () => {
    for (const m of [model(45), model(70, 2), model(150, 2, { finishing: "premium" })]) {
      const r = computeRab({ model: m, settings, catalog: SEED_CATALOG });
      const rekap = [...r.materials, ...r.labor, ...r.equipment].reduce((s, row) => s + row.cost, 0);
      const tolerance = r.items.reduce((s, i) => s + 0.5 * i.volume + 1, 0);
      expect(Math.abs(rekap - r.subtotal)).toBeLessThanOrEqual(tolerance);
    }
  });
  it("ubah harga komponen → RAB, material, dan upah berubah", () => {
    const m = model(45);
    const base = computeRab({ model: m, settings, catalog: SEED_CATALOG });
    const cat = cloneCatalog();
    cat.komponen.find((k) => k.kode === "T.PKJ")!.harga *= 1.5;
    const after = computeRab({ model: m, settings, catalog: cat });
    expect(after.total).toBeGreaterThan(base.total);
    expect(after.labor.find((l) => l.kode === "T.PKJ")!.cost).toBeGreaterThan(base.labor.find((l) => l.kode === "T.PKJ")!.cost);
  });
  it("ubah koefisien analisis → harga satuan berubah", () => {
    const m = model(45);
    const cat = cloneCatalog();
    cat.analisis.find((a) => a.id === "A.DND.PSG")!.komponen[0].koefisien = 0.6;
    const a = computeRab({ model: m, settings, catalog: SEED_CATALOG }).items.find((i) => i.workItemId === "dinding.pasangan")!;
    const b = computeRab({ model: m, settings, catalog: cat }).items.find((i) => i.workItemId === "dinding.pasangan")!;
    expect(b.unitPrice).toBeGreaterThan(a.unitPrice);
  });
  it("listrik & sanitair bukan estimasi_struktur; sanitair = jumlah kamar mandi; pintu = jumlah pintu model", () => {
    const m = model(70, 1, { bathrooms: 2, doors: 6, electricalPoints: 11 });
    const r = computeRab({ model: m, settings, catalog: SEED_CATALOG });
    const get = (id: string) => r.items.find((i) => i.workItemId === id)!;
    expect(get("sanitair.set").volume).toBe(2);
    expect(get("sanitair.set").kelasSumber).not.toBe("estimasi_struktur");
    expect(get("listrik.titik").kelasSumber).not.toBe("estimasi_struktur");
    expect(get("listrik.titik").volume).toBe(11);
    expect(get("kusen.pintu").volume).toBe(6);
  });
  it("geometri konsisten dengan volume RAB (dinding bersih)", () => {
    const m = model(70, 2);
    const g = deriveGeometry(m);
    const r = computeRab({ model: m, settings, catalog: SEED_CATALOG });
    expect(r.items.find((i) => i.workItemId === "dinding.pasangan")!.volume).toBe(roundVolume(g.netWallArea));
    expect(g.outerWallLength).toBeCloseTo(2 * (g.footprintWidth + g.footprintDepth) * 2, 1);
  });
});

describe("Satu engine: cepat vs detail", () => {
  it.each([100, 150, 200])("selisih total 0%% untuk model sama (%i m²), hanya rentang berbeda", (area) => {
    const quick = model(area, 2);
    const detail = confirmAll(quick);
    const a = computeRab({ model: quick, settings, catalog: SEED_CATALOG });
    const b = computeRab({ model: detail, settings, catalog: SEED_CATALOG });
    expect(b.total).toBe(a.total);
    expect(b.p90 - b.p10).toBeLessThan(a.p90 - a.p10);
    expect(b.label).toBe("RAB DETAIL");
    expect(a.label).toBe("INDIKATIF");
  });
});

describe("Monte Carlo", () => {
  it("deterministik (seed tetap) & P10 ≤ total ≤ P90", () => {
    const m = model(70);
    const a = computeRab({ model: m, settings, catalog: SEED_CATALOG });
    const b = computeRab({ model: m, settings, catalog: SEED_CATALOG });
    expect([a.p10, a.p90]).toEqual([b.p10, b.p90]);
    expect(a.p10).toBeLessThanOrEqual(a.total);
    expect(a.p90).toBeGreaterThanOrEqual(a.total);
  });
  it("rentang mengecil saat slot dikonfirmasi", () => {
    const input = { model: model(70), settings, catalog: SEED_CATALOG };
    expect(rangeWidthIf(input, ["area"])).toBeLessThan(rangeWidthIf(input, []));
    expect(typeof monteCarloRange).toBe("function");
  });
});

describe("Kelengkapan & keyakinan dari data", () => {
  it("kelengkapan dihitung dari variabel terkonfirmasi", () => {
    expect(computeRab({ model: model(45), settings, catalog: SEED_CATALOG }).completeness).toBe(0);
    expect(computeRab({ model: confirmAll(model(45)), settings, catalog: SEED_CATALOG }).completeness).toBe(100);
  });
  it("seed contoh: verifiedPercent 0; dengan data terverifikasi & harga segar label Akurat bisa muncul", () => {
    const m = confirmAll(model(45));
    expect(computeRab({ model: m, settings, catalog: SEED_CATALOG }).verifiedPercent).toBe(0);
    const cat = cloneCatalog();
    const today = new Date().toISOString().slice(0, 10);
    cat.komponen.forEach((k) => { k.sumber = "Survei toko 2026"; k.tanggalBerlaku = today; });
    cat.analisis.forEach((a) => { a.keyakinan = "terverifikasi"; });
    const r = computeRab({ model: m, settings, catalog: cat });
    expect(r.verifiedPercent).toBe(100);
    expect(r.items.filter((i) => !i.isStructure).every((i) => i.keyakinan === "Akurat")).toBe(true);
    expect(r.items.filter((i) => i.isStructure).every((i) => i.keyakinan !== "Akurat")).toBe(true);
    expect(r.confidence).toBe("Akurat");
  });
  it("harga basi dari tanggalBerlaku", () => {
    const r = computeRab({ model: model(45), settings, catalog: SEED_CATALOG, now: new Date("2027-01-01") });
    expect(r.stalePrices).toBeGreaterThan(0);
    expect(runChecks(model(45), r, settings).some((c) => c.id === "harga-basi")).toBe(true);
  });
});

describe("Kurva S & termin tanpa data karangan", () => {
  it("tanpa realisasi tidak ada kolom aktual", () => {
    const r = computeRab({ model: model(45), settings, catalog: SEED_CATALOG });
    expect(r.sCurve.every((row) => row.actual === undefined)).toBe(true);
    expect(r.sCurve.at(-1)!.planned).toBe(100);
    expect(r.terms.reduce((s, t) => s + t.amount, 0)).toBe(r.total);
  });
  it("aktual hanya dari input pengguna", () => {
    const r = computeRab({ model: model(45), settings, catalog: SEED_CATALOG, actualProgress: [4, 12] });
    expect(r.sCurve[0].actual).toBe(4);
    expect(r.sCurve[2].actual).toBeUndefined();
  });
});

describe("Kalibrasi & back-test", () => {
  it("sampel kecil → usulan nol (faktor 1)", () => {
    expect(shrunkFactor([Math.log(1.3), Math.log(1.2)]).factor).toBe(1);
    const actual = { id: "a", projectId: "p", tanggal: "2026-01-01", perPaket: { lantai: 30_000_000, struktur: 50_000_000 }, estimateAtRecord: { total: 0, perPaket: { lantai: 20_000_000, struktur: 40_000_000 } }, context: { finishing: "menengah" as const, location: "Bandung", area: 45, floors: 1 } };
    const p = proposeCalibration([actual]);
    expect(p.factors.finishing.menengah).toBe(1);
    expect(p.factors.produktivitas).toBe(1);
  });
  it("sampel cukup → faktor disusutkan ke arah 1", () => {
    const logs = Array(5).fill(Math.log(1.2));
    const f = shrunkFactor(logs).factor;
    expect(f).toBeGreaterThan(1);
    expect(f).toBeLessThan(1.2);
  });
  it("back-test tanpa kolom per paket → packageErrors null", () => {
    const { rows } = parseBacktestCsv(BACKTEST_SAMPLE);
    const r = runBacktest(rows, { settings, catalog: SEED_CATALOG });
    expect(r.packageErrors).toBeNull();
    expect(r.rows).toBe(4);
  });
  it("back-test dengan kolom per paket → error per paket dari data", () => {
    const csv = "area,finishing,floors,rab_final,realisasi,aktual_struktur\n45,menengah,1,1,250000000,60000000\n";
    const r = runBacktest(parseBacktestCsv(csv).rows, { settings, catalog: SEED_CATALOG });
    expect(r.packageErrors?.[0].key).toBe("struktur");
  });
});

describe("Kinerja", () => {
  it("300 item dihitung ulang < 200 ms (tanpa Monte Carlo) dan compareScenario cepat", () => {
    const cat = cloneCatalog();
    const base = cat.workItems;
    while (cat.workItems.length < 300) cat.workItems.push(...base.map((w) => ({ ...w, id: `${w.id}.${cat.workItems.length}` })));
    cat.workItems = cat.workItems.slice(0, 300);
    const t0 = performance.now();
    const r = computeRab({ model: model(150, 2), settings, catalog: cat, iterations: 10 });
    expect(r.items.length).toBeGreaterThan(250);
    expect(performance.now() - t0).toBeLessThan(200);
    const snap = { id: "v", projectId: "p", label: "a", createdAt: "", total: 1, p10: 1, p90: 1, completeness: 0, pricesLocked: false, modelSnapshot: model(45) };
    expect(compareScenario(snap, { ...snap, total: 2 }).elapsedMs).toBeLessThan(200);
  });
});
