import type { AppSettings, BuildingModel, RabResult } from "../data/types";
import { CONFIG } from "../data/config";
import { deriveGeometry } from "../geometry/derived";

export interface CheckFinding {
  id: string;
  severity: "error" | "warning" | "info";
  title: string;
  detail: string;
  suggestion: string;
  action: "perbaiki" | "tambahkan" | "tinjau";
}

/** Aturan tanpa AI: item terlewat, cek silang volume vs geometri, kewajaran biaya per m² (baseM2 hanya pembanding). */
export function runChecks(model: BuildingModel, rab: RabResult, settings: AppSettings): CheckFinding[] {
  const findings: CheckFinding[] = [];
  const g = deriveGeometry(model);
  const byWork = new Map(rab.items.map((item) => [item.workItemId, item]));

  if (g.netWallArea <= 0) findings.push({ id: "dinding-negatif", severity: "error", title: "Luas dinding bersih nol", detail: "Luas bukaan melebihi luas dinding.", suggestion: "Periksa jumlah pintu/jendela.", action: "perbaiki" });
  if (g.wetArea <= 0) findings.push({ id: "area-basah", severity: "warning", title: "Tidak ada area basah", detail: "Pelapis kedap air dan keramik dinding basah tidak terbentuk.", suggestion: "Tambahkan kamar mandi pada denah.", action: "tambahkan" });
  if (!byWork.has("atap.penutup")) findings.push({ id: "atap-terlewat", severity: "error", title: "Penutup atap terlewat", detail: "BOQ tidak memuat penutup atap.", suggestion: "Tambahkan kembali item atap.", action: "tambahkan" });
  const wall = byWork.get("dinding.pasangan");
  if (wall && Math.abs(wall.volume - g.netWallArea) > 0.05) findings.push({ id: "silang-dinding", severity: "warning", title: "Volume dinding beda dengan geometri", detail: `BOQ ${wall.volume} m², geometri ${g.netWallArea} m² (ada override).`, suggestion: "Hapus override bila denah sudah benar.", action: "perbaiki" });
  const base = CONFIG.baseM2[model.finishing];
  if (rab.perM2 < base * CONFIG.reasonableness.min || rab.perM2 > base * CONFIG.reasonableness.max) findings.push({ id: "kewajaran-m2", severity: "warning", title: "Biaya per m² di luar kewajaran", detail: `${rab.perM2.toLocaleString("id-ID")}/m² vs pembanding contoh ${base.toLocaleString("id-ID")}/m².`, suggestion: "Periksa harga komponen dan luas.", action: "tinjau" });
  if (!model.structureConfirmed) findings.push({ id: "struktur", severity: "warning", title: "Struktur masih estimasi", detail: "Pondasi, kolom, balok belum berdasarkan gambar struktur.", suggestion: "Minta review estimator/engineer sebelum pelaksanaan.", action: "tinjau" });
  if (rab.stalePrices > 0) findings.push({ id: "harga-basi", severity: "warning", title: `${rab.stalePrices} harga komponen basi`, detail: `Tanggal berlaku lebih dari ${settings.priceStaleMonths} bulan.`, suggestion: "Perbarui harga di Database harga.", action: "perbaiki" });
  if (settings.ppnPercent <= 0) findings.push({ id: "ppn", severity: "info", title: "PPN 0%", detail: "Output menyatakan tanpa PPN.", suggestion: "Aktifkan bila dikenakan pajak.", action: "tinjau" });
  return findings;
}
