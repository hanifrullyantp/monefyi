// Tipe data untuk settings aplikasi

export interface SiteSettings {
  siteName: string;
  siteDescription: string;
  siteUrl: string;
  logo?: string;
  favicon?: string;
  primaryColor: string;
  secondaryColor: string;
  adminPassword: string;
  waNumber: string;
  waDefaultMessage: string;
  waFloatEnabled: boolean;
  googleAnalyticsId?: string;
  fbPixelId?: string;
  gtmId?: string;
  metaTitle: string;
  metaDescription: string;
  metaImage?: string;
  maintenanceMode: boolean;
  customCss?: string;
  customJs?: string;
}

export const defaultSettings: SiteSettings = {
  siteName: "Monefyi Estimator",
  siteDescription: "Sistem All-in-One untuk Pelaku Jasa Proyek",
  siteUrl: "https://monefyi.com",
  primaryColor: "#059669",
  secondaryColor: "#f59e0b",
  adminPassword: "monefyi2026",
  waNumber: "6281234567890",
  waDefaultMessage: "Halo, saya tertarik dengan Monefyi Estimator. Boleh minta info lebih lanjut?",
  waFloatEnabled: false,
  metaTitle: "Monefyi Estimator — Sistem Closing & Proyek untuk Jasa Proyek",
  metaDescription: "Saring lead WA, closing di tempat saat survei, dan kelola proyek sampai selesai. Sistem all-in-one untuk kontraktor, interior designer, kitchen set & furniture custom.",
  maintenanceMode: false,
};
