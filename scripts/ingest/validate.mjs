// scripts/ingest/validate.mjs
// Validator staging AHSP Lampiran VI.
// Aturan penolakan: satuan tidak dikenal, koefisien <=0 / tidak wajar, komponen tanpa
// master, analisis tanpa tenaga, kode ganda. Baris needs_review dipisahkan (ditangguhkan).
// Output: data/staging/se-47-2026/validasi-lampiran-vi.json
// Jalankan: node scripts/ingest/validate.mjs   (dari root repo)

import * as fs from "fs";
import * as path from "path";

const ROOT = "/Users/user/Documents/GitHub/monefyi";
const IN = path.join(ROOT, "data/staging/se-47-2026/analisis-lampiran-vi.json");
const OUT = path.join(ROOT, "data/staging/se-47-2026/validasi-lampiran-vi.json");
const SATUAN_KNOWN = new Set([
  "OH","sak","m²","m3","m³","m","kg","liter","buah","set","titik","unit","hari","paket",
]);
const KOEF_MIN = 0;
const KOEF_MAX = 1000; // di atas ini dianggap tidak wajar untuk koefisien AHSP

function satuanOk(s) {
  if (!s) return false;
  const t = String(s).trim();
  return SATUAN_KNOWN.has(t);
}

function main() {
  const d = JSON.parse(fs.readFileSync(IN, "utf8"));
  const rows = d.baris;

  // Bangun master komponen dari semua komponen yang muncul di staging (kode unik).
  const master = new Map();
  for (const r of rows) {
    for (const c of r.komponen) {
      if (!master.has(c.kode)) master.set(c.kode, { jenis: c.jenis, satuan: c.satuan });
    }
  }

  const accepted = [];
  const rejected = [];
  const needsReview = [];

  // Frekuensi kode untuk deteksi kode ganda di seluruh staging
  const kodeFreq = new Map();
  for (const r of rows) kodeFreq.set(r.kodePekerjaan, (kodeFreq.get(r.kodePekerjaan) || 0) + 1);

  for (const r of rows) {
    const reasons = [];
    if (kodeFreq.get(r.kodePekerjaan) > 1) reasons.push("kode ganda: " + r.kodePekerjaan);

    if (r.needs_review) {
      needsReview.push({ ...r, kategori: "needs_review", alasan: r.alasanNeedsReview });
      continue;
    }

    if (!r.kodePekerjaan || !r.uraianPekerjaan) reasons.push("kode/uraian pekerjaan kosong");
    if (!satuanOk(r.satuanPekerjaan)) reasons.push("satuan pekerjaan tidak dikenal: " + r.satuanPekerjaan);
    if (!r.komponen || r.komponen.length === 0) reasons.push("tidak ada komponen");
    let hasTenaga = false;
    for (const c of r.komponen) {
      if (!master.has(c.kode)) reasons.push("komponen tanpa master: " + c.kode);
      if (!(c.koefisien > 0)) reasons.push("koefisien <= 0: " + c.kode);
      else if (c.koefisien > KOEF_MAX) reasons.push("koefisien tidak wajar: " + c.kode + "=" + c.koefisien);
      if (!satuanOk(c.satuan)) reasons.push("satuan komponen tidak dikenal: " + c.kode + "=" + c.satuan);
      if (c.jenis === "tenaga") hasTenaga = true;
    }
    if (!hasTenaga) reasons.push("analisis tanpa tenaga");

    const record = { ...r, kategori: reasons.length ? "ditolak" : "diterima", alasan: reasons };
    if (reasons.length) rejected.push(record);
    else accepted.push(record);
  }

  // Sampel acak 10% dari diterima untuk dicek manual
  const sampleSize = Math.ceil(accepted.length * 0.1);
  const shuffled = accepted.slice().sort(() => 0.5 - Math.random());
  const sample = shuffled.slice(0, sampleSize);

  const report = {
    generatedAt: "2026-11-27",
    sumber: d.sumber,
    tahun: d.tahun,
    totalDibaca: rows.length,
    diterima: accepted.length,
    ditolak: rejected.length,
    needsReviewCount: needsReview.length,
    needsReviewDetail: needsReview.map((r) => ({ kode: r.kodePekerjaan, uraian: r.uraianPekerjaan, halaman: r.halaman, alasan: r.alasan })),
    sampelManual: sample.length,
    masterKomponen: master.size,
    terima: accepted.map((r) => ({ kode: r.kodePekerjaan, uraian: r.uraianPekerjaan, satuan: r.satuanPekerjaan, halaman: r.halaman, nkomponen: r.komponen.length })),
    tolak: rejected.map((r) => ({ kode: r.kodePekerjaan, uraian: r.uraianPekerjaan, alasan: r.alasan })),
    sampel: sample.map((r) => ({ kode: r.kodePekerjaan, uraian: r.uraianPekerjaan, satuan: r.satuanPekerjaan, halaman: r.halaman })),
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({
    totalDibaca: report.totalDibaca,
    diterima: report.diterima,
    ditolak: report.ditolak,
    needsReview: report.needsReview,
    sampelManual: report.sampelManual,
    masterKomponen: report.masterKomponen,
    output: OUT,
  }, null, 2));
}

try {
  main();
} catch (e) {
  console.error(e);
  process.exit(1);
}
