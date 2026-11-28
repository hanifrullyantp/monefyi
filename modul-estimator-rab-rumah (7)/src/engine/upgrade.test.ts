import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, createBuildingModel } from "../data/config";
import { SEED_CATALOG } from "../data/catalog";
import { SPEC_GROUPS, SPEC_ORDER, defaultFacade, defaultSpec, minimumStructureLevel, resolveSpec, specOptionBlocked } from "../data/spec";
import { computeRap, grandTotal, solveTargets } from "./pricing";
import { efficiencyRows, optimizeSpec, applyEfficiency, type OptimizerGoal, type OptimizerScope } from "./optimizer";
import { computeRab } from "./rab";
import { buildAutoRooms } from "../geometry/layout";
import { facadeFromText, facadeSpecSchema, parseChatAction, composeReply } from "../ai/facade";
import { assertNoMoneyFromAi } from "../ai/guard";
import { migratePayload, migrateLegacyRoom, validateProject } from "../data/schema";
import type { Project, SpecGroupKey, SpecState } from "../data/types";

const settings = { ...DEFAULT_SETTINGS };
const project = (over: Partial<Project> = {}): Project => {
  const model = createBuildingModel({ area: 70, floors: 1, bedrooms: 3, bathrooms: 2 });
  const rooms = buildAutoRooms(model);
  return {
    id: "p1", name: "Uji", createdAt: "", updatedAt: "", status: "indikatif", archived: false,
    location: model.location, model: { ...model, rooms }, lastSavedAt: "", stage: 1, answers: [],
    spec: defaultSpec({ floors: 1, soil: "sedang" }), facade: defaultFacade("minimalis", 1),
    scope: { carport: true, canopy: true, balcony: false, secondarySkin: false }, ppnEnabled: true,
    ...over,
  };
};
const engineInput = (p: Project, spec?: SpecState) => ({
  model: p.model, settings, catalog: SEED_CATALOG, spec: spec ?? p.spec, facade: p.facade, scope: p.scope,
  ppnEnabled: p.ppnEnabled ?? true, iterations: 10,
});

describe("RAP / Total / Margin / PPN", () => {
  it("definisi konsisten pada PPN aktif & nonaktif", () => {
    const direct = 100_000_000;
    const on = computeRap({ directCost: direct, settings, ppnEnabled: true });
    const off = computeRap({ directCost: direct, settings, ppnEnabled: false });
    expect(on.rap).toBe(on.direct + on.indirect + on.contingency);
    expect(on.sellingPrice).toBe(on.rap + Math.round((direct * settings.overheadPercent) / 100) + Math.round((direct * settings.profitPercent) / 100));
    expect(on.margin).toBe(on.sellingPrice - on.rap);
    expect(on.ppn).toBe(Math.round((on.sellingPrice * settings.ppnPercent) / 100));
    expect(off.ppn).toBe(0);
    expect(off.margin).toBe(on.margin); // margin tidak terpengaruh PPN
    expect(grandTotal(on)).toBe(on.sellingPrice + on.ppn);
  });
  it("mode dalam_harga: RAP dihitung dari biaya tanpa uplift", () => {
    const inPrice = computeRap({ directCost: 115_000_000, settings: { ...settings, overheadMode: "dalam_harga" }, ppnEnabled: true });
    const rekap = computeRap({ directCost: 100_000_000, settings: { ...settings, overheadMode: "rekap" }, ppnEnabled: true });
    expect(inPrice.direct).toBeCloseTo(rekap.direct, -4);
    expect(inPrice.rap).toBe(rekap.rap);
  });
  it("solveTargets melengkapi variabel ketiga", () => {
    expect(solveTargets({ sellingPrice: 500, margin: 100, rap: null })).toEqual({ sellingPrice: 500, margin: 100, rap: 400 });
    expect(solveTargets({ sellingPrice: null, margin: 100, rap: 400 })).toEqual({ sellingPrice: 500, margin: 100, rap: 400 });
    expect(solveTargets({ sellingPrice: 500, margin: null, rap: 400 })?.margin).toBe(100);
    expect(solveTargets({ sellingPrice: null, margin: null, rap: null })).toBeNull();
  });
  it("saklar PPN di engine mengubah total, bukan margin", () => {
    const p = project();
    const on = computeRab(engineInput({ ...p, ppnEnabled: true }));
    const off = computeRab(engineInput({ ...p, ppnEnabled: false }));
    expect(on.total - off.total).toBe(on.ppn);
    expect(off.rap.margin).toBe(on.rap.margin);
    expect(on.rap.rap).toBe(off.rap.rap);
  });
});

