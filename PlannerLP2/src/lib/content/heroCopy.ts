/**
 * Copy hero per varian headline. Eksperimen (Fase 0) belum live —
 * ganti ACTIVE_HERO_VARIANT_ID saat A/B aktif. Jangan hardcode di komponen.
 */

export const FREE_PLAN_ENABLED = true;

export type HeroVariantId = "H1" | "H2" | "H3" | "H0";

export type HeroVariantCopy = {
  id: HeroVariantId;
  eyebrow: string;
  headline: string;
  subheadline: string;
  points: [string, string, string];
  ctaPrimary: string;
  ctaSecondary: string;
  loginLink: string;
  microcopyFree: string;
  microcopyGuarantee: string;
};

export const HERO_VARIANTS: Record<HeroVariantId, HeroVariantCopy> = {
  H1: {
    id: "H1",
    eyebrow: "Untuk kontraktor, interior & kitchen set",
    headline: "Kirim Penawaran Sebelum Kamu Pulang Survei",
    subheadline:
      "Hitung harga langsung di HP saat survei, lalu kirim PDF penawaran berlogo kamu sebelum klien sempat membandingkan dengan vendor lain.",
    points: [
      "Saring calon klien di WA, survei hanya yang serius",
      "Harga muncul dalam 1 menit, tanpa kalkulator",
      "PDF berlogo & bertanda tangan, langsung kirim ke WA",
    ],
    ctaPrimary: "Coba Gratis",
    ctaSecondary: "Demo 1 Menit",
    loginLink: "Sudah punya akun? Masuk",
    microcopyFree: "Tanpa kartu kredit · 3 estimasi gratis",
    microcopyGuarantee: "Sekali bayar · akses selamanya",
  },
  H2: {
    id: "H2",
    eyebrow: "Untuk kontraktor, interior & kitchen set",
    headline: "Berhenti Survei Klien yang Cuma Tanya-Tanya",
    subheadline:
      "Saring lewat WA dulu. Yang budgetnya cocok baru disurvei — hitung di lokasi, PDF keluar sebelum pulang.",
    points: [
      "Saring calon klien di WA, survei hanya yang serius",
      "Harga muncul dalam 1 menit, tanpa kalkulator",
      "PDF berlogo & bertanda tangan, langsung kirim ke WA",
    ],
    ctaPrimary: "Coba Gratis",
    ctaSecondary: "Demo 1 Menit",
    loginLink: "Sudah punya akun? Masuk",
    microcopyFree: "Tanpa kartu kredit · 3 estimasi gratis",
    microcopyGuarantee: "Sekali bayar · akses selamanya",
  },
  H3: {
    id: "H3",
    eyebrow: "Untuk kontraktor, interior & kitchen set",
    headline: "Dari Ukur di Lokasi ke PDF Penawaran dalam 1 Menit",
    subheadline:
      "Input ukuran di HP, pilih material, penawaran profesional siap dikirim ke WA klien.",
    points: [
      "Saring calon klien di WA, survei hanya yang serius",
      "Harga muncul dalam 1 menit, tanpa kalkulator",
      "PDF berlogo & bertanda tangan, langsung kirim ke WA",
    ],
    ctaPrimary: "Coba Gratis",
    ctaSecondary: "Demo 1 Menit",
    loginLink: "Sudah punya akun? Masuk",
    microcopyFree: "Tanpa kartu kredit · 3 estimasi gratis",
    microcopyGuarantee: "Sekali bayar · akses selamanya",
  },
  H0: {
    id: "H0",
    eyebrow: "Untuk kontraktor, interior & kitchen set",
    headline: 'Bisa Buat Estimasi Project Dalam 1 Menit, Mau?',
    subheadline: "Coba gratis 3 estimasi. Standard Rp 99.000 · Pro Rp 199.000 — sekali bayar.",
    points: [
      "Saring calon klien di WA, survei hanya yang serius",
      "Harga muncul dalam 1 menit, tanpa kalkulator",
      "PDF berlogo & bertanda tangan, langsung kirim ke WA",
    ],
    ctaPrimary: "Coba Gratis",
    ctaSecondary: "Demo 1 Menit",
    loginLink: "Sudah punya akun? Masuk",
    microcopyFree: "Tanpa kartu kredit · 3 estimasi gratis",
    microcopyGuarantee: "Sekali bayar · akses selamanya",
  },
};

/** Varian yang tampil di LP sampai eksperimen live. */
export const ACTIVE_HERO_VARIANT_ID: HeroVariantId = "H1";

export function getActiveHeroCopy(): HeroVariantCopy {
  return HERO_VARIANTS[ACTIVE_HERO_VARIANT_ID];
}

export function heroMicrocopy(): string {
  const copy = getActiveHeroCopy();
  return FREE_PLAN_ENABLED ? copy.microcopyFree : copy.microcopyGuarantee;
}
