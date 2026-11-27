// scripts/ingest/parse.mjs
// Parsing tabel analisis AHSP Lampiran VI (se-47-2026-10904.pdf) langsung dari PDF.
// Kolom (koordinat x): uraian ≈95–215 | kode ≈215–245 | satuan ≈245–285 | koefisien/harga ≈290–400.
// Heuristik koefisien: AHSP hanya simpan koefisien (bukan harga). Nilai desimal kecil
// (0 < v < 200) diambil sebagai koefisien; bilangan besar (> 200) adalah harga satuan
// referensi dan diabaikan (tidak diimpor sebagai koefisien).
// Section: A=Tenaga Kerja, B=Bahan, C=Peralatan (x≈82).
// Output: data/staging/se-47-2026/analisis-lampiran-vi.json
// Jalankan: node scripts/ingest/parse.mjs   (dari root repo)

import * as fs from "fs";
import * as path from "path";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";

GlobalWorkerOptions.workerSrc = "file:///Users/user/Documents/GitHub/monefyi/node_modules/pdfjs-dist/build/pdf.worker.mjs";

const ROOT = "/Users/user/Documents/GitHub/monefyi";
const PDF = path.join(ROOT, "data/sources/se-47-2026/se-47-2026-10904.pdf");
const OUT = path.join(ROOT, "data/staging/se-47-2026/analisis-lampiran-vi.json");
const SUMBER = "SE 47/SE/Dk/2026 Lampiran VI";
const TAHUN = 2026;

const KODE_PEKERJAAN_RE = /^(\d+(?:\.\d+){2,})\s+/;
const SATUAN_TOKEN_RE = /\b(m2|m²|m3|m³|kg|liter|buah|set|sak|titik|OH)\b/i;
// Kode komponen AHSP: huruf, titik, alfanumerik (contoh L.01, T.PKJ, B.SMN, A.MOL, L.14a)
const KOMPONEN_KODE_RE = /^[A-Z]\.[A-Za-z0-9]+$/;

const SECTION_RE = /^[ABC]\s*(Tenaga Kerja|Bahan|Peralatan|Alat)\s*$/i;

function normSatuan(s) {
  if (!s) return null;
  const t = String(s).trim().toLowerCase().replace(/²/, "2").replace(/³/, "3").replace(/\./g, "");
  const map = { m2: "m²", m3: "m³", m: "m", kg: "kg", liter: "liter", l: "liter", buah: "buah", set: "set", sak: "sak", titik: "titik", oh: "OH" };
  return map[t] || t;
}

