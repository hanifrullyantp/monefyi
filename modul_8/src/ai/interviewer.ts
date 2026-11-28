import type { BuildingModel } from "../data/types";
import { CONFIG } from "../data/config";
import { extractSlots, normalizeNumbers } from "./router";

export interface QuestionChip { label: string; value: string; note?: string }

export interface InterviewQuestion {
  id: string;
  slots: string[];
  stage: 1 | 2;
  question: string;
  helper: string;
  chips: QuestionChip[];
  /** Usaha menjawab (konstanta per pertanyaan; 1 = satu ketukan). */
  effort: number;
  /** Pengurangan lebar P10–P90 (rupiah) bila slot dikonfirmasi — dihitung engine. */
  impact: number;
  weight: number;
  freeLabel: string;
}

type Base = Omit<InterviewQuestion, "impact" | "weight">;

export function questionBank(): Base[] {
  return [
    { id: "area", slots: ["area"], stage: 1, effort: 1, question: "Berapa luas bangunan yang direncanakan?", helper: "Perkiraan juga boleh.", chips: [{ label: "36 m²", value: "36" }, { label: "45 m²", value: "45" }, { label: "70 m²", value: "70" }, { label: "100 m²", value: "100" }], freeLabel: "Contoh: sekitar 60 meter" },
    { id: "floors", slots: ["floors"], stage: 1, effort: 1, question: "Rumah ini berapa lantai?", helper: "Memengaruhi struktur, tangga, dan luas atap.", chips: [{ label: "1 lantai", value: "1" }, { label: "2 lantai", value: "2" }], freeLabel: "Contoh: dua lantai" },
    { id: "bedroomsBathrooms", slots: ["bedrooms", "bathrooms"], stage: 1, effort: 1.2, question: "Butuh berapa kamar tidur dan kamar mandi?", helper: "Satu jawaban bisa mengisi dua data sekaligus.", chips: [{ label: "2 tidur · 1 mandi", value: "2 kamar tidur, 1 kamar mandi" }, { label: "3 tidur · 2 mandi", value: "3 kamar tidur, 2 kamar mandi" }, { label: "4 tidur · 2 mandi", value: "4 kamar tidur, 2 kamar mandi" }], freeLabel: "Contoh: tiga kamar, dua kamar mandi, carport" },
    { id: "roof", slots: ["roof"], stage: 1, effort: 1, question: "Bentuk atap seperti apa?", helper: "Pilih yang paling mirip.", chips: [{ label: "Pelana", value: "pelana", note: "dua bidang" }, { label: "Limasan", value: "limasan", note: "empat bidang" }, { label: "Perisai", value: "perisai" }, { label: "Datar", value: "datar", note: "dak beton" }], freeLabel: "Tulis jenis atap" },
    { id: "finishing", slots: ["finishing"], stage: 1, effort: 1, question: "Seberapa nyaman finishing yang kamu bayangkan?", helper: "Menentukan kelas keramik, pintu, cat, dan sanitair.", chips: [{ label: "Standar", value: "standar", note: "hemat, fungsional" }, { label: "Menengah", value: "menengah", note: "paling umum" }, { label: "Premium", value: "premium", note: "material lebih awet" }], freeLabel: "Contoh: menengah saja" },
    { id: "location", slots: ["location"], stage: 2, effort: 1, question: "Di kota mana proyek ini?", helper: "Indeks wilayah membedakan harga tenaga, bahan, dan alat.", chips: ["Yogyakarta", "Jakarta", "Bandung", "Surabaya"].map((c) => ({ label: c, value: c })), freeLabel: "Tulis kota" },
    { id: "landArea", slots: ["landArea"], stage: 2, effort: 1, question: "Berapa luas tanahnya?", helper: "Dipakai untuk pembersihan lahan dan area luar.", chips: [72, 90, 120, 150].map((n) => ({ label: `${n} m²`, value: String(n) })), freeLabel: "Contoh: tanah 100 m²" },
    { id: "foundation", slots: ["foundation"], stage: 2, effort: 1.3, question: "Bagaimana kondisi tanah dan pondasinya?", helper: "Struktur tetap “estimasi struktur” sampai ada gambar.", chips: [{ label: "Tanah biasa · batu kali", value: "batu kali" }, { label: "Perlu footplat", value: "footplat" }, { label: "Tanah lembek", value: "lembek" }], freeLabel: "Ceritakan kondisi tanah" },
    { id: "openings", slots: ["openings"], stage: 2, effort: 1.3, question: "Berapa pintu dan jendela kira-kira?", helper: "Bukaan mengurangi luas dinding.", chips: [{ label: "5 pintu · 6 jendela", value: "5 pintu 6 jendela" }, { label: "7 pintu · 9 jendela", value: "7 pintu 9 jendela" }, { label: "9 pintu · 12 jendela", value: "9 pintu 12 jendela" }], freeLabel: "Contoh: enam pintu delapan jendela" },
    { id: "electrical", slots: ["electrical"], stage: 2, effort: 1, question: "Butuh berapa titik listrik?", helper: "Lampu, saklar, dan stop kontak.", chips: [8, 12, 16].map((n) => ({ label: `${n} titik`, value: String(n) })), freeLabel: "Ketik jumlah titik" },
    { id: "water", slots: ["water"], stage: 2, effort: 1, question: "Berapa titik air yang dibutuhkan?", helper: "Kran, shower, wastafel, dapur, taman.", chips: [3, 5, 7].map((n) => ({ label: `${n} titik`, value: String(n) })), freeLabel: "Ketik jumlah titik air" },
  ];
}

