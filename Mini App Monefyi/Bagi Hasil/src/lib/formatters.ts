import type { JenisAkad } from "@/types/bagi-hasil";

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number, decimals = 2): string {
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value) + "%";
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}

export function parseNumberInput(value: string): number {
  if (!value || value.trim() === "") return 0;
  const cleaned = value.replace(/[^0-9,.-]/g, "").replace(",", ".");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

export function formatWeight(value: number, satuan: string): string {
  return `${formatNumber(value)} ${satuan}`;
}

export interface PihakData {
  nama: string;
  peran: string;
  modal?: number;
  nisbahKeuntungan: number;
  nisbahKerugian: number;
  kontribusi?: string;
}

export interface NisbahData {
  pihak: { nama: string; persen: number; rupiah: number }[];
}

export function generateRingkasanText(
  jenisAkad: JenisAkad,
  namaAkad: string,
  namaArab: string,
  pihak: PihakData[],
  nisbah: NisbahData,
  estimasi: number,
  skenarioData: { label: string; pihak: { nama: string; nilai: number }[] }[],
  ketentuan: string,
  dalilUtama: string
): string {
  const tanggal = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const line = "═".repeat(42);
  const dash = "─".repeat(42);

  let pihakText = "";
  pihak.forEach((p, i) => {
    pihakText += `\n[Pihak ${i + 1}] ${p.nama} — ${p.peran}\n`;
    if (p.modal !== undefined) {
      pihakText += `  Modal           : ${formatCurrency(p.modal)}\n`;
    }
    if (p.kontribusi) {
      pihakText += `  Kontribusi      : ${p.kontribusi}\n`;
    }
    pihakText += `  Nisbah Laba     : ${formatPercent(p.nisbahKeuntungan)}\n`;
    pihakText += `  Tanggungan Rugi : ${formatPercent(p.nisbahKerugian)}\n`;
  });

  let estimasiText = "";
  nisbah.pihak.forEach((p) => {
    estimasiText += `  ${p.nama.padEnd(18)}: ${formatCurrency(p.rupiah)} (${formatPercent(p.persen)})\n`;
  });

  let skenarioText = "";
  skenarioData.forEach((s) => {
    const pihakLine = s.pihak
      .map((p) => `${p.nama}: ${formatCurrency(p.nilai)}`)
      .join(" | ");
    skenarioText += `  ${s.label.padEnd(10)}: ${pihakLine}\n`;
  });

  return `${line}
RINGKASAN AKAD BAGI HASIL ISLAMI
Monefyi — Kalkulator Bagi Hasil
Dibuat: ${tanggal}
${line}
Jenis Akad   : ${namaAkad} (${namaArab})
Dasar Hukum  : ${dalilUtama}
${dash}
PIHAK YANG BERSEPAKAT:
${pihakText}
${dash}
ESTIMASI BAGI HASIL:
  Estimasi Pendapatan : ${formatCurrency(estimasi)}
${estimasiText}
${dash}
KETENTUAN KERUGIAN:
  ${ketentuan}
${dash}
SKENARIO:
${skenarioText}
${line}
⚠ Hasil bersifat simulasi dan estimasi.
  Konsultasikan dengan ulama atau ahli
  hukum Islam untuk kepastian akad.
  Disarankan akad dibuat secara tertulis.
${line}`;
}
