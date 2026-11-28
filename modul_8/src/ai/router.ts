import { z } from "zod";
import type { Finishing, RoofType } from "../data/types";
import { CONFIG } from "../data/config";

export const intentSchema = z.object({
  intent: z.enum(["buat_baru", "cari_proyek", "buka_proyek", "ubah_proyek", "tanya", "tidak_jelas"]),
  slots: z.object({
    tipe: z.string().optional(),
    luas: z.number().positive().optional(),
    luas_tanah: z.number().positive().optional(),
    lantai: z.number().int().min(1).max(9).optional(),
    atap: z.enum(["pelana", "perisai", "limasan", "datar"]).optional(),
    nama: z.string().optional(),
    lokasi: z.string().optional(),
    kamar_tidur: z.number().int().min(0).max(20).optional(),
    kamar_mandi: z.number().int().min(0).max(20).optional(),
    finishing: z.enum(["standar", "menengah", "premium"]).optional(),
    carport: z.boolean().optional(),
    query: z.string().optional(),
  }),
  clarification: z.string().optional(),
  basis: z.enum(["aturan_bahasa", "ai"]).default("aturan_bahasa"),
  note: z.string().optional(),
});

export type IntentResult = z.infer<typeof intentSchema>;
export type Slots = IntentResult["slots"];

const UNITS: Record<string, number> = { nol: 0, satu: 1, se: 1, dua: 2, tiga: 3, empat: 4, lima: 5, enam: 6, tujuh: 7, delapan: 8, sembilan: 9 };

/** Ubah angka berbentuk kata ("empat puluh lima", "tiga", "seratus dua puluh") menjadi digit. */
export function normalizeNumbers(text: string): string {
  const words = text.split(/(\s+)/);
  const out: string[] = [];
  let total = 0, cur = 0, active = false;
  const flush = () => {
    if (active) {
      // buang spasi yang sudah terdorong di antara kata angka
      while (out.length && /^\s+$/.test(out[out.length - 1])) out.pop();
      if (out.length) out.push(" ");
      out.push(String(total + cur));
    }
    total = 0; cur = 0; active = false;
  };
  for (const raw of words) {
    if (/^\s+$/.test(raw)) { if (!active) out.push(raw); continue; }
    const w = raw.toLowerCase().replace(/[.,!?]$/, "");
    const trailing = raw.length > w.length ? raw.slice(w.length) : "";
    let handled = true;
    if (w in UNITS && w !== "se") cur += UNITS[w];
    else if (w === "sepuluh") cur += 10;
    else if (w === "sebelas") cur += 11;
    else if (w === "seratus") total += 100;
    else if (w === "seribu") total += 1000;
    else if (w === "belas" && active) cur += 10;
    else if (w === "puluh" && active) cur *= 10;
    else if (w === "ratus" && active) { total += cur * 100; cur = 0; }
    else handled = false;
    if (handled) {
      active = true;
      if (trailing) { flush(); out.push(trailing); }
      continue;
    }
    const wasActive = active;
    flush();
    if (wasActive) out.push(" ");
    out.push(raw);
  }
  flush();
  return out.join("").replace(/\s+/g, " ").trim();
}

const CITY_ALIASES: Record<string, string> = { jogja: "Yogyakarta", yogya: "Yogyakarta", jogjakarta: "Yogyakarta", jkt: "Jakarta", sby: "Surabaya", bdg: "Bandung", smg: "Semarang", bali: "Denpasar", mks: "Makassar", bpn: "Balikpapan" };
const CITIES = Object.keys(CONFIG.regionIndex).filter((c) => c !== "Lainnya");

