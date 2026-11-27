// scripts/ingest/import.mjs
// Impor analisis AHSP Lampiran VI yang lolos validasi ke katalog draft (status draft,
// versi katalog SE-47-2026, sumber per halaman). AHSP hanya menyimpan koefisien;
// harga komponen diisi 0 dan ditandai perlunya harga dari pengguna/HSD (langkah 6).
// Output: data/katalog/se-47-2026/katalog.json + metadata.json
// Jalankan: node scripts/ingest/import.mjs   (dari root repo)

import * as fs from "fs";
import * as path from "path";

const ROOT = "/Users/user/Documents/GitHub/monefyi";
const IN = path.join(ROOT, "data/staging/se-47-2026/analisis-lampiran-vi.json");
const OUTDIR = path.join(ROOT, "data/katalog/se-47-2026");
fs.mkdirSync(OUTDIR, { recursive: true });

const SATUAN_KNOWN = new Set(["OH","sak","m²","m3","m³","m","kg","liter","buah","set","titik","unit","hari","paket"]);
const KOEF_MAX = 1000;
const satuanOk = (s) => !!s && SATUAN_KNOWN.has(String(s).trim());
const inferJenis = (k) => { const kk = String(k).toUpperCase(); if (kk.startsWith("L") || kk.startsWith("T")) return "tenaga"; if (kk.startsWith("A")) return "alat"; return "bahan"; };
const KOMPONEN_KODE_RE = /^[A-Z]\.[A-Za-z0-9]+$/;

const d = JSON.parse(fs.readFileSync(IN, "utf8"));
const rows = d.baris;

const master = new Map();
for (const r of rows) for (const c of r.komponen) if (!master.has(c.kode)) master.set(c.kode, { jenis: c.jenis, satuan: c.satuan });
const kodeFreq = new Map();
for (const r of rows) kodeFreq.set(r.kodePekerjaan, (kodeFreq.get(r.kodePekerjaan) || 0) + 1);

const komponen = [];
for (const [kode, info] of master) {
  komponen.push({
    kode, uraian: kode, jenis: info.jenis, satuan: info.satuan || "OH",
    harga: 0, wilayah: "Indonesia", tanggalBerlaku: "2026-11-27",
    sumber: "SE 47/SE/Dk/2026 Lampiran VI (koefisien AHSP; harga dari pengguna/HSD)",
  });
}

const analisis = [];
const ditolak = [];
const needsReview = [];
for (const r of rows) {
  const reasons = [];
  if (kodeFreq.get(r.kodePekerjaan) > 1) reasons.push("kode ganda");
  if (r.needs_review) { needsReview.push(r); continue; }
  if (!r.kodePekerjaan || !r.uraianPekerjaan) reasons.push("kode/uraian kosong");
  if (!satuanOk(r.satuanPekerjaan)) reasons.push("satuan pekerjaan tidak dikenal");
  if (!r.komponen || r.komponen.length === 0) reasons.push("tidak ada komponen");
  let hasTenaga = false;
  for (const c of r.komponen) {
    if (!master.has(c.kode)) reasons.push("komponen tanpa master: " + c.kode);
    if (!(c.koefisien > 0) || c.koefisien > KOEF_MAX) reasons.push("koefisien tidak valid: " + c.kode);
    if (!satuanOk(c.satuan)) reasons.push("satuan komponen tidak dikenal: " + c.kode);
    if (c.jenis === "tenaga") hasTenaga = true;
  }
  if (!hasTenaga) reasons.push("analisis tanpa tenaga");
  if (reasons.length) { ditolak.push({ ...r, alasan: reasons }); continue; }
  analisis.push({
    id: r.kodePekerjaan,
    pekerjaanId: r.kodePekerjaan,
    uraian: r.uraianPekerjaan,
    satuan: r.satuanPekerjaan,
    komponen: r.komponen.map((c) => ({ komponenId: c.kode, koefisien: c.koefisien, ...(c.waste ? { waste: c.waste } : {}) })),
    sumber: { regulasi: "SE 47/SE/Dk/2026", tahun: 2026, halaman: r.halaman },
    keyakinan: "belum",
  });
}

const katalog = {
  versiKatalog: "SE-47-2026",
  status: "draft",
  sumber: "SE 47/SE/Dk/2026 Lampiran VI",
  importedAt: "2026-11-27",
  catatan: "AHSP hanya menyimpan koefisien. Harga komponen = 0 (belum diisi); wajib diisi dari input pengguna/HSD sebelum pakai. Katalog lama (CONTOH) tidak dihapus; versi berdampingan.",
  komponen,
  analisis,
  workItems: [],
};

fs.writeFileSync(path.join(OUTDIR, "katalog.json"), JSON.stringify(katalog, null, 2));
const dataset = {
  id: "ds-se-47-2026",
  name: "AHSP SE 47/SE/Dk/2026 Lampiran VI (Cipta Karya)",
  year: 2026, region: "Indonesia", effectiveDate: "2026-11-27",
  source: "SE 47/SE/Dk/2026 Lampiran VI",
  analysisCount: analisis.length,
  verifiedPercent: 0,
  importedAt: "2026-11-27",
  sample: false,
  status: "draft",
  versiKatalog: "SE-47-2026",
  komponenCount: komponen.length,
  ditolakCount: ditolak.length,
  needsReviewCount: needsReview.length,
};
fs.writeFileSync(path.join(OUTDIR, "metadata.json"), JSON.stringify(dataset, null, 2));
console.log(JSON.stringify({
  versiKatalog: "SE-47-2026", status: "draft",
  komponenDikatalog: komponen.length,
  analisisDikatalog: analisis.length,
  ditolak: ditolak.length,
  needsReview: needsReview.length,
  outputDir: OUTDIR,
}, null, 2));