const done = (model: BuildingModel, slots: string[]) => slots.every((s) => model.assumptions[s]?.confirmed || model.assumptions[s]?.answered);

/**
 * Urutan pertanyaan: bobot = (lebar P10–P90 sekarang − lebar bila slot dikonfirmasi) / usaha.
 * widthIf disediakan engine (Monte Carlo yang sama dengan computeRab).
 */
export function rankQuestions(model: BuildingModel, stage: 1 | 2, widthIf: (slots: string[]) => number): InterviewQuestion[] {
  const now = widthIf([]);
  return questionBank()
    .filter((q) => q.stage === stage && !done(model, q.slots))
    .map((q) => {
      const impact = Math.max(0, Math.round(now - widthIf(q.slots)));
      return { ...q, impact, weight: Math.round((impact / q.effort) * 100) / 100 };
    })
    .sort((a, b) => b.weight - a.weight || a.id.localeCompare(b.id));
}

export function questionCounts(model: BuildingModel) {
  const stage1 = questionBank().filter((q) => q.stage === 1);
  return { done: stage1.filter((q) => done(model, q.slots)).length, total: stage1.length };
}

export interface AnswerResult {
  patch: Partial<BuildingModel>;
  confirmedSlots: string[];
  summary: string[];
  understood: boolean;
}

const firstNumber = (v: string) => { const m = v.replace(",", ".").match(/\d+(?:\.\d+)?/); return m ? Number(m[0]) : undefined; };

export function interpretAnswer(question: Base, raw: string): AnswerResult {
  const value = normalizeNumbers(raw).toLowerCase();
  const slots = extractSlots(raw);
  const patch: Partial<BuildingModel> = {};
  const confirmed = new Set<string>();
  const summary: string[] = [];
  const n = firstNumber(value);

  // Isi slot apa pun yang terbaca (jawaban multi-slot).
  if (slots.kamar_tidur !== undefined) { patch.bedrooms = slots.kamar_tidur; confirmed.add("bedrooms"); summary.push(`${slots.kamar_tidur} kamar tidur`); }
  if (slots.kamar_mandi !== undefined) { patch.bathrooms = slots.kamar_mandi; confirmed.add("bathrooms"); summary.push(`${slots.kamar_mandi} kamar mandi`); }
  if (slots.carport) { patch.carport = true; summary.push("carport"); }
  if (slots.atap) { patch.roof = { type: slots.atap, pitch: slots.atap === "datar" ? 2 : 30, overhang: 0.6 }; confirmed.add("roof"); summary.push(`atap ${slots.atap}`); }
  if (slots.finishing) { patch.finishing = slots.finishing; confirmed.add("finishing"); summary.push(`finishing ${slots.finishing}`); }
  if (slots.lokasi) { patch.location = slots.lokasi; confirmed.add("location"); summary.push(slots.lokasi); }
  if (slots.lantai && slots.lantai <= CONFIG.reviewFloors) { patch.floors = slots.lantai; confirmed.add("floors"); summary.push(`${slots.lantai} lantai`); }
  if (slots.luas_tanah) { patch.landArea = slots.luas_tanah; confirmed.add("landArea"); summary.push(`tanah ${slots.luas_tanah} m²`); }
  if (slots.luas && question.id !== "landArea") { patch.area = slots.luas; confirmed.add("area"); summary.push(`luas ${slots.luas} m²`); }

  // Jawaban singkat untuk pertanyaan aktif (mis. chip "45" atau "2").
  switch (question.id) {
    case "area": if (!confirmed.has("area") && n && n >= 18 && n <= 300) { patch.area = n; confirmed.add("area"); summary.push(`luas ${n} m²`); } break;
    case "floors": if (!confirmed.has("floors") && (n === 1 || n === 2 || n === 3)) { patch.floors = n; confirmed.add("floors"); summary.push(`${n} lantai`); } break;
    case "landArea": if (!confirmed.has("landArea") && n && n >= 18) { patch.landArea = n; confirmed.add("landArea"); summary.push(`tanah ${n} m²`); } break;
    case "foundation":
      if (/lembek|buruk|rawa|gambut/.test(value)) { patch.soil = "buruk"; patch.foundation = "footplat"; confirmed.add("foundation"); summary.push("tanah lembek, footplat"); }
      else if (/footplat|telapak/.test(value)) { patch.foundation = "footplat"; confirmed.add("foundation"); summary.push("pondasi footplat"); }
      else if (/batu kali|biasa|keras|baik/.test(value)) { patch.foundation = "batu_kali"; patch.soil = "sedang"; confirmed.add("foundation"); summary.push("pondasi batu kali"); }
      break;
    case "openings": {
      const d = value.match(/(\d+)\s*pintu/); const w = value.match(/(\d+)\s*jendela/);
      const nums = value.match(/\d+/g)?.map(Number) ?? [];
      const doors = d ? Number(d[1]) : nums[0]; const windows = w ? Number(w[1]) : nums[1];
      if (doors && windows) { patch.doors = doors; patch.windows = windows; confirmed.add("openings"); summary.push(`${doors} pintu, ${windows} jendela`); }
      break;
    }
    case "electrical": if (n && n > 0) { patch.electricalPoints = Math.round(n); confirmed.add("electrical"); summary.push(`${Math.round(n)} titik listrik`); } break;
    case "water": if (n && n > 0) { patch.waterPoints = Math.round(n); confirmed.add("water"); summary.push(`${Math.round(n)} titik air`); } break;
    case "bedroomsBathrooms": break;
  }
  const answeredActive = question.slots.some((s) => confirmed.has(s));
  return { patch, confirmedSlots: [...confirmed], summary: [...new Set(summary)], understood: answeredActive };
}
