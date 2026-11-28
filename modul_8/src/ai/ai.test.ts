import { describe, expect, it } from "vitest";
import { normalizeNumbers, routeIntent } from "./router";
import { assertNoMoneyFromAi, AiGuardError } from "./guard";
import { derivePatterns, applyApprovedDefaults } from "./learner";
import { interpretAnswer, questionBank, rankQuestions } from "./interviewer";
import { createBuildingModel, DEFAULT_SETTINGS } from "../data/config";
import { SEED_CATALOG } from "../data/catalog";
import { SEED_CORRECTIONS } from "../data/seed";
import { rangeWidthIf } from "../engine/rab";
import { LocalEngineAdapter } from "../integration/engineClient";

type Case = [string, string, Record<string, unknown>];
const cases: Case[] = [
  ["buat RAB rumah tipe 45", "buat_baru", { luas: 45, tipe: "45" }],
  ["rumah 2 lantai 120 m2 atap pelana", "buat_baru", { luas: 120, lantai: 2, atap: "pelana" }],
  ["bikin rab rumah tiga kamar dua lantai", "buat_baru", { kamar_tidur: 3, lantai: 2 }],
  ["hitung rumah sekitar 60 meter", "buat_baru", { luas: 60 }],
  ["rencana rumah empat puluh lima meter persegi di Bandung", "buat_baru", { luas: 45, lokasi: "Bandung" }],
  ["buat rumah tipe 36/72", "buat_baru", { luas: 36, luas_tanah: 72 }],
  ["rumah 6x10 meter satu lantai", "buat_baru", { luas: 60, lantai: 1 }],
  ["estimasi rumah 70 m² 3 kamar tidur 2 kamar mandi", "buat_baru", { luas: 70, kamar_tidur: 3, kamar_mandi: 2 }],
  ["buatkan rab rumah mewah 150 m2 di jakarta", "buat_baru", { luas: 150, finishing: "premium", lokasi: "Jakarta" }],
  ["rumah sederhana tipe 36 di jogja", "buat_baru", { luas: 36, finishing: "standar", lokasi: "Yogyakarta" }],
  ["rab rumah bertingkat 100 meter atap limasan", "buat_baru", { luas: 100, lantai: 2, atap: "limasan" }],
  ["buat rumah dak beton 90 m2", "buat_baru", { luas: 90, atap: "datar" }],
  ["rumah 2 lt luas 80 dengan carport", "buat_baru", { luas: 80, lantai: 2, carport: true }],
  ["hitung anggaran rumah menengah tipe 54 surabaya", "buat_baru", { luas: 54, finishing: "menengah", lokasi: "Surabaya" }],
  ["buat rab untuk pak budi tipe 45", "buat_baru", { luas: 45, nama: "Pak Budi" }],
  ["bangun rumah seratus dua puluh meter dua lantai", "buat_baru", { luas: 120, lantai: 2 }],
  ["rumah tanah 120 m2 bangunan 70 m2", "buat_baru", { luas_tanah: 120, luas: 70 }],
  ["buat rumah 4 kamar 3 km", "buat_baru", { kamar_tidur: 4, kamar_mandi: 3 }],
  ["rab rumah perisai 2 lantai semarang", "buat_baru", { atap: "perisai", lantai: 2, lokasi: "Semarang" }],
  ["bikin rumah premium kira-kira 200 meter", "buat_baru", { luas: 200, finishing: "premium" }],
  ["cari proyek Pak Budi", "cari_proyek", { query: "Pak Budi" }],
  ["carikan proyek di Bandung", "cari_proyek", {}],
  ["temukan rumah keluarga sari", "cari_proyek", {}],
  ["mana proyek bu ani", "cari_proyek", {}],
  ["buka proyek Rumah Bapak Andi", "buka_proyek", { query: "Rumah Bapak Andi" }],
  ["ubah atap jadi limasan", "ubah_proyek", { atap: "limasan" }],
  ["ganti jadi dua lantai", "ubah_proyek", { lantai: 2 }],
  ["berapa biaya bangun rumah per meter?", "tanya", {}],
  ["apa bedanya pelana dan limasan", "tanya", { atap: "pelana" }],
  ["pak budi", "tidak_jelas", { nama: "Pak Budi" }],
  ["halo", "tidak_jelas", {}],
  ["", "tidak_jelas", {}],
  ["3 kamar 2 kamar mandi", "tidak_jelas", { kamar_tidur: 3, kamar_mandi: 2 }],
];