describe("Slider spesifikasi & dependensi", () => {
  it("menggeser tingkat mengubah biaya kelompok sebesar selisih yang dilaporkan", () => {
    const p = project();
    const base = computeRab(engineInput(p));
    const next: SpecState = { ...p.spec!, lantai: "premium" };
    const resolved = resolveSpec({ floors: 1, soil: "sedang" }, next).spec;
    const after = computeRab(engineInput(p, resolved));
    const costOf = (r: typeof base) => r.items.filter((i) => SPEC_GROUPS.find((g) => g.key === "lantai")!.packages.includes(i.packageKey)).reduce((s, i) => s + i.amount, 0);
    expect(costOf(after)).toBeGreaterThan(costOf(base));
    expect(after.total).toBeGreaterThan(base.total);
  });
  it("dependensi memblokir posisi tidak valid dengan alasan teks", () => {
    const spec: SpecState = { ...defaultSpec({ floors: 1, soil: "sedang" }), struktur: "standar" };
    const blocked = specOptionBlocked({ floors: 1, soil: "sedang" }, spec, "struktur", "ekonomis");
    expect(blocked).toBeTruthy();
    const spec2: SpecState = { ...spec, atap: "premium" };
    expect(specOptionBlocked({ floors: 1, soil: "sedang" }, spec2, "struktur", "standar")).toMatch(/atap/i);
  });
  it("struktur tidak bisa di bawah aturan minimum (2 lantai, tanah buruk)", () => {
    expect(minimumStructureLevel({ floors: 2, soil: "sedang" }, defaultSpec({ floors: 2, soil: "sedang" })).level).toBe("menengah");
    expect(minimumStructureLevel({ floors: 2, soil: "buruk" }, defaultSpec({ floors: 2, soil: "buruk" })).level).toBe("menengah");
    expect(minimumStructureLevel({ floors: 3, soil: "sedang" }, defaultSpec({ floors: 1, soil: "sedang" })).level).toBe("premium");
    const resolved = resolveSpec({ floors: 2, soil: "sedang" }, { ...defaultSpec({ floors: 1, soil: "sedang" }), struktur: "ekonomis" });
    expect(resolved.spec.struktur).toBe("menengah");
    expect(resolved.adjustments.length).toBeGreaterThan(0);
  });
});

describe("Optimizer", () => {
  const ctx = (p: Project) => {
    const scope = p.scope!;
    const rabFor = (spec: SpecState, sc?: OptimizerScope) => computeRab(engineInput({ ...p, scope: sc ?? scope }, spec));
    return {
      model: { floors: p.model.floors, soil: p.model.soil },
      scope,
      costByGroup: (spec: SpecState) => {
        const rab = rabFor(spec, scope);
        const out = {} as Record<SpecGroupKey, number>;
        for (const g of SPEC_GROUPS) out[g.key] = rab.items.filter((i) => g.packages.includes(i.packageKey)).reduce((s, i) => s + i.amount, 0);
        return out;
      },
      rapFor: (spec: SpecState, sc?: OptimizerScope) => rabFor(spec, sc).rap.rap,
    };
  };

  it("target layak tercapai & total sama dengan computeRab", () => {
    const startSpec = Object.fromEntries(SPEC_GROUPS.map((g) => [g.key, "menengah"])) as SpecState;
    const p = project({ spec: startSpec });
    const c = ctx(p);
    const startRap = c.rapFor(p.spec!);
    const goal: OptimizerGoal = { targetRap: Math.round(startRap * 0.9) };
    const res = optimizeSpec(p.spec!, goal, c);
    expect(res.reachedTarget).toBe(true);
    expect(res.rap).toBeLessThanOrEqual(goal.targetRap!);
    expect(res.rap).toBe(computeRab(engineInput(p, res.spec)).rap.rap);
    expect(res.steps.length).toBeGreaterThan(0);
    for (const s of res.steps) expect(s.saving).toBeGreaterThan(0);
  });

  it("property-based: kendala struktur tidak pernah dilanggar", () => {
    for (const floors of [1, 2, 3]) {
      for (const soil of ["baik", "sedang", "buruk"] as const) {
        const baseModel = createBuildingModel({ area: 70, floors, bedrooms: 3, bathrooms: 2, soil });
        const p = project({ model: { ...baseModel, rooms: buildAutoRooms(baseModel) } });
        const c = ctx(p);
        const spec = defaultSpec({ floors, soil });
        const start = c.rapFor(spec);
        for (const target of [0.95, 0.8, 0.6, 0.3, 0.05]) {
          const res = optimizeSpec(spec, { targetRap: Math.round(start * target) }, c);
          const min = minimumStructureLevel({ floors, soil }, res.spec);
          expect(SPEC_ORDER.indexOf(res.spec.struktur)).toBeGreaterThanOrEqual(SPEC_ORDER.indexOf(min.level));
          // dependensi terpenuhi
          expect(res.spec).toEqual(resolveSpec({ floors, soil }, res.spec).spec);
        }
      }
    }
  }, 60_000);

  it("kasus tak layak memicu keputusan + batas aman", () => {
    const p = project();
    const c = ctx(p);
    const res = optimizeSpec(p.spec!, { targetRap: 1_000 }, c);
    expect(res.reachedTarget).toBe(false);
    expect(res.feasible).toBe(false);
    expect(res.safeFloorRap).toBeGreaterThan(1_000);
    expect(res.shortfall).toBeGreaterThan(0);
    expect(res.notes.join(" ")).toMatch(/tidak dapat dicapai|aman/i);
    expect(res.scopeOptions.length).toBeGreaterThan(0);
  });

  it("deterministik", () => {
    const p = project();
    const c = ctx(p);
    const goal: OptimizerGoal = { targetRap: Math.round(c.rapFor(p.spec!, p.scope!) * 0.85) };
    const r1 = optimizeSpec(p.spec!, goal, c);
    const r2 = optimizeSpec(p.spec!, goal, c);
    expect(r1.spec).toEqual(r2.spec);
    expect(r1.steps).toEqual(r2.steps);
    expect(r1.rap).toBe(r2.rap);
  });

  it("kelompok beku (frozen) tidak disentuh", () => {
    const p = project();
    const c = ctx(p);
    const res = optimizeSpec(p.spec!, { targetRap: Math.round(c.rapFor(p.spec!) * 0.85), frozen: ["lantai", "cat"] }, c);
    expect(res.steps.some((s) => s.group === "lantai" || s.group === "cat")).toBe(false);
  });

  it("rencana efisiensi & porsi menghasilkan spec sah", () => {
    const p = project();
    const c = ctx(p);
    const rows = efficiencyRows(p.spec!, { targetRap: null }, c);
    expect(rows.length).toBe(SPEC_GROUPS.length);
    const struktur = rows.find((r) => r.group === "struktur")!;
    expect(struktur.maxSaving).toBeGreaterThanOrEqual(0);
    const next = applyEfficiency(p.spec!, { cat: 100, plafon: 50 }, c, { targetRap: null });
    expect(next).toEqual(resolveSpec({ floors: 1, soil: "sedang" }, next).spec);
    expect(c.rapFor(next)).toBeLessThanOrEqual(c.rapFor(p.spec!));
  });
});

