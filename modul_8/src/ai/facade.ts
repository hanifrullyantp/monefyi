import { z } from "zod";
import type { FacadeSpec, SpecGroupKey, SpecLevel } from "../data/types";
import { FACADE_PALETTES, FACADE_STYLES, defaultFacade } from "../data/spec";
import { assertNoMoneyFromAi } from "./guard";
import { normalizeNumbers } from "./router";

export const facadeSpecSchema = z.object({
  style: z.enum(["minimalis", "tropis", "skandinavia", "klasik_modern", "industrial"]),
  cantilever: z.number().min(0).max(2),
  splitLevel: z.boolean(),
  roofType: z.enum(["pelana", "perisai", "limasan", "datar"]),
  roofPitch: z.number().min(0).max(50),
  overhang: z.number().min(0).max(2),
  canopy: z.boolean(),
  windows: z.enum(["standar", "panjang", "kaca_mati"]),
  louvre: z.boolean(),
  columns: z.number().int().min(0).max(8),
  secondarySkin: z.boolean(),
  balcony: z.boolean(),
  carport: z.enum(["tidak", "terbuka", "tertutup"]),
  fence: z.boolean(),
  accentWall: z.boolean(),
  planter: z.boolean(),
  frontStairs: z.boolean(),
  palette: z.string().refine((id) => FACADE_PALETTES.some((p) => p.id === id), { message: "Palet material di luar daftar tertutup." }),
});

const STYLE_WORDS: [RegExp, FacadeSpec["style"]][] = [
  [/minimalis|modern minimal|bersih/, "minimalis"],
  [/tropis|tropical|resort|bali/, "tropis"],
  [/skandinavia|scandinavian|nordic|japandi/, "skandinavia"],
  [/klasik|classic|mediterania|kolonial/, "klasik_modern"],
  [/industrial|industrial|loft|ekspos/, "industrial"],
];

/**
 * AI/aturan bahasa → FacadeSpec (JSON tervalidasi zod).
 * KOORDINAT & geometri TIDAK dari AI: hanya parameter yang divalidasi daftar tertutup.
 */
export function facadeFromText(text: string, base: FacadeSpec): { spec: FacadeSpec; variations: FacadeSpec[]; note?: string } {
  const t = normalizeNumbers(text).toLowerCase();
  const draft: Record<string, unknown> = { ...base };

  for (const [re, style] of STYLE_WORDS) if (re.test(t)) { draft.style = style; break; }
  const style = draft.style as FacadeSpec["style"];
  const styled = defaultFacade(style, base.balcony ? 2 : 1);
  Object.assign(draft, { roofType: styled.roofType, roofPitch: styled.roofPitch, overhang: styled.overhang, louvre: styled.louvre, secondarySkin: styled.secondarySkin, planter: styled.planter, accentWall: styled.accentWall, columns: styled.columns, palette: styled.palette });

  if (/atap pelana|pelana/.test(t)) { draft.roofType = "pelana"; }
  if (/limasan/.test(t)) draft.roofType = "limasan";
  if (/perisai/.test(t)) draft.roofType = "perisai";
  if (/atap datar|dak|flat/.test(t)) { draft.roofType = "datar"; draft.roofPitch = 3; }
  if (/asimetris|miring/.test(t) && draft.roofType === "pelana") draft.roofPitch = Math.min(45, Number(draft.roofPitch) + 8);
  const pitch = t.match(/kemiringan\s*(\d{1,2})/);
  if (pitch) draft.roofPitch = Math.min(50, Number(pitch[1]));
  if (/overhang (lebar|panjang)|tritisan lebar/.test(t)) draft.overhang = 1.2;
  if (/jendela panjang|jendela horizontal/.test(t)) draft.windows = "panjang";
  if (/kaca mati|full kaca|jendela besar/.test(t)) draft.windows = "kaca_mati";
  if (/roster|louvre|kisi/.test(t)) draft.louvre = true;
  if (/kanopi/.test(t)) draft.canopy = !/tanpa kanopi|buang kanopi/.test(t);
  if (/tanpa kanopi|buang kanopi/.test(t)) draft.canopy = false;
  if (/balkon/.test(t)) draft.balcony = !/tanpa balkon/.test(t);
  if (/carport tertutup|garasi tertutup/.test(t)) draft.carport = "tertutup";
  else if (/carport|garasi/.test(t)) draft.carport = "terbuka";
  if (/tanpa carport|buang carport/.test(t)) draft.carport = "tidak";
  if (/secondary skin|kulit kedua|kisi kayu/.test(t)) draft.secondarySkin = true;
  if (/kolom/.test(t)) { const m = t.match(/(\d)\s*kolom/); draft.columns = m ? Number(m[1]) : 2; }
  if (/pagar/.test(t)) draft.fence = !/tanpa pagar/.test(t);
  if (/planter|tanaman|pot/.test(t)) draft.planter = true;
  if (/tangga depan|undakan/.test(t)) draft.frontStairs = true;
  if (/kantilever|menonjol/.test(t)) { const m = t.match(/kantilever\s*(\d(?:[.,]\d)?)/); draft.cantilever = m ? Number(m[1].replace(",", ".")) : 0.8; }
  if (/split level|beda tinggi/.test(t)) draft.splitLevel = true;
  const pal = FACADE_PALETTES.find((p) => t.includes(p.label.toLowerCase().split(" ")[0]) || t.includes(p.id.replace("-", " ")));
  if (pal) draft.palette = pal.id;

  assertNoMoneyFromAi(draft);
  const parsed = facadeSpecSchema.safeParse(draft);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new Error(`Spesifikasi tampak perlu input manual: ${issue.path.join(".")} — ${issue.message}`);
  }
  const spec = parsed.data as FacadeSpec;
  const variations: FacadeSpec[] = [
    spec,
    facadeSpecSchema.parse({ ...spec, windows: spec.windows === "panjang" ? "kaca_mati" : "panjang", louvre: !spec.louvre }),
    facadeSpecSchema.parse({
      ...spec,
      roofType: spec.roofType === "pelana" ? "limasan" : "pelana",
      roofPitch: spec.roofType === "pelana" ? 35 : 30,
      palette: FACADE_PALETTES.find((p) => p.id !== spec.palette && p.style.includes(spec.style))?.id ?? spec.palette,
      secondarySkin: !spec.secondarySkin,
    }),
  ];
  return { spec, variations };
}

