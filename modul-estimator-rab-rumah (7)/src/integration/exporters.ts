import type { Komponen, Project, RabResult } from "../data/types";
import { priceRows } from "./pricePresentation";
import { SCHEMA_VERSION } from "../data/schema";
import { formatDate, rupiah, terbilangRupiah } from "../engine/money";
import { floorPlanSvg, isometricSvg } from "../geometry/svg";

const DISCLAIMER = "RAB indikatif bukan penawaran mengikat; hitung ulang bila gambar kerja berbeda.";

function safeName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "proyek";
}

export function downloadText(filename: string, content: string, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function projectJsonEnvelope(projects: Project[], komponen: Komponen[], extra: object = {}) {
  return JSON.stringify({ schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), projects, komponen, disclaimer: DISCLAIMER, ...extra }, null, 2);
}

export function projectJson(project: Project, rab: RabResult) {
  return projectJsonEnvelope([project], [], { hasilRab: { pricing: rab.rap, overheadMode: rab.overheadMode, total: rab.total, p10: rab.p10, p90: rab.p90, label: rab.label, items: rab.items } });
}

export function rabCsv(project: Project, rab: RabResult): string {
  const head = ["Paket", "Uraian", "Satuan", "Volume", "Harga langsung per satuan", "Biaya langsung", "Harga satuan penawaran", "Jumlah penawaran", "Rumus", "Kelas sumber", "Keyakinan"];
  const rows = rab.items.map((item) => [item.packageLabel, item.uraian, item.satuan, String(item.volume), String(item.directUnitPrice ?? item.unitPrice), String(item.directAmount ?? item.amount), String(item.unitPrice), String(item.amount), item.rumus, item.kelasSumber, item.keyakinan]);
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const totals = [['Proyek', project.name], ['Lokasi', project.location], ['Label', rab.label], ['Mode overhead', rab.overheadMode],
    ...priceRows(rab.rap).map(([label, amount]) => [label, String(amount)]), ['Margin sebelum PPN', String(rab.rap.margin)],
    ['P10', String(rab.p10)], ['P90', String(rab.p90)], [DISCLAIMER]];
  return [head, ...rows, [], ...totals].map(row => row.map(escape).join(';')).join('\r\n');
}

export function whatsappSummary(project: Project, rab: RabResult): string {
  return [
    `*${project.name}*`,
    `${project.model.location} · ${project.model.area} m² · ${project.model.floors} lantai`,
    `Total ${rab.label === "INDIKATIF" ? "indikatif" : "RAB detail"}: *${rupiah(rab.total)}*`,
    `Harga jual sebelum PPN: ${rupiah(rab.rap.sellingPrice)}`,
    `PPN${rab.rap.ppnEnabled ? "" : " (nonaktif)"}: ${rupiah(rab.ppn)}`,
    `Kisaran P10–P90: ${rupiah(rab.p10)} – ${rupiah(rab.p90)}`,
    `Kelengkapan data: ${rab.completeness}% · ${rab.confidence}`,
    "",
    "Paket terbesar:",
    ...[...rab.packages].sort((a, b) => b.amount - a.amount).slice(0, 4).map((pkg) => `• ${pkg.label}: ${rupiah(pkg.amount)}`),
    "",
    DISCLAIMER,
    "Dibuat dengan modul Estimator RAB Rumah.",
  ].join("\n");
}

