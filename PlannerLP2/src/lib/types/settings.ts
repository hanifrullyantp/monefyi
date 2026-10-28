// Tipe data untuk settings aplikasi

export interface SiteSettings {
  siteName: string;
  siteDescription: string;
  siteUrl: string;
  logo?: string;
  favicon?: string;
  primaryColor: string;
  secondaryColor: string;
  waNumber: string;
  waDefaultMessage: string;
  waFloatEnabled: boolean;
  /** Widget chat pojok kanan bawah (mobile/desktop). */
  liveChatEnabled: boolean;
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
  siteDescription: "Hitung harga & kirim PDF penawaran untuk jasa proyek",
  siteUrl: "https://estimator.monefyi.com",
  primaryColor: "#157F5F",
  secondaryColor: "#21AB7B",
  /** Isi nomor WA support nyata di admin — float disembunyikan jika kosong/palsu */
  waNumber: "",
  waDefaultMessage: "Halo, saya dari landing Estimator. Mau tanya paket Standard/Pro.",
  waFloatEnabled: false,
  liveChatEnabled: false,
  metaTitle: "Kirim Penawaran Sebelum Kamu Pulang Survei - Estimator",
  metaDescription:
    "Saring calon klien lewat WA, hitung harga di HP, kirim PDF penawaran sebelum pulang survei. Untuk kontraktor, interior, kitchen set & furniture custom.",
  maintenanceMode: false,
};
