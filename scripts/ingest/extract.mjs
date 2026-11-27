// scripts/ingest/extract.mjs
// Ekstrak teks per halaman dari semua PDF sumber SE 47/SE/Dk/2026 ke staging JSON.
// Dependensi: pdfjs-dist (disertakan dalam node_modules modul_7 / diinstall secara terpisah).
// Jalankan: node scripts/ingest/extract.mjs   (dari root repo)

import * as fs from "fs";
import * as path from "path";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";

GlobalWorkerOptions.workerSrc = "file://" + new URL(
  "../../node_modules/pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).pathname;

const ROOT = "/Users/user/Documents/GitHub/monefyi";
const SRC = path.join(ROOT, "data/sources/se-47-2026");
const OUT = path.join(ROOT, "data/staging/se-47-2026");
fs.mkdirSync(OUT, { recursive: true });

const FILES = [
  { id: "10892", dokumen: "Batang Tubuh" },
  { id: "10894", dokumen: "Lampiran I" },
  { id: "10897", dokumen: "Lampiran II" },
  { id: "10899", dokumen: "Lampiran III" },
  { id: "10901", dokumen: "Lampiran IV" },
  { id: "10903", dokumen: "Lampiran V" },
  { id: "10904", dokumen: "Lampiran VI" },
  { id: "10906", dokumen: "Lampiran VII" },
];

const footerRe = /-\s*(\d{4,6})\s*-/;

function toUint8Array(buf) {
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

function groupByY(items, tol = 2.5) {
  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
  const lines = [];
  for (const it of sorted) {
    let placed = false;
    for (const line of lines) {
      if (Math.abs(it.y - line.y) <= tol) {
        line.items.push(it);
        placed = true;
        break;
      }
    }
    if (!placed) lines.push({ y: it.y, items: [it] });
  }
  for (const line of lines) line.items.sort((a, b) => a.x - b.x);
  return lines.sort((a, b) => a.y - b.y);
}

async function extractFile(file) {
  const pdfPath = path.join(SRC, `se-47-2026-${file.id}.pdf`);
  const stat = fs.statSync(pdfPath);
  const buf = fs.readFileSync(pdfPath);
  const data = toUint8Array(buf);
  const pdf = await getDocument({ data }).promise;
  const total = pdf.numPages;
  const pages = [];
  for (let p = 1; p <= total; p++) {
    const page = await pdf.getPage(p);
    const tc = await page.getTextContent();
    const items = tc.items.map((i) => ({ str: i.str, x: i.transform[4], y: i.transform[5] }));
    const lines = groupByY(items);
    const text = lines.map((l) => l.items.map((i) => i.str).join(" ")).join("\n");
    const m = text.match(footerRe);
    pages.push({ pdfPage: p, halamanCetak: m ? m[1] : null, text });
    if (p % 300 === 0) process.stderr.write(`  ${file.id}: ${p}/${total}\r`);
  }
  process.stderr.write(`  ${file.id}: selesai ${total} halaman\n`);
  return {
    downloadId: file.id,
    dokumen: file.dokumen,
    file: `se-47-2026-${file.id}.pdf`,
    size: stat.size,
    halamanPdf: total,
    halamanCetakAwal: pages[0]?.halamanCetak ?? null,
    halamanCetakAkhir: pages[pages.length - 1]?.halamanCetak ?? null,
    pages,
  };
}

async function main() {
  const manifest = [];
  for (const file of FILES) {
    process.stderr.write(`[extract] ${file.id} ${file.dokumen}\n`);
    const doc = await extractFile(file);
    const outPath = path.join(OUT, `extract-${file.id}.json`);
    fs.writeFileSync(outPath, JSON.stringify(doc, null, 2));
    manifest.push({
      file: doc.file,
      downloadId: doc.downloadId,
      dokumen: doc.dokumen,
      size: doc.size,
      halamanPdf: doc.halamanPdf,
      halamanCetakAwal: doc.halamanCetakAwal,
      halamanCetakAkhir: doc.halamanCetakAkhir,
      halamanTerEkstrak: doc.pages.length,
    });
  }
  fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify({ generatedAt: "2026-11-27", berkas: manifest }, null, 2));
  process.stderr.write("[extract] SELESAI. Manifest ditulis.\n");
  console.log(JSON.stringify(manifest, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