export function printRab(project: Project, rab: RabResult) {
  const rows = rab.items.length
    ? rab.items.map((item, i) => `<tr><td>${i + 1}</td><td>${escapeHtml(item.uraian)}<small>${escapeHtml(item.packageLabel)} · ${escapeHtml(item.kelasSumber)}</small></td><td>${item.satuan}</td><td style="text-align:right">${item.volume.toLocaleString("id-ID")}</td><td style="text-align:right">${rupiah(item.unitPrice)}</td><td style="text-align:right">${rupiah(item.amount)}</td></tr>`).join("")
    : rab.packages.map((pkg, i) => `<tr><td>${i + 1}</td><td>${escapeHtml(pkg.label)}<small>paket</small></td><td>paket</td><td style="text-align:right">1</td><td style="text-align:right">${pkg.percent}%</td><td style="text-align:right">${rupiah(pkg.amount)}</td></tr>`).join("");
  const html = `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>RAB ${escapeHtml(project.name)}</title>
  <style>
  @page{size:A4;margin:14mm}body{font-family:Arial,sans-serif;color:#0F172A;font-size:11px;line-height:1.5}
  h1{font-size:20px;margin:0 0 2px}h2{font-size:13px;margin:20px 0 6px;color:#157F5F}.muted{color:#5B6B7A}
  .head{display:flex;justify-content:space-between;border-bottom:3px solid #157F5F;padding-bottom:12px}
  .badge{display:inline-block;border:1px solid #CBD5D1;border-radius:20px;padding:3px 9px;font-weight:700;font-size:10px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:14px}.card{border:1px solid #DDE5E1;border-radius:8px;padding:12px}
  table{width:100%;border-collapse:collapse;margin-top:8px}th{text-align:left;background:#F1F5F3;font-size:10px;padding:7px}td{border-bottom:1px solid #E5EAE8;padding:6px;vertical-align:top}
  td small{display:block;color:#5B6B7A;font-size:9px}.total{font-size:18px;font-weight:800;color:#157F5F}
  .split{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:12px}.sign{margin-top:48px;display:flex;justify-content:space-between;text-align:center}
  .warning{background:#FFF7E6;border:1px solid #FCD9A0;padding:8px;border-radius:6px;margin-top:12px}.imgs{display:flex;gap:10px}.imgs>div{flex:1;border:1px solid #E5EAE8;border-radius:8px;padding:6px}.imgs svg{width:100%;height:auto}
  </style></head><body>
  <div class="head"><div><div class="badge">MODUL ESTIMATOR RAB RUMAH</div><h1>${escapeHtml(project.name)}</h1>
  <div class="muted">${escapeHtml(project.location)} · ${project.model.area} m² · ${project.model.floors} lantai · atap ${project.model.roof.type}</div></div>
  <div style="text-align:right"><div class="badge">${rab.label}</div><div class="muted" style="margin-top:6px">${formatDate(new Date().toISOString())}</div></div></div>
  <div class="grid"><div class="card"><div class="muted">Total ${rab.label}</div><div class="total">${rupiah(rab.total)}</div>
  <div class="muted">Kisaran P10–P90: ${rupiah(rab.p10)} – ${rupiah(rab.p90)}<br>Kelengkapan data: ${rab.completeness}% · ${rab.confidence} · ${rab.perM2.toLocaleString("id-ID")}/m²</div></div>
  <div class="card"><b>Terbilang</b><div>${terbilangRupiah(rab.total)}</div><div class="muted" style="margin-top:8px">Tanggal berlaku harga tertua: ${formatDate(rab.items.map((i) => i.priceDate).filter(Boolean).sort()[0] ?? new Date().toISOString())} · ${rab.verifiedPercent}% item terverifikasi</div></div></div>
  <div class="warning"><b>DATA CONTOH — belum untuk RAB nyata.</b> ${DISCLAIMER}</div>
  <div class="imgs" style="margin-top:12px"><div>${isometricSvg(project.model, 500)}</div><div>${floorPlanSvg(project.model, 0, 500)}</div></div>
  <h2>Rincian pekerjaan</h2><table><thead><tr><th>#</th><th>Uraian</th><th>Sat.</th><th style="text-align:right">Volume</th><th style="text-align:right">Harga</th><th style="text-align:right">Jumlah</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="split"><div><h2>Rekap</h2>${rab.packages.map((pkg) => `<div style="display:flex;justify-content:space-between;border-bottom:1px solid #EEF2F0;padding:4px 0"><span>${escapeHtml(pkg.label)}</span><b>${rupiah(pkg.amount)}</b></div>`).join("")}
  <h2>Perhitungan harga</h2>${priceRows(rab.rap).map(([label, value]) => `<div style="display:flex;justify-content:space-between;padding:3px 0"><span>${label}</span><b>${rupiah(value)}</b></div>`).join('')}
  <p class="muted">Mode overhead: ${rab.overheadMode}. Biaya langsung tidak termasuk markup. Margin sebelum PPN: ${rupiah(rab.rap.margin)} (${rab.rap.marginPercent}%).</p></div>
  <div><h2>Asumsi</h2><ul>${Object.entries(project.model.assumptions).map(([key, value]) => `<li>${escapeHtml(key)}: ${escapeHtml(String(value.source))} · ${value.confirmed ? "terkonfirmasi" : "belum dikonfirmasi"}</li>`).join("")}</ul>
  <h2>Termin</h2>${rab.terms.map((term) => `<div style="display:flex;justify-content:space-between;padding:3px 0"><span>${term.label} · ${term.percent}%</span><b>${rupiah(term.amount)}</b></div>`).join("")}</div></div>
  <div class="sign"><div>Disusun oleh<br><br><br>________________<br>Estimator</div><div>Disetujui oleh<br><br><br>________________<br>Pemilik proyek</div></div>
  <p class="muted" style="margin-top:22px;font-size:9px">Dokumen dibuat otomatis. Semua angka rupiah dihitung engine deterministik. ${DISCLAIMER}</p>
  </body></html>`;
  const win = window.open("", "_blank", "noopener,noreferrer");
  if (win) {
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 350);
  } else {
    downloadText(`rab-${safeName(project.name)}.html`, html, "text/html;charset=utf-8");
  }
}

export function priceCsv(komponen: Komponen[]): string {
  const header = ["kode", "uraian", "jenis", "satuan", "harga", "wilayah", "tanggal_berlaku", "sumber"];
  const rows = komponen.map((k) => [k.kode, k.uraian, k.jenis, k.satuan, String(k.harga), k.wilayah, k.tanggalBerlaku.slice(0, 10), k.sumber]);
  return [header, ...rows].map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(";")).join("\r\n");
}

function escapeHtml(value: string): string {
  return value.replace(/[<>&'"]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[char] ?? char));
}
