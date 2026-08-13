import type { JenisAhliWaris } from "@/types/hitung-waris";

export interface AhliWarisInfo {
  jenis: JenisAhliWaris;
  namaDisplay: string;
  deskripsi: string;
  bagianDefault: string;
  kondisiMendapat: string;
  icon: string;
  maxJumlah?: number;
  minJumlah?: number;
}

export const AHLI_WARIS_INFO: Record<JenisAhliWaris, AhliWarisInfo> = {
  suami: {
    jenis: "suami",
    namaDisplay: "Suami",
    deskripsi: "Suami dari almarhumah",
    bagianDefault: "1/2 atau 1/4",
    kondisiMendapat:
      "1/2 jika tidak ada anak/cucu. 1/4 jika ada anak atau cucu.",
    icon: "👨",
    maxJumlah: 1,
    minJumlah: 1,
  },
  istri: {
    jenis: "istri",
    namaDisplay: "Istri",
    deskripsi: "Istri/istri-istri dari almarhum (maks 4)",
    bagianDefault: "1/4 atau 1/8",
    kondisiMendapat:
      "1/4 jika tidak ada anak/cucu. 1/8 jika ada anak atau cucu. Jika lebih dari satu istri, dibagi rata.",
    icon: "👩",
    maxJumlah: 4,
    minJumlah: 1,
  },
  anak_laki: {
    jenis: "anak_laki",
    namaDisplay: "Anak Laki-laki",
    deskripsi: "Anak laki-laki kandung dari almarhum",
    bagianDefault: "Ashabah (sisa)",
    kondisiMendapat:
      "Mendapat sisa setelah furudh. Jika bersama anak perempuan, perbandingan 2:1.",
    icon: "👦",
    minJumlah: 1,
  },
  anak_perempuan: {
    jenis: "anak_perempuan",
    namaDisplay: "Anak Perempuan",
    deskripsi: "Anak perempuan kandung dari almarhum",
    bagianDefault: "1/2 atau 2/3",
    kondisiMendapat:
      "1/2 jika satu dan tidak ada anak laki. 2/3 jika dua+ dan tidak ada anak laki. Jika ada anak laki, ikut ashabah dengan perbandingan 1:2.",
    icon: "👧",
    minJumlah: 1,
  },
  ayah: {
    jenis: "ayah",
    namaDisplay: "Ayah",
    deskripsi: "Ayah kandung dari almarhum",
    bagianDefault: "1/6 atau ashabah",
    kondisiMendapat:
      "1/6 jika ada anak/cucu laki. 1/6 + ashabah jika ada anak perempuan saja. Ashabah penuh jika tidak ada anak.",
    icon: "👴",
    maxJumlah: 1,
    minJumlah: 1,
  },
  ibu: {
    jenis: "ibu",
    namaDisplay: "Ibu",
    deskripsi: "Ibu kandung dari almarhum",
    bagianDefault: "1/6 atau 1/3",
    kondisiMendapat:
      "1/6 jika ada anak, cucu, atau 2+ saudara. 1/3 jika tidak ada anak/cucu dan hanya 0-1 saudara.",
    icon: "👵",
    maxJumlah: 1,
    minJumlah: 1,
  },
  kakek: {
    jenis: "kakek",
    namaDisplay: "Kakek (dari Ayah)",
    deskripsi: "Ayah dari ayah almarhum",
    bagianDefault: "Seperti ayah jika tidak ada ayah",
    kondisiMendapat: "Terhijab oleh ayah. Jika tidak ada ayah, berperan seperti ayah.",
    icon: "🧓",
    maxJumlah: 1,
    minJumlah: 1,
  },
  nenek_dari_ibu: {
    jenis: "nenek_dari_ibu",
    namaDisplay: "Nenek (dari Ibu)",
    deskripsi: "Ibu dari ibu almarhum",
    bagianDefault: "1/6",
    kondisiMendapat: "1/6 jika ibu tidak ada. Terhijab oleh ibu.",
    icon: "👵",
    maxJumlah: 1,
    minJumlah: 1,
  },
  nenek_dari_ayah: {
    jenis: "nenek_dari_ayah",
    namaDisplay: "Nenek (dari Ayah)",
    deskripsi: "Ibu dari ayah almarhum",
    bagianDefault: "1/6",
    kondisiMendapat: "1/6 jika ibu dan ayah tidak ada. Terhijab oleh ibu atau ayah.",
    icon: "👵",
    maxJumlah: 1,
    minJumlah: 1,
  },
  cucu_laki_dari_anak_laki: {
    jenis: "cucu_laki_dari_anak_laki",
    namaDisplay: "Cucu Laki-laki (dari Anak Laki)",
    deskripsi: "Anak laki-laki dari anak laki-laki almarhum",
    bagianDefault: "Ashabah (seperti anak laki jika tidak ada anak laki)",
    kondisiMendapat:
      "Berperan seperti anak laki-laki jika tidak ada anak laki-laki. Terhijab oleh anak laki-laki.",
    icon: "👦",
    minJumlah: 1,
  },
  cucu_perempuan_dari_anak_laki: {
    jenis: "cucu_perempuan_dari_anak_laki",
    namaDisplay: "Cucu Perempuan (dari Anak Laki)",
    deskripsi: "Anak perempuan dari anak laki-laki almarhum",
    bagianDefault: "1/2, 2/3, atau 1/6",
    kondisiMendapat:
      "1/2 jika satu dan tidak ada anak. 2/3 jika dua+ dan tidak ada anak. 1/6 sebagai pelengkap 2/3 jika ada satu anak perempuan. Terhijab oleh dua+ anak perempuan (kecuali ada cucu laki).",
    icon: "👧",
    minJumlah: 1,
  },
  saudara_kandung_laki: {
    jenis: "saudara_kandung_laki",
    namaDisplay: "Saudara Kandung Laki-laki",
    deskripsi: "Saudara laki-laki seibu seayah",
    bagianDefault: "Ashabah (sisa)",
    kondisiMendapat:
      "Mendapat sisa setelah furudh. Terhijab oleh anak laki, cucu laki, dan ayah.",
    icon: "🧑",
    minJumlah: 1,
  },
  saudara_kandung_perempuan: {
    jenis: "saudara_kandung_perempuan",
    namaDisplay: "Saudara Kandung Perempuan",
    deskripsi: "Saudara perempuan seibu seayah",
    bagianDefault: "1/2, 2/3, atau ashabah ma'al ghair",
    kondisiMendapat:
      "1/2 jika satu dan tidak ada anak laki. 2/3 jika dua+ dan tidak ada anak laki. Ashabah ma'al ghair bersama anak perempuan.",
    icon: "👩",
    minJumlah: 1,
  },
  saudara_sebapak_laki: {
    jenis: "saudara_sebapak_laki",
    namaDisplay: "Saudara Sebapak Laki-laki",
    deskripsi: "Saudara laki-laki seayah (beda ibu)",
    bagianDefault: "Ashabah (seperti saudara kandung laki)",
    kondisiMendapat:
      "Terhijab oleh saudara kandung laki-laki, anak laki, cucu laki, dan ayah.",
    icon: "🧑",
    minJumlah: 1,
  },
  saudara_sebapak_perempuan: {
    jenis: "saudara_sebapak_perempuan",
    namaDisplay: "Saudara Sebapak Perempuan",
    deskripsi: "Saudara perempuan seayah (beda ibu)",
    bagianDefault: "1/2, 2/3, 1/6, atau ashabah",
    kondisiMendapat:
      "Terhijab oleh saudara kandung (laki/perempuan dengan anak laki), anak laki, cucu laki, dan ayah.",
    icon: "👩",
    minJumlah: 1,
  },
  saudara_seibu_laki: {
    jenis: "saudara_seibu_laki",
    namaDisplay: "Saudara Seibu Laki-laki",
    deskripsi: "Saudara laki-laki seibu (beda ayah)",
    bagianDefault: "1/6 atau 1/3 bersama saudara seibu lainnya",
    kondisiMendapat:
      "1/6 jika hanya satu. 1/3 jika dua+, dibagi rata. Terhijab oleh anak, cucu, ayah, dan kakek.",
    icon: "🧑",
    minJumlah: 1,
  },
  saudara_seibu_perempuan: {
    jenis: "saudara_seibu_perempuan",
    namaDisplay: "Saudara Seibu Perempuan",
    deskripsi: "Saudara perempuan seibu (beda ayah)",
    bagianDefault: "1/6 atau 1/3 bersama saudara seibu lainnya",
    kondisiMendapat:
      "1/6 jika hanya satu. 1/3 jika dua+, dibagi rata dengan saudara seibu laki. Terhijab oleh anak, cucu, ayah, dan kakek.",
    icon: "👩",
    minJumlah: 1,
  },
};

export const WARNA_CHART: Record<string, string> = {
  suami: "#60a5fa",
  istri: "#a78bfa",
  anak_laki: "#34d399",
  anak_perempuan: "#6ee7b7",
  ayah: "#fbbf24",
  ibu: "#f59e0b",
  kakek: "#fb923c",
  nenek_dari_ibu: "#f97316",
  nenek_dari_ayah: "#ea580c",
  cucu_laki_dari_anak_laki: "#86efac",
  cucu_perempuan_dari_anak_laki: "#bbf7d0",
  saudara_kandung_laki: "#38bdf8",
  saudara_kandung_perempuan: "#7dd3fc",
  saudara_sebapak_laki: "#818cf8",
  saudara_sebapak_perempuan: "#a5b4fc",
  saudara_seibu_laki: "#c084fc",
  saudara_seibu_perempuan: "#d8b4fe",
};