describe("FacadeSpec", () => {
  it("validasi zod & penolakan material di luar daftar", () => {
    const spec = facadeFromText("rumah minimalis tropis 2 lantai, jendela panjang, atap pelana asimetris, carport samping", defaultFacade("minimalis", 2)).spec;
    expect(facadeSpecSchema.safeParse(spec).success).toBe(true);
    expect(spec.windows).toBe("panjang");
    expect(spec.carport).toBe("terbuka");
    expect(facadeSpecSchema.safeParse({ ...spec, palette: "emas-mewah" }).success).toBe(false);
    expect(facadeSpecSchema.safeParse({ ...spec, roofPitch: 99 }).success).toBe(false);
  });
  it("menghasilkan 3 variasi berbeda", () => {
    const res = facadeFromText("tropis atap limasan", defaultFacade("tropis", 1));
    expect(res.variations.length).toBe(3);
    expect(new Set(res.variations.map((v) => JSON.stringify(v))).size).toBe(3);
  });
  it("sinkron dengan item RAB (elemen tampak jadi baris BOQ)", () => {
    const p = project({ facade: { ...defaultFacade("tropis", 2), balcony: true, secondarySkin: true, canopy: true }, scope: { carport: true, canopy: true, balcony: true, secondarySkin: true } });
    const rab = computeRab(engineInput(p));
    const ids = rab.items.map((i) => i.workItemId);
    expect(ids).toContain("tampak.balkon");
    expect(ids).toContain("tampak.skin");
    expect(ids).toContain("tampak.kanopi");
    const noBalcony = computeRab(engineInput({ ...p, facade: { ...p.facade!, balcony: false } }));
    expect(noBalcony.items.map((i) => i.workItemId)).not.toContain("tampak.balkon");
    expect(noBalcony.total).toBeLessThan(rab.total);
  });
  it("scope menonaktifkan elemen tampak terkait", () => {
    const p = project({ facade: { ...defaultFacade("minimalis", 1), canopy: true } });
    const withCanopy = computeRab(engineInput(p));
    const without = computeRab(engineInput({ ...p, scope: { ...p.scope!, canopy: false } }));
    expect(without.items.map((i) => i.workItemId)).not.toContain("tampak.kanopi");
    expect(without.total).toBeLessThan(withCanopy.total);
  });
});