describe("interpretText / routeIntent (33 contoh)", () => {
  it.each(cases)("%s → %s", (text, intent, slots) => {
    const r = routeIntent(text);
    expect(r.intent).toBe(intent);
    for (const [k, v] of Object.entries(slots)) expect(r.slots[k as keyof typeof r.slots]).toEqual(v);
  });
  it("klarifikasi satu pertanyaan bila ambigu", () => {
    const r = routeIntent("pak budi");
    expect(r.clarification).toMatch(/membuat RAB baru.*atau mencari/);
  });
  it("normalisasi angka kata Indonesia", () => {
    expect(normalizeNumbers("empat puluh lima")).toBe("45");
    expect(normalizeNumbers("seratus dua puluh meter")).toBe("120 meter");
    expect(normalizeNumbers("tiga kamar, dua lantai")).toBe("3 kamar, 2 lantai");
    expect(normalizeNumbers("dua belas titik")).toBe("12 titik");
  });
  it("adaptor lokal memakai aturan bahasa bila provider mock", async () => {
    const engine = new LocalEngineAdapter({
      getCatalog: () => SEED_CATALOG, getSettings: () => DEFAULT_SETTINGS, getActiveCalibration: () => null, getActuals: () => [],
      onCorrection() {}, onActuals() {}, onUpsertPrice() {}, onUpsertAnalysis() {},
    });
    const r = await engine.interpretText("buat rab rumah tipe 45");
    expect(r.basis).toBe("aturan_bahasa");
    expect(r.slots.luas).toBe(45);
  });
});

describe("Larangan rupiah/volume dari AI", () => {
  it.each([{ total: 1 }, { harga: 5 }, { slots: { biaya: 100 } }, { items: [{ volume: 3 }] }, { koefisien: 0.2 }, { ppn: 11 }])("menolak %j", (payload) => {
    expect(() => assertNoMoneyFromAi(payload)).toThrow(AiGuardError);
  });
  it("menerima slot non-uang", () => {
    expect(() => assertNoMoneyFromAi({ intent: "buat_baru", slots: { luas: 45, lantai: 2 } })).not.toThrow();
  });
});

describe("Interviewer", () => {
  const base = createBuildingModel({ area: 70 });
  const input = { model: base, settings: DEFAULT_SETTINGS, catalog: SEED_CATALOG };
  it("urutan menurut dampak ke rentang (sensitivitas engine)", () => {
    const ranked = rankQuestions(base, 1, (slots) => rangeWidthIf(input, slots, 300));
    for (let i = 1; i < ranked.length; i++) expect(ranked[i - 1].weight).toBeGreaterThanOrEqual(ranked[i].weight);
    expect(ranked[0].impact).toBeGreaterThan(0);
  });
  it("tidak menanyakan yang sudah dijawab (termasuk 'belum tahu')", () => {
    const m = { ...base, assumptions: { area: { source: "pengguna" as const, confirmed: true, confidence: 1 }, floors: { source: "default_config" as const, confirmed: false, answered: true, confidence: 0.3 } } };
    const ids = rankQuestions(m, 1, () => 0).map((q) => q.id);
    expect(ids).not.toContain("area");
    expect(ids).not.toContain("floors");
  });
  it("jawaban multi-slot", () => {
    const q = questionBank().find((x) => x.id === "bedroomsBathrooms")!;
    const r = interpretAnswer(q, "tiga kamar tidur, dua kamar mandi, carport samping");
    expect(r.patch).toMatchObject({ bedrooms: 3, bathrooms: 2, carport: true });
    expect(r.understood).toBe(true);
  });
});

describe("Pembelajaran", () => {
  it("pola dari koreksi; pola belum disetujui tidak dipakai", () => {
    const patterns = derivePatterns(SEED_CORRECTIONS);
    const roof = patterns.find((p) => p.field === "roof")!;
    expect(roof.count).toBe(6);
    const m = createBuildingModel({ area: 45 });
    expect(applyApprovedDefaults(m, patterns).applied).toHaveLength(0);
    const approved = derivePatterns(SEED_CORRECTIONS, { [roof.id]: "approved" });
    expect(applyApprovedDefaults(m, approved).model.roof.type).toBe("limasan");
  });
});