function parseNum(str) {
  if (str == null) return null;
  const s = String(str).trim().replace(",", ".").replace(/\s/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function isKodePekerjaan(str) {
  return KODE_PEKERJAAN_RE.test(str.trim());
}

function extractFields(lineItems) {
  const uraianParts = [];
  let kode = null;
  let satuan = null;
  const nums = []; // {x, v} di range koefisien/harga
  for (const it of lineItems) {
    const x = it.x;
    const str = it.str.trim();
    if (!str) continue;
    if (x < 95) continue;
    if (x >= 95 && x < 215) uraianParts.push(str);
    else if (x >= 215 && x < 245) { if (!kode) kode = str; }
    else if (x >= 245 && x < 285) { if (!satuan) satuan = str; }
    else if (x >= 290 && x <= 400) { const v = parseNum(str); if (v != null) nums.push({ x, v }); }
  }
  // Koefisien = nilai terkecil dalam rentang (0, 200); abaikan harga satuan besar (> 200).
  let koefisien = null;
  const kecil = nums.filter((n) => n.v > 0 && n.v < 200).sort((a, b) => a.v - b.v);
  if (kecil.length) koefisien = kecil[0].v;
  else {
    const besar = nums.filter((n) => n.v >= 200);
    if (besar.length) koefisien = null; // hanya harga tersedia, koefisien tidak terpisah
  }
  return { uraian: uraianParts.join(" ").trim(), kode, satuan: normSatuan(satuan), koefisien, nums };
}

function groupLines(items, tol = 2.5) {
  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
  const lines = [];
  for (const it of sorted) {
    let placed = false;
    for (const line of lines) {
      if (Math.abs(it.y - line.y) <= tol) { line.items.push(it); placed = true; break; }
    }
    if (!placed) lines.push({ y: it.y, items: [it] });
  }
  for (const line of lines) {
    line.items.sort((a, b) => a.x - b.x);
    line.text = line.items.map((i) => i.str.trim()).filter(Boolean).join(" ");
  }
  return lines.sort((a, b) => a.y - b.y);
}

function footerOf(text) {
  const m = text.match(/-\s*(\d{4,6})\s*-/);
  return m ? m[1] : null;
}

function inferJenis(kode) {
  const k = String(kode).toUpperCase();
  if (k.startsWith("L") || k.startsWith("T")) return "tenaga";
  if (k.startsWith("A")) return "alat";
  return "bahan";
}

function finalize(a) {
  const reasons = [];
  if (!a.kodePekerjaan) reasons.push("kode pekerjaan tidak terdeteksi");
  if (!a.uraianPekerjaan) reasons.push("uraian pekerjaan kosong");
  if (!a.satuanPekerjaan) reasons.push("satuan pekerjaan tidak terdeteksi");
  if (a.komponen.length === 0) reasons.push("tidak ada komponen dengan koefisien > 0");
  else {
    for (const c of a.komponen) {
      if (!c.kode) { reasons.push("komponen tanpa kode"); break; }
      if (!(c.koefisien > 0)) { reasons.push(`koefisien ${c.kode} <= 0`); break; }
      if (!c.satuan) { reasons.push(`komponen ${c.kode} tanpa satuan`); break; }
    }
  }
  a.needs_review = reasons.length > 0;
  a.alasanNeedsReview = reasons;
  return a;
}

function handleLine(line, state) {
  const fields = extractFields(line.items);
  const secMatch = line.text.match(SECTION_RE);
  if (secMatch) {
    state.currentSection = secMatch[1].toLowerCase() === "tenaga kerja" ? "tenaga"
      : secMatch[1].toLowerCase() === "bahan" ? "bahan" : "alat";
    return;
  }
      if (/^(\d+(?:\.\d+){2,})\s/.test(line.text)) {
        const m = line.text.match(/^(\d+(?:\.\d+){2,})\s/);
        const kodePekerjaan = m[1];
        let uraian = line.text.slice(m[1].length).trim();
        // Buang referensi kurung di akhir uraian header jika ada
        uraian = uraian.replace(/\s*\(Lihat[^)]*\)\s*$/, "").trim();
        const satuanPekerjaan = normSatuan((uraian.match(SATUAN_TOKEN_RE) || [])[0]) || null;
        if (state.current && state.current.komponen.length > 0) state.rows.push(finalize(state.current));
        state.current = {
          kodePekerjaan,
          uraianPekerjaan: uraian,
          satuanPekerjaan,
          halaman: state.halamanCetak,
          halamanPdf: state.halamanPdf,
          sumber: SUMBER,
          tahun: TAHUN,
          komponen: [],
          needs_review: false,
          alasanNeedsReview: [],
          rawText: line.text,
        };
        state.currentSection = null;
        return;
      }
      if (state.current && fields.kode && KOMPONEN_KODE_RE.test(fields.kode) && fields.koefisien != null && fields.koefisien > 0) {
        const jenis = inferJenis(fields.kode);
    state.current.komponen.push({ kode: fields.kode, jenis, satuan: fields.satuan, koefisien: fields.koefisien, waste: null });
    return;
  }
}

function pageLines(page) {
  return page.getTextContent().then((tc) => {
    const items = tc.items.map((i) => ({ str: i.str, x: i.transform[4], y: i.transform[5] }));
    return groupLines(items);
  });
}

async function main() {
  const buf = fs.readFileSync(PDF);
  const data = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  const pdf = await getDocument({ data }).promise;
  const total = pdf.numPages;
  const state = { rows: [], current: null, currentSection: null, halamanCetak: null, halamanPdf: null };
  let pagesWithTable = 0;
  for (let p = 1; p <= total; p++) {
    const page = await pdf.getPage(p);
    try {
      const lines = await pageLines(page);
      const fullText = lines.map((l) => l.text).join("\n");
      state.halamanCetak = footerOf(fullText);
      state.halamanPdf = p;
      let pageRowCount = 0;
      for (const line of lines) {
        const before = state.rows.length;
        handleLine(line, state);
        if (state.rows.length > before) pageRowCount++;
      }
      if (pageRowCount) pagesWithTable++;
      if (p % 300 === 0) process.stderr.write(`  halaman ${p}/${total} (baris ${state.rows.length})\r`);
    } catch (e) {
      process.stderr.write(`  halaman ${p}: ERROR ${e.message}\n`);
    }
  }
  if (state.current && state.current.komponen.length > 0) state.rows.push(finalize(state.current));
  process.stderr.write(`\nselesai. ${state.rows.length} baris analisis dari ${pagesWithTable} halaman.\n`);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const valid = state.rows.filter((r) => !r.needs_review);
  const out = {
    generatedAt: "2026-11-27",
    sumber: SUMBER,
    tahun: TAHUN,
    fileSumber: "se-47-2026-10904.pdf",
    totalBaris: state.rows.length,
    terdeteksiValid: valid.length,
    needsReview: state.rows.length - valid.length,
    halamanDenganTabel: pagesWithTable,
    baris: state.rows,
  };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(JSON.stringify({
    totalBaris: out.totalBaris,
    valid: out.terdeteksiValid,
    needsReview: out.needsReview,
    halamanDenganTabel: pagesWithTable,
    output: OUT,
  }, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