describe("AI: aksi terstruktur tanpa rupiah", () => {
  it.each([
    ["naikkan lantai ke premium", "ubah_spesifikasi"],
    ["turunkan cat jadi ekonomis", "ubah_spesifikasi"],
    ["denah bentuk L", "ubah_denah"],
    ["coba denah lain", "ubah_denah"],
    ["tampak tropis atap limasan", "ubah_tampak"],
    ["target margin 60 juta", "target_harga"],
    ["jelaskan RAP itu apa", "jelaskan"],
    ["minta opsi lain", "opsi_lain"],
    ["asdf qwer", "tidak_dipahami"],
  ])("%s → %s", (text, kind) => {
    const action = parseChatAction(text);
    expect(action.kind).toBe(kind);
    expect(() => assertNoMoneyFromAi(action)).not.toThrow();
  });
  it("balasan hanya memakai angka dari engine (facts)", () => {
    const facts = { total: 123_456_789, rap: 100_000_000, margin: 23_456_789, marginPercent: 19, p10: 1, p90: 2, completeness: 50, rooms: 5, area: 70 };
    const reply = composeReply(parseChatAction("jelaskan total"), facts);
    expect(reply).toContain("123.456.789");
    expect(reply).not.toMatch(/Rp\s?0\b/);
    // angka lain tidak boleh muncul
    const numbers = reply.match(/\d[\d.]{5,}/g) ?? [];
    expect(numbers.every((n) => n.replace(/\./g, "") === "123456789")).toBe(true);
  });
  it("guard menolak payload berisi rupiah/volume", () => {
    expect(() => assertNoMoneyFromAi({ kind: "ubah_spesifikasi", harga: 1000 })).toThrow();
    expect(() => assertNoMoneyFromAi({ spec: { total: 1 } })).toThrow();
    expect(() => assertNoMoneyFromAi({ kind: "ubah_denah", typology: "L", seedBaru: true })).not.toThrow();
  });
});

describe("Migrasi skema v2 → v3", () => {
  it("ruangan x,y,w,h menjadi poligon persegi + fungsi terdeteksi", () => {
    const room = migrateLegacyRoom({ id: "r1", name: "Kamar mandi 1", level: 0, x: 1, y: 2, w: 2, h: 1.5, wet: true }, 0) as Record<string, unknown>;
    expect(Array.isArray(room.polygon)).toBe(true);
    expect((room.polygon as unknown[]).length).toBe(4);
    expect(room.fungsi).toBe("kamar_mandi");
    expect((room.polygon as { x: number; y: number }[])[2]).toEqual({ x: 3, y: 3.5 });
  });
  it("proyek lama lolos validasi setelah migrasi", () => {
    const legacy = {
      schemaVersion: 2,
      projects: [{
        id: "old", name: "Lama", createdAt: "", updatedAt: "", status: "indikatif", archived: false, location: "Yogyakarta",
        lastSavedAt: "", stage: 1, answers: [], rates: { "a": 1 },
        model: {
          id: "m", name: "Lama", type: "45", area: 45, landArea: 72, floors: 1, bedrooms: 2, bathrooms: 1,
          levels: [{ index: 0, height: 3.2, footprint: { shape: "persegi", width: 7.5, depth: 6 } }],
          rooms: [{ id: "a", name: "Ruang tamu", level: 0, x: 0, y: 0, w: 4, h: 3, wet: false }, { id: "b", name: "Kamar mandi", level: 0, x: 4, y: 0, w: 2, h: 2, wet: true }],
          roof: { type: "pelana", pitch: 30, overhang: 0.6 }, finishing: "menengah", foundation: "batu_kali", soil: "sedang",
          location: "Yogyakarta", regionIndex: 1, ceilingHeight: 3, doors: 5, windows: 6, electricalPoints: 8, waterPoints: 3,
          carport: true, created: "", updated: "", assumptions: {}, structureConfirmed: false,
        },
      }],
    };
    const { data, notes } = migratePayload(legacy);
    expect(notes.join(" ")).toMatch(/poligon/);
    const projects = (data as { projects: unknown[] }).projects;
    const result = validateProject(projects[0]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.model.rooms[0].polygon.length).toBe(4);
      expect(result.data.model.levels[0].footprint.points.length).toBe(4);
      expect(result.data.ppnEnabled).toBe(true);
    }
  });
});

describe("Kinerja", () => {
  it("300 item hitung ulang < 200 ms", () => {
    const p = project();
    const catalog = { ...SEED_CATALOG, workItems: SEED_CATALOG.workItems.flatMap((w) => Array.from({ length: 11 }, (_, i) => ({ ...w, id: `${w.id}.${i}` }))) };
    const t0 = performance.now();
    const r = computeRab({ ...engineInput(p), catalog, iterations: 5 });
    expect(r.items.length).toBeGreaterThan(250);
    expect(performance.now() - t0).toBeLessThan(200);
  });
});
