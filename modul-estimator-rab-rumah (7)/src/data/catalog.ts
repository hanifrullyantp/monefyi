import type { Analisis, Catalog, Komponen, KomponenJenis, WorkItem } from "./types";

/**
 * KATALOG CONTOH – belum diverifikasi.
 * Semua kode, harga, dan koefisien di file ini dikarang untuk demonstrasi alur.
 * BUKAN kutipan SNI/Permen PUPR/AHSP mana pun dan tidak boleh dipakai untuk RAB nyata.
 */
export const SUMBER_CONTOH = "CONTOH – belum diverifikasi";
const TGL = "2025-06-01";

const k = (kode: string, uraian: string, jenis: KomponenJenis, satuan: string, harga: number): Komponen => ({
  kode, uraian, jenis, satuan, harga, wilayah: "Yogyakarta", tanggalBerlaku: TGL, sumber: SUMBER_CONTOH,
});

export const SEED_KOMPONEN: Komponen[] = [
  k("T.PKJ", "Pekerja", "tenaga", "OH", 110_000),
  k("T.TKG", "Tukang", "tenaga", "OH", 150_000),
  k("T.KTK", "Kepala tukang", "tenaga", "OH", 165_000),
  k("T.MDR", "Mandor", "tenaga", "OH", 175_000),
  k("B.SMN", "Semen 50 kg", "bahan", "sak", 68_000),
  k("B.PSR", "Pasir", "bahan", "m³", 280_000),
  k("B.KRK", "Kerikil/split", "bahan", "m³", 330_000),
  k("B.BTK", "Batu belah", "bahan", "m³", 260_000),
  k("B.BSI", "Besi beton", "bahan", "kg", 14_500),
  k("B.BKS", "Bekisting (kayu & paku)", "bahan", "m²", 85_000),
  k("B.BRG", "Bata ringan", "bahan", "m³", 720_000),
  k("B.MRT", "Mortar instan", "bahan", "kg", 2_900),
  k("B.WPF", "Pelapis kedap air", "bahan", "kg", 38_000),
  k("B.KRM.standar", "Keramik lantai kelas standar", "bahan", "m²", 75_000),
  k("B.KRM.menengah", "Keramik lantai kelas menengah", "bahan", "m²", 120_000),
  k("B.KRM.premium", "Keramik lantai kelas premium", "bahan", "m²", 260_000),
  k("B.KRD", "Keramik dinding area basah", "bahan", "m²", 95_000),
  k("B.BJR", "Rangka baja ringan (per m² atap)", "bahan", "m²", 120_000),
  k("B.GTG", "Penutup atap metal", "bahan", "m²", 78_000),
  k("B.LSP", "Lisplang & talang", "bahan", "m", 62_000),
  k("B.GPS", "Papan gipsum + rangka", "bahan", "m²", 95_000),
  k("B.CAT.standar", "Cat kelas standar", "bahan", "kg", 28_000),
  k("B.CAT.menengah", "Cat kelas menengah", "bahan", "kg", 45_000),
  k("B.CAT.premium", "Cat kelas premium", "bahan", "kg", 85_000),
  k("B.PTU.standar", "Set pintu kelas standar", "bahan", "unit", 950_000),
  k("B.PTU.menengah", "Set pintu kelas menengah", "bahan", "unit", 1_450_000),
  k("B.PTU.premium", "Set pintu kelas premium", "bahan", "unit", 2_600_000),
  k("B.JDL", "Set jendela aluminium + kaca", "bahan", "unit", 820_000),
  k("B.SNT.standar", "Set sanitair kelas standar", "bahan", "set", 2_400_000),
  k("B.SNT.menengah", "Set sanitair kelas menengah", "bahan", "set", 4_200_000),
  k("B.SNT.premium", "Set sanitair kelas premium", "bahan", "set", 9_500_000),
  k("B.SPT", "Septic tank fabrikasi", "bahan", "unit", 3_200_000),
  k("B.PIP", "Pipa & fitting (per titik)", "bahan", "titik", 160_000),
  k("B.KBL", "Kabel, saklar, stop kontak (per titik)", "bahan", "titik", 170_000),
  k("B.PNL", "Panel & MCB", "bahan", "unit", 1_400_000),
  k("B.PTK", "Patok & papan ukur", "bahan", "m", 18_000),
  k("A.MOL", "Sewa molen", "alat", "hari", 350_000),
  k("A.SCF", "Sewa perancah", "alat", "set·hari", 30_000),
  k("B.KNP", "Kanopi baja ringan + atap", "bahan", "m²", 420_000),
  k("B.BLK", "Plat & railing balkon", "bahan", "m²", 680_000),
  k("B.SKN", "Secondary skin (roster/kisi)", "bahan", "m²", 395_000),
  k("B.KLD", "Kolom dekoratif", "bahan", "unit", 1_250_000),
  k("B.PGR", "Pagar besi + pondasi", "bahan", "m", 780_000),
  k("B.AKS", "Dinding aksen (bata ekspos/batu)", "bahan", "m²", 285_000),
  k("B.PLT", "Planter box beton", "bahan", "unit", 420_000),
  k("B.CPT", "Perkerasan & rangka carport", "bahan", "m²", 310_000),
  k("B.TGD", "Tangga & bordes depan", "bahan", "m²", 540_000),
  k("B.LVR", "Roster/louvre terpasang", "bahan", "m²", 330_000),
  k("B.KTS.ekonomis", "Kitchen set ekonomis", "bahan", "m", 1_450_000),
  k("B.KTS.standar", "Kitchen set standar", "bahan", "m", 2_300_000),
  k("B.KTS.menengah", "Kitchen set menengah", "bahan", "m", 3_600_000),
  k("B.KTS.premium", "Kitchen set premium", "bahan", "m", 5_800_000),
];

