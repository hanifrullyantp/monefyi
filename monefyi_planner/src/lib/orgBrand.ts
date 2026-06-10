/** Warna identitas platform Monefyi — tidak boleh di-override owner */
export const MONEFYI_BRAND = {
  primary: '#10b981',
  accent: '#34d399',
  dark: '#059669',
} as const;

export const DEFAULT_ORG_BRAND = '#059669';

export interface OrgBrandPalette {
  primary: string;
  accent: string;
  dark: string;
  soft: string;
  softBorder: string;
  onPrimary: string;
}

function normalizeHex(hex: string): string | null {
  const raw = hex.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(raw)) {
    const c = raw.slice(1);
    return `#${c[0]}${c[0]}${c[1]}${c[1]}${c[2]}${c[2]}`.toLowerCase();
  }
  return null;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const n = normalizeHex(hex);
  if (!n) return null;
  return {
    r: parseInt(n.slice(1, 3), 16),
    g: parseInt(n.slice(3, 5), 16),
    b: parseInt(n.slice(5, 7), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map(v => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')}`;
}

function mixWithWhite(hex: string, whiteRatio: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return rgbToHex(
    rgb.r + (255 - rgb.r) * whiteRatio,
    rgb.g + (255 - rgb.g) * whiteRatio,
    rgb.b + (255 - rgb.b) * whiteRatio,
  );
}

function darken(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const f = 1 - amount;
  return rgbToHex(rgb.r * f, rgb.g * f, rgb.b * f);
}

function lighten(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return rgbToHex(
    rgb.r + (255 - rgb.r) * amount,
    rgb.g + (255 - rgb.g) * amount,
    rgb.b + (255 - rgb.b) * amount,
  );
}

function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function deriveOrgBrandPalette(hex?: string | null): OrgBrandPalette {
  const primary = normalizeHex(hex || '') || DEFAULT_ORG_BRAND;
  return {
    primary,
    accent: lighten(primary, 0.22),
    dark: darken(primary, 0.12),
    soft: mixWithWhite(primary, 0.9),
    softBorder: mixWithWhite(primary, 0.78),
    onPrimary: relativeLuminance(primary) > 0.55 ? '#0f172a' : '#ffffff',
  };
}

export function orgBrandCssVars(palette: OrgBrandPalette): Record<string, string> {
  return {
    '--org-primary': palette.primary,
    '--org-accent': palette.accent,
    '--org-dark': palette.dark,
    '--org-soft': palette.soft,
    '--org-soft-border': palette.softBorder,
    '--org-on-primary': palette.onPrimary,
  };
}

/** Warna sekunder PDF dari brand utama */
export function pdfColorsFromBrand(brandHex: string): { primary_color: string; accent_color: string } {
  const p = deriveOrgBrandPalette(brandHex);
  return { primary_color: p.primary, accent_color: p.accent };
}

/** Area yang owner boleh kustom warna */
export const ORG_BRAND_SURFACES = [
  { id: 'pdf', label: 'PDF estimasi / penawaran untuk customer', customizable: true },
  { id: 'nav', label: 'Menu aktif & tombol utama di aplikasi', customizable: true },
  { id: 'attendance', label: 'Portal absensi karyawan (check-in, progress)', customizable: true },
  { id: 'invite', label: 'Email undangan & halaman join perusahaan', customizable: true },
  { id: 'finance-pdf', label: 'Laporan keuangan PDF (mengikuti brand)', customizable: true },
] as const;

/** Area yang tetap identitas Monefyi */
export const MONEFYI_ONLY_SURFACES = [
  { id: 'logo', label: 'Logo & tulisan "Monefyi Planner" di sidebar' },
  { id: 'ai', label: 'Tombol Monefyi AI (assistant platform)' },
  { id: 'sync', label: 'Indikator status sinkronisasi (hijau/amber/merah sistem)' },
  { id: 'auth', label: 'Halaman login & landing sebelum masuk organisasi' },
] as const;