/* ---------- Aksi chat terstruktur ---------- */

export const chatActionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("ubah_spesifikasi"), group: z.enum(["struktur", "dinding", "atap", "plafon", "lantai", "kusen", "cat", "sanitair", "listrik", "air", "tampak", "kitchen"]), level: z.enum(["ekonomis", "standar", "menengah", "premium"]) }),
  z.object({ kind: z.literal("ubah_denah"), typology: z.enum(["linear", "L", "courtyard", "split", "U"]).nullable(), seedBaru: z.boolean() }),
  z.object({ kind: z.literal("ubah_tampak"), teks: z.string().min(3).max(240) }),
  z.object({ kind: z.literal("target_harga"), jenis: z.enum(["hargaJual", "margin", "modal"]), nilai: z.number().positive() }),
  z.object({ kind: z.literal("jelaskan"), topik: z.enum(["total", "rap", "margin", "denah", "spesifikasi", "optimizer", "kisaran"]) }),
  z.object({ kind: z.literal("opsi_lain") }),
  z.object({ kind: z.literal("tidak_dipahami"), pesan: z.string() }),
]);

export type ChatAction = z.infer<typeof chatActionSchema>;

const GROUP_WORDS: [RegExp, SpecGroupKey][] = [
  [/struktur|pondasi|kolom|sloof|balok/, "struktur"],
  [/dinding|bata|plester/, "dinding"],
  [/atap|genteng|rangka atap/, "atap"],
  [/plafon|gipsum|gypsum/, "plafon"],
  [/lantai|keramik|granit/, "lantai"],
  [/kusen|pintu|jendela/, "kusen"],
  [/cat|pengecatan/, "cat"],
  [/sanitair|kloset|wastafel|shower/, "sanitair"],
  [/listrik|lampu|titik listrik/, "listrik"],
  [/air|pipa|tandon/, "air"],
  [/tampak|fasad|kanopi|balkon|pagar/, "tampak"],
  [/kitchen|dapur set|lemari dapur/, "kitchen"],
];

const LEVEL_WORDS: [RegExp, SpecLevel][] = [
  [/murah|hemat|ekonomis|turunkan|lebih rendah/, "ekonomis"],
  [/standar|biasa/, "standar"],
  [/menengah|sedang|lebih baik|naikkan/, "menengah"],
  [/premium|mewah|terbaik|tertinggi/, "premium"],
];