export function extractSlots(input: string): Slots {
  let text = normalizeNumbers(input).toLowerCase();
  const slots: Slots = {};

  const tipe = text.match(/\b(?:tipe|type|tp)\.?\s*[-:]?\s*(\d{2,3})(?:\s*\/\s*(\d{2,4}))?/);
  if (tipe) {
    slots.tipe = tipe[1];
    slots.luas = Number(tipe[1]);
    if (tipe[2]) slots.luas_tanah = Number(tipe[2]);
    text = text.replace(tipe[0], " ");
  }
  const land = text.match(/(?:tanah|lahan|kavling|kaveling)\s*(?:nya\s*)?(?:seluas|luas|ukuran)?\s*(?:sekitar|kira-kira|kurang lebih|±)?\s*(\d{2,4})\s*(?:m2|m²|meter persegi|meter|m)?/);
  if (land) { slots.luas_tanah = Number(land[1]); text = text.replace(land[0], " "); }
  const dim = text.match(/(\d{1,2}(?:[.,]\d)?)\s*[x×]\s*(\d{1,2}(?:[.,]\d)?)\s*(?:m|meter)?/);
  if (dim && !slots.luas) { slots.luas = Math.round(Number(dim[1].replace(",", ".")) * Number(dim[2].replace(",", "."))); text = text.replace(dim[0], " "); }
  if (!slots.luas) {
    const area = text.match(/(?:luas(?:\s*bangunan)?|ukuran)\s*(?:sekitar|kira-kira|kurang lebih|±)?\s*(\d{2,3})/) ?? text.match(/(?:sekitar|kira-kira|kurang lebih|±)?\s*(\d{2,3})\s*(?:m2|m²|meter persegi|meter|mtr|m)\b/);
    if (area) slots.luas = Number(area[1]);
  }
  const floor = text.match(/(\d)\s*(?:lantai|lt|tingkat)\b/) ?? text.match(/\blantai\s*(\d)\b/);
  if (floor) slots.lantai = Number(floor[1]);
  else if (/\bbertingkat\b|\brumah tingkat\b/.test(text)) slots.lantai = 2;
  const bath = text.match(/(\d+)\s*(?:kamar mandi|kmr mandi|km|wc|toilet)\b/);
  if (bath) slots.kamar_mandi = Number(bath[1]);
  const bed = text.match(/(\d+)\s*(?:kamar tidur|kmr tidur|kt\b|kamar(?!\s*mandi))/);
  if (bed) slots.kamar_tidur = Number(bed[1]);
  const roof = text.match(/\b(pelana|perisai|limasan|datar|dak beton|dak|flat)\b/);
  if (roof) slots.atap = (["dak beton", "dak", "flat"].includes(roof[1]) ? "datar" : roof[1]) as RoofType;
  const fin = text.match(/\b(standar|standard|sederhana|ekonomis|hemat|menengah|sedang|premium|mewah|elegan)\b/);
  if (fin) slots.finishing = (/(standar|standard|sederhana|ekonomis|hemat)/.test(fin[1]) ? "standar" : /(menengah|sedang)/.test(fin[1]) ? "menengah" : "premium") as Finishing;
  const city = CITIES.find((c) => new RegExp(`\\b${c.toLowerCase()}\\b`).test(text));
  const alias = Object.keys(CITY_ALIASES).find((a) => new RegExp(`\\b${a}\\b`).test(text));
  if (city) slots.lokasi = city;
  else if (alias) slots.lokasi = CITY_ALIASES[alias];
  if (/\b(carport|garasi|kanopi mobil)\b/.test(text)) slots.carport = true;
  const name = input.match(/\b(pak|bu|bapak|ibu|mas|mbak|bang)\s+([A-Za-z][\w'-]*)/i);
  if (name) slots.nama = `${name[1][0].toUpperCase()}${name[1].slice(1).toLowerCase()} ${name[2][0].toUpperCase()}${name[2].slice(1)}`;
  return slots;
}

const has = (slots: Slots, keys: (keyof Slots)[]) => keys.some((k) => slots[k] !== undefined);

export function routeIntent(raw: string): IntentResult {
  const text = raw.trim();
  const lower = normalizeNumbers(text).toLowerCase();
  const slots = extractSlots(text);
  const make = (intent: IntentResult["intent"], extra: Partial<IntentResult> = {}) => intentSchema.parse({ intent, slots, basis: "aturan_bahasa", ...extra });
  if (!text) return make("tidak_jelas", { slots: {}, clarification: "Mau buat RAB baru atau mencari proyek yang sudah ada?" });

  if (/^(cari|carikan|temukan|tampilkan|mana)\b/.test(lower) || /\bproyek\b.*\bmana\b/.test(lower) || (/^lihat\b/.test(lower) && /proyek/.test(lower))) {
    const query = text.replace(/^(cari(kan)?|temukan|tampilkan|lihat|mana)\s+(semua\s+)?(proyek|rab)?\s*/i, "").trim();
    return make("cari_proyek", { slots: { ...slots, query } });
  }
  if (/^buka\b/.test(lower)) return make("buka_proyek", { slots: { ...slots, query: text.replace(/^buka\s+(proyek\s+|rab\s+)?/i, "").trim() } });
  if (/^(ubah|ganti|edit|perbarui|update|revisi)\b/.test(lower)) {
    if (!has(slots, ["luas", "lantai", "atap", "finishing", "kamar_tidur", "kamar_mandi", "lokasi"])) return make("ubah_proyek", { clarification: "Bagian mana yang mau diubah — luas, lantai, atap, atau finishing?" });
    return make("ubah_proyek");
  }
  const createVerb = /\b(buat|buatkan|bikin|bikinin|hitung|hitungkan|estimasi|rencana|rencanakan|rab|anggaran|bangun|membangun)\b/.test(lower);
  const startsWithCreate = /^(buat|buatkan|bikin|bikinin|hitung|hitungkan|estimasi|rencana|rencanakan)\b/.test(lower);
  if (!startsWithCreate && (/^(berapa|apa|apakah|bagaimana|gimana|kenapa|mengapa|jelaskan)\b/.test(lower) || (!createVerb && text.endsWith("?")))) {
    return make("tanya", { clarification: "Angka rupiah hanya dihitung engine. Mau saya buatkan RAB indikatif dari rencana ini?" });
  }
  const sizeSlots = has(slots, ["luas", "lantai", "kamar_tidur", "kamar_mandi", "atap", "finishing", "tipe"]);
  if (createVerb || (/\brumah\b/.test(lower) && sizeSlots) || has(slots, ["luas", "tipe"])) return make("buat_baru");
  if (slots.nama) return make("tidak_jelas", { clarification: `Mau membuat RAB baru untuk ${slots.nama} atau mencari proyek ${slots.nama}?` });
  if (sizeSlots) return make("tidak_jelas", { clarification: "Ini untuk RAB rumah baru? Sebutkan juga kira-kira luasnya, mis. “rumah 60 m²”." });
  return make("tidak_jelas", { clarification: "Saya belum yakin maksudnya. Coba: “buat RAB rumah tipe 45” atau “cari proyek Pak Budi”." });
}

export function parseAiIntentPayload(payload: unknown): IntentResult {
  const parsed = intentSchema.safeParse(payload);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new Error(`Output AI perlu input manual: ${first.path.join(".") || "intent"}: ${first.message}`);
  }
  return { ...parsed.data, basis: "ai" };
}