type Row = [string, number, number?];
const a = (id: string, uraian: string, satuan: string, rows: Row[]): Analisis => ({
  id, pekerjaanId: id.replace(/^A\./, "P."), uraian, satuan,
  komponen: rows.map(([komponenId, koefisien, waste]) => ({ komponenId, koefisien, ...(waste ? { waste } : {}) })),
  sumber: { regulasi: SUMBER_CONTOH, tahun: null, halaman: null },
  keyakinan: "belum",
});

const finishingVariants = (base: string, uraian: string, satuan: string, rows: (f: string) => Row[]) =>
  (["standar", "menengah", "premium"] as const).map((f) => a(`${base}.${f}`, `${uraian} (${f})`, satuan, rows(f)));

export const SEED_ANALISIS: Analisis[] = [
  a("A.PSP.BERSIH", "Pembersihan lahan", "m²", [["T.PKJ", 0.05], ["T.MDR", 0.005]]),
  a("A.PSP.UKUR", "Pengukuran & papan ukur", "m", [["T.PKJ", 0.1], ["T.TKG", 0.1], ["B.PTK", 1.1]]),
  a("A.TNH.GALI", "Galian tanah", "m³", [["T.PKJ", 0.75], ["T.MDR", 0.025]]),
  a("A.TNH.URUG", "Urugan & pemadatan", "m³", [["T.PKJ", 0.5], ["B.PSR", 1.2, 0.05]]),
  a("A.PDS.BATU", "Pondasi batu belah", "m³", [["T.PKJ", 1.5], ["T.TKG", 0.75], ["T.MDR", 0.075], ["B.BTK", 1.2], ["B.SMN", 3.3, 0.03], ["B.PSR", 0.5, 0.05]]),
  a("A.STR.SLOOF", "Sloof beton bertulang", "m", [["T.PKJ", 0.35], ["T.TKG", 0.3], ["B.SMN", 1.1, 0.03], ["B.PSR", 0.05], ["B.KRK", 0.08], ["B.BSI", 7.5, 0.05], ["B.BKS", 0.4], ["A.MOL", 0.02]]),
  a("A.STR.KOLOM", "Kolom praktis", "m", [["T.PKJ", 0.3], ["T.TKG", 0.25], ["B.SMN", 0.6, 0.03], ["B.PSR", 0.03], ["B.KRK", 0.05], ["B.BSI", 4.8, 0.05], ["B.BKS", 0.48]]),
  a("A.STR.BALOK", "Balok & ring balk", "m", [["T.PKJ", 0.35], ["T.TKG", 0.3], ["B.SMN", 1.1, 0.03], ["B.PSR", 0.05], ["B.KRK", 0.08], ["B.BSI", 7.5, 0.05], ["B.BKS", 0.5], ["A.SCF", 0.1]]),
  a("A.STR.PLAT", "Plat lantai beton", "m²", [["T.PKJ", 0.8], ["T.TKG", 0.4], ["B.SMN", 4.2, 0.03], ["B.PSR", 0.06], ["B.KRK", 0.1], ["B.BSI", 14, 0.05], ["B.BKS", 1.1], ["A.MOL", 0.05], ["A.SCF", 0.3]]),
  a("A.DND.PSG", "Pasangan bata ringan", "m²", [["T.PKJ", 0.3], ["T.TKG", 0.1], ["B.BRG", 0.077, 0.05], ["B.MRT", 8.5, 0.05]]),
  a("A.DND.PLS", "Plesteran", "m²", [["T.PKJ", 0.2], ["T.TKG", 0.1], ["B.MRT", 13, 0.05]]),
  a("A.DND.ACI", "Acian", "m²", [["T.PKJ", 0.15], ["T.TKG", 0.08], ["B.MRT", 2.5, 0.05]]),
  a("A.DND.WPF", "Pelapis kedap air area basah", "m²", [["T.PKJ", 0.1], ["T.TKG", 0.05], ["B.WPF", 1.6, 0.05]]),
  a("A.DND.KRD", "Keramik dinding area basah", "m²", [["T.PKJ", 0.45], ["T.TKG", 0.3], ["B.KRD", 1, 0.08], ["B.SMN", 0.25]]),
  ...finishingVariants("A.LNT.KRM", "Keramik lantai", "m²", (f) => [["T.PKJ", 0.35], ["T.TKG", 0.25], [`B.KRM.${f}`, 1, 0.06], ["B.SMN", 0.2], ["B.PSR", 0.03]]),
  a("A.LNT.RABAT", "Rabat beton area luar", "m²", [["T.PKJ", 0.25], ["T.TKG", 0.1], ["B.SMN", 0.7, 0.03], ["B.PSR", 0.03], ["B.KRK", 0.05]]),
  ...finishingVariants("A.KSN.PINTU", "Kusen & daun pintu terpasang", "unit", (f) => [["T.TKG", 1], ["T.PKJ", 0.5], [`B.PTU.${f}`, 1]]),
  a("A.KSN.JENDELA", "Kusen & jendela terpasang", "unit", [["T.TKG", 0.6], ["T.PKJ", 0.3], ["B.JDL", 1]]),
  a("A.ATP.RANGKA", "Rangka atap baja ringan", "m²", [["T.TKG", 0.12], ["T.PKJ", 0.06], ["B.BJR", 1, 0.03]]),
  a("A.ATP.PENUTUP", "Penutup atap", "m²", [["T.TKG", 0.08], ["T.PKJ", 0.04], ["B.GTG", 1, 0.08]]),
  a("A.ATP.LSP", "Lisplang & talang", "m", [["T.TKG", 0.1], ["T.PKJ", 0.05], ["B.LSP", 1, 0.05]]),
  a("A.PLF.GPS", "Plafon gipsum + rangka", "m²", [["T.TKG", 0.2], ["T.PKJ", 0.1], ["B.GPS", 1, 0.05], ["A.SCF", 0.05]]),
  ...finishingVariants("A.CAT", "Pengecatan 2 lapis", "m²", (f) => [["T.TKG", 0.06], ["T.PKJ", 0.03], [`B.CAT.${f}`, 0.26, 0.05]]),
  ...finishingVariants("A.SNT.SET", "Set sanitair kamar mandi", "set", (f) => [["T.TKG", 2], ["T.PKJ", 1], [`B.SNT.${f}`, 1]]),
  a("A.SNT.SPT", "Septic tank & resapan", "unit", [["T.PKJ", 3], ["T.TKG", 1], ["B.SPT", 1]]),
  a("A.SNT.AIR", "Titik air bersih & buangan", "titik", [["T.TKG", 0.5], ["T.PKJ", 0.25], ["B.PIP", 1]]),
  a("A.LST.TITIK", "Titik listrik", "titik", [["T.TKG", 0.4], ["T.PKJ", 0.2], ["B.KBL", 1]]),
  a("A.LST.PANEL", "Panel & grounding", "unit", [["T.TKG", 1], ["B.PNL", 1]]),
  a("A.TMP.KANOPI", "Kanopi depan", "m²", [["T.TKG", 0.3], ["T.PKJ", 0.15], ["B.KNP", 1, 0.04]]),
  a("A.TMP.BALKON", "Balkon + railing", "m²", [["T.TKG", 0.5], ["T.PKJ", 0.3], ["B.BLK", 1, 0.05], ["B.SMN", 1.4]]),
  a("A.TMP.SKIN", "Secondary skin", "m²", [["T.TKG", 0.28], ["T.PKJ", 0.14], ["B.SKN", 1, 0.06]]),
  a("A.TMP.KOLOM", "Kolom dekoratif", "unit", [["T.TKG", 1.2], ["T.PKJ", 0.6], ["B.KLD", 1], ["B.SMN", 1.5]]),
  a("A.TMP.PAGAR", "Pagar depan", "m", [["T.TKG", 0.4], ["T.PKJ", 0.2], ["B.PGR", 1, 0.03]]),
  a("A.TMP.AKSEN", "Dinding aksen", "m²", [["T.TKG", 0.35], ["T.PKJ", 0.18], ["B.AKS", 1, 0.07]]),
  a("A.TMP.PLANTER", "Planter box", "unit", [["T.TKG", 0.5], ["T.PKJ", 0.25], ["B.PLT", 1]]),
  a("A.TMP.CARPORT", "Carport", "m²", [["T.TKG", 0.22], ["T.PKJ", 0.11], ["B.CPT", 1, 0.05]]),
  a("A.TMP.TANGGA", "Tangga depan", "m²", [["T.TKG", 0.6], ["T.PKJ", 0.3], ["B.TGD", 1, 0.05], ["B.SMN", 1.2]]),
  a("A.TMP.LOUVRE", "Roster / louvre", "m²", [["T.TKG", 0.25], ["T.PKJ", 0.12], ["B.LVR", 1, 0.06]]),
  a("A.KTC.SET.ekonomis", "Kitchen set ekonomis", "m", [["T.TKG", 0.8], ["T.PKJ", 0.4], ["B.KTS.ekonomis", 1]]),
  ...finishingVariants("A.KTC.SET", "Kitchen set", "m", (f) => [["T.TKG", 0.8], ["T.PKJ", 0.4], [`B.KTS.${f}`, 1]]),
];

