import { describe, expect, it } from "vitest";
import { SEED_CATALOG, SUMBER_CONTOH } from "./catalog";
import { SEED_PROJECTS } from "./seed";
import { validateCatalog, validateProject, migratePayload } from "./schema";

describe("validate-data: katalog & seed", () => {
  it("katalog contoh lolos skema dan referensi silang", () => {
    const r = validateCatalog(SEED_CATALOG);
    expect(r.errors).toEqual([]);
  });
  it("seed punya ±25 analisis, semuanya CONTOH dan belum terverifikasi", () => {
    expect(SEED_CATALOG.analisis.length).toBeGreaterThanOrEqual(25);
    for (const a of SEED_CATALOG.analisis) {
      expect(a.keyakinan).toBe("belum");
      expect(a.sumber.regulasi).toBe(SUMBER_CONTOH);
    }
    for (const k of SEED_CATALOG.komponen) expect(k.sumber).toBe(SUMBER_CONTOH);
  });
  it("tidak ada label regulasi pada angka karangan", () => {
    const text = JSON.stringify(SEED_CATALOG);
    expect(text).not.toMatch(/SNI|Permen|PUPR|AHSP/i);
  });
  it("proyek contoh valid", () => {
    for (const p of SEED_PROJECTS) expect(validateProject(p).ok).toBe(true);
  });
  it("migrasi v0 menambah field yang hilang", () => {
    const { data, notes } = migratePayload({ projects: [{ id: "x" }] });
    expect(notes.length).toBeGreaterThan(0);
    expect((data as { projects: { stage: number }[] }).projects[0].stage).toBe(1);
  });
  it("validator menolak katalog rusak", () => {
    const bad = { ...SEED_CATALOG, workItems: [{ ...SEED_CATALOG.workItems[0], rumus: "eval(1)" }] };
    expect(validateCatalog(bad).errors.length).toBeGreaterThan(0);
  });
});