/** Perintah bahasa → aksi terstruktur. Tidak pernah menghasilkan rupiah. */
export function parseChatAction(raw: string): ChatAction {
  const t = normalizeNumbers(raw).toLowerCase();
  const nums = t.match(/(\d[\d.,]*)\s*(juta|jt|miliar|m)?/);
  const parseAmount = (): number | null => {
    if (!nums) return null;
    const n = Number(nums[1].replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(n)) return null;
    if (/juta|jt/.test(nums[2] ?? "")) return Math.round(n * 1_000_000);
    if (/miliar|m\b/.test(nums[2] ?? "")) return Math.round(n * 1_000_000_000);
    return n > 10_000 ? Math.round(n) : Math.round(n * 1_000_000);
  };

  if (/^(jelaskan|apa itu|kenapa|mengapa|maksud)/.test(t) || /jelaskan/.test(t)) {
    const topik = /rap|modal/.test(t) ? "rap" : /margin|untung|profit/.test(t) ? "margin" : /denah|ruang|layout/.test(t) ? "denah"
      : /spesifikasi|mutu|material/.test(t) ? "spesifikasi" : /optimizer|efisien|hemat/.test(t) ? "optimizer"
      : /kisaran|rentang|p10|p90/.test(t) ? "kisaran" : "total";
    return chatActionSchema.parse({ kind: "jelaskan", topik });
  }
  if (/denah lain|coba denah/.test(t)) {
    return chatActionSchema.parse({ kind: "ubah_denah", typology: null, seedBaru: true });
  }
  if (/opsi lain|alternatif lain|coba lain|yang lain/.test(t)) return chatActionSchema.parse({ kind: "opsi_lain" });
  if (/target|jual|margin|modal/.test(t) && /\d/.test(t)) {
    const amount = parseAmount();
    if (amount) {
      const jenis = /margin|untung/.test(t) ? "margin" : /modal|rap|biaya/.test(t) ? "modal" : "hargaJual";
      return chatActionSchema.parse({ kind: "target_harga", jenis, nilai: amount });
    }
  }
  if (/denah|layout|bentuk (rumah|bangunan)|tipe (l|u)\b|courtyard|linear/.test(t)) {
    const typology = /courtyard|halaman tengah/.test(t) ? "courtyard" : /\bbentuk l\b|tipe l|menyiku/.test(t) ? "L"
      : /\bbentuk u\b|tipe u\b/.test(t) ? "U" : /split|beda zona/.test(t) ? "split" : /linear|lurus|deret/.test(t) ? "linear" : null;
    return chatActionSchema.parse({ kind: "ubah_denah", typology, seedBaru: /lain|baru|acak|coba/.test(t) });
  }
  if (/tampak|fasad|gaya|minimalis|tropis|skandinavia|klasik|industrial|atap|kanopi|balkon|carport|roster/.test(t)) {
    return chatActionSchema.parse({ kind: "ubah_tampak", teks: raw.trim() });
  }
  const group = GROUP_WORDS.find(([re]) => re.test(t))?.[1];
  const level = LEVEL_WORDS.find(([re]) => re.test(t))?.[1];
  if (group && level) return chatActionSchema.parse({ kind: "ubah_spesifikasi", group, level });
  return chatActionSchema.parse({ kind: "tidak_dipahami", pesan: "Saya belum yakin. Coba: “naikkan lantai ke premium”, “denah bentuk L”, “tampak tropis atap limasan”, atau “target margin 60 juta”." });
}

/** Balasan AI hanya boleh menyebut angka yang diambil dari hasil engine. */
export function composeReply(action: ChatAction, facts: { total: number; rap: number; margin: number; marginPercent: number; p10: number; p90: number; completeness: number; rooms: number; area: number }): string {
  const rp = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;
  switch (action.kind) {
    case "jelaskan":
      if (action.topik === "rap") return `RAP (rencana anggaran proyek) ${rp(facts.rap)} = biaya langsung + tak langsung riil + kontingensi. Ini modal kerja, bukan harga jual.`;
      if (action.topik === "margin") return `Margin ${rp(facts.margin)} (${facts.marginPercent}%) = harga jual sebelum PPN dikurangi RAP.`;
      if (action.topik === "denah") return `Denah sekarang punya ${facts.rooms} ruang pada luas ${facts.area} m². Semua volume dinding, lantai, dan atap dihitung dari poligon denah ini.`;
      if (action.topik === "spesifikasi") return `Tingkat spesifikasi menentukan analisis yang dipakai tiap kelompok pekerjaan. Menggesernya langsung mengubah total ${rp(facts.total)}.`;
      if (action.topik === "optimizer") return "Optimizer menurunkan tingkat spesifikasi dari kelompok yang paling tidak terlihat lebih dulu, dan tidak pernah melewati batas aturan struktur.";
      if (action.topik === "kisaran") return `Kisaran P10–P90 ${rp(facts.p10)} – ${rp(facts.p90)} dari simulasi ketidakpastian harga, koefisien, dan volume. Semakin banyak data dikonfirmasi, semakin sempit.`;
      return `Total RAB ${rp(facts.total)} dihitung engine dari ${facts.rooms} ruang dan katalog analisis. Kelengkapan data ${facts.completeness}%.`;
    case "ubah_spesifikasi": return `Siap, saya ubah ${action.group} ke tingkat ${action.level}. Angka baru dihitung engine — lihat pratinjau lalu tekan Terapkan.`;
    case "ubah_denah": return action.seedBaru ? "Saya buat alternatif denah baru dari solver. Pilih salah satu, lalu Terapkan." : `Saya susun denah ${action.typology ?? "baru"} lewat solver. Koordinat ruangan selalu dari solver, bukan dari saya.`;
    case "ubah_tampak": return "Spesifikasi tampak saya perbarui dari kalimatmu. Model 3D dan item pekerjaan tampak ikut berubah.";
    case "target_harga": return `Target ${action.jenis === "hargaJual" ? "harga jual" : action.jenis === "margin" ? "margin" : "modal (RAP)"} ${rp(action.nilai)} dicatat. Buka Planner Harga untuk melihat langkah efisiensi dari optimizer.`;
    case "opsi_lain": return "Saya siapkan opsi lain: alternatif denah dan variasi tampak. Semuanya dihitung ulang engine.";
    default: return action.pesan;
  }
}

export { FACADE_STYLES };