const w = (id: string, paket: string, uraian: string, satuan: string, rumus: string, analisisId: string, kelasSumber: WorkItem["kelasSumber"], slots: string[], cvVolume: number, relasi: WorkItem["relasi"], extra: Partial<WorkItem> = {}): WorkItem => ({
  id, paket, uraian, satuan, rumus, analisisId, kelasSumber, slots, cvVolume, relasi, ...extra,
});

/**
 * Mapping model → volume. Variabel tersedia: lihat DATA_SPEC.md (luas_lantai, keliling_luar,
 * panjang_dinding_dalam, luas_dinding_bersih, luas_basah, jumlah_km, jumlah_pintu, ...).
 */
export const SEED_WORK_ITEMS: WorkItem[] = [
  w("persiapan.bersih", "persiapan", "Pembersihan lahan", "m²", "luas_tanah", "A.PSP.BERSIH", "terukur", ["landArea"], 0.2, "umum"),
  w("persiapan.ukur", "persiapan", "Pengukuran & papan ukur", "m", "keliling_dasar + 4", "A.PSP.UKUR", "turunan", ["area"], 0.1, "umum"),
  w("tanah.galian", "tanah_pondasi", "Galian tanah pondasi", "m³", "panjang_pondasi * 0.6 * dalam_galian", "A.TNH.GALI", "turunan", ["area", "foundation"], 0.2, "struktur"),
  w("tanah.urug", "tanah_pondasi", "Urugan bawah lantai", "m³", "luas_dasar * 0.15", "A.TNH.URUG", "turunan", ["area"], 0.15, "lantai"),
  w("pondasi.batu", "tanah_pondasi", "Pondasi batu belah", "m³", "panjang_pondasi * penampang_pondasi", "A.PDS.BATU", "estimasi_struktur", ["area", "foundation", "floors"], 0.2, "struktur"),
  w("struktur.sloof", "struktur", "Sloof beton bertulang", "m", "panjang_pondasi", "A.STR.SLOOF", "estimasi_struktur", ["area"], 0.15, "struktur"),
  w("struktur.kolom", "struktur", "Kolom praktis", "m", "jumlah_kolom * tinggi_total", "A.STR.KOLOM", "estimasi_struktur", ["area", "floors"], 0.2, "struktur"),
  w("struktur.balok", "struktur", "Balok & ring balk", "m", "keliling_luar + panjang_dinding_dalam", "A.STR.BALOK", "estimasi_struktur", ["area", "bedrooms"], 0.15, "struktur"),
  w("struktur.plat", "struktur", "Plat lantai beton", "m²", "luas_lantai_atas", "A.STR.PLAT", "estimasi_struktur", ["floors"], 0.1, "struktur", { syaratAktif: "lantai - 1" }),
  w("dinding.pasangan", "dinding", "Pasangan dinding bata ringan", "m²", "luas_dinding_bersih", "A.DND.PSG", "turunan", ["area", "bedrooms", "openings"], 0.15, "dinding"),
  w("dinding.plester", "dinding", "Plesteran dua sisi", "m²", "luas_dinding_bersih * 2", "A.DND.PLS", "turunan", ["area", "bedrooms", "openings"], 0.15, "dinding"),
  w("dinding.acian", "dinding", "Acian dua sisi", "m²", "luas_dinding_bersih * 2", "A.DND.ACI", "turunan", ["area", "bedrooms", "openings"], 0.15, "dinding"),
  w("dinding.waterproof", "dinding", "Pelapis kedap air area basah", "m²", "luas_basah + keliling_basah * 1.8", "A.DND.WPF", "terukur", ["bathrooms"], 0.2, "basah"),
  w("dinding.keramik_basah", "dinding", "Keramik dinding area basah", "m²", "keliling_basah * 1.8", "A.DND.KRD", "terukur", ["bathrooms"], 0.2, "basah"),
  w("lantai.keramik", "lantai", "Keramik lantai", "m²", "luas_lantai", "A.LNT.KRM.{finishing}", "terukur", ["area", "finishing"], 0.12, "lantai", { finishingSensitive: true }),
  w("lantai.rabat", "lantai", "Rabat beton teras & carport", "m²", "luas_luar", "A.LNT.RABAT", "terukur", ["landArea"], 0.25, "umum", { syaratAktif: "luas_luar" }),
  w("kusen.pintu", "kusen", "Kusen & daun pintu", "unit", "jumlah_pintu", "A.KSN.PINTU.{finishing}", "terukur", ["openings", "finishing"], 0.2, "bukaan", { finishingSensitive: true }),
  w("kusen.jendela", "kusen", "Kusen & jendela", "unit", "jumlah_jendela", "A.KSN.JENDELA", "terukur", ["openings"], 0.2, "bukaan"),
  w("atap.rangka", "atap", "Rangka atap baja ringan", "m²", "luas_atap", "A.ATP.RANGKA", "turunan", ["area", "roof"], 0.12, "atap"),
  w("atap.penutup", "atap", "Penutup atap", "m²", "luas_atap", "A.ATP.PENUTUP", "turunan", ["area", "roof"], 0.12, "atap"),
  w("atap.lisplang", "atap", "Lisplang & talang", "m", "keliling_atap", "A.ATP.LSP", "turunan", ["area", "roof"], 0.1, "atap"),
  w("plafon.gipsum", "plafon", "Plafon gipsum", "m²", "luas_lantai", "A.PLF.GPS", "turunan", ["area"], 0.12, "plafon"),
  w("cat.dinding", "cat", "Pengecatan dinding (dalam & luar)", "m²", "luas_dinding_bersih * 2", "A.CAT.{finishing}", "turunan", ["area", "openings", "finishing"], 0.15, "dinding", { finishingSensitive: true }),
  w("cat.plafon", "cat", "Pengecatan plafon", "m²", "luas_lantai", "A.CAT.{finishing}", "turunan", ["area", "finishing"], 0.12, "plafon", { finishingSensitive: true }),
  w("sanitair.set", "sanitair", "Set sanitair kamar mandi", "set", "jumlah_km", "A.SNT.SET.{finishing}", "terukur", ["bathrooms", "finishing"], 0.1, "basah", { finishingSensitive: true }),
  w("sanitair.septictank", "sanitair", "Septic tank & resapan", "unit", "1", "A.SNT.SPT", "terukur", [], 0.05, "basah"),
  w("sanitair.air", "sanitair", "Titik air bersih & buangan", "titik", "jumlah_titik_air", "A.SNT.AIR", "terukur", ["water"], 0.25, "mep"),
  w("listrik.titik", "listrik_air", "Titik listrik", "titik", "jumlah_titik_listrik", "A.LST.TITIK", "terukur", ["electrical"], 0.25, "mep"),
  w("listrik.panel", "listrik_air", "Panel & grounding", "unit", "1", "A.LST.PANEL", "terukur", [], 0.05, "mep"),
  w("kitchen.set", "kitchen", "Kitchen set bawah & atas", "m", "min(6, max(2, keliling_basah * 0.6))", "A.KTC.SET.{finishing}", "terukur", ["bathrooms", "finishing"], 0.2, "umum", { finishingSensitive: true }),
];

export const SEED_CATALOG: Catalog = { komponen: SEED_KOMPONEN, analisis: SEED_ANALISIS, workItems: SEED_WORK_ITEMS };

export function cloneCatalog(catalog: Catalog = SEED_CATALOG): Catalog {
  return JSON.parse(JSON.stringify(catalog)) as Catalog;
}
