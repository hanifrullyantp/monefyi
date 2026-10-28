import type { Metadata, Viewport } from "next";
import { BRANDS } from "@/lib/brand/brand.config";
import "./globals.css";

const brand = BRANDS.estimator;

export const metadata: Metadata = {
  title: {
    default: "Kirim Penawaran Sebelum Kamu Pulang Survei - Estimator",
    template: "%s - Estimator",
  },
  description:
    "Saring calon klien lewat WA, hitung harga langsung di HP, kirim PDF penawaran berlogo kamu sebelum klien pindah ke vendor lain. Untuk kontraktor, interior, kitchen set & furniture custom.",
  keywords:
    "aplikasi estimasi harga proyek, penawaran PDF kontraktor, aplikasi kitchen set, estimasi interior designer, RAB di HP",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Estimator",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: brand.assets.faviconSvg, type: "image/svg+xml" },
      { url: brand.assets.favicon32, sizes: "32x32", type: "image/png" },
      { url: brand.assets.icon192, sizes: "192x192", type: "image/png" },
    ],
    apple: brand.assets.appleTouchIcon,
  },
  openGraph: {
    title: "Kirim Penawaran Sebelum Kamu Pulang Survei - Estimator",
    description:
      "Hitung harga di lokasi, kirim PDF penawaran profesional sebelum pulang survei.",
    type: "website",
    images: [{ url: brand.assets.ogImage, width: 1200, height: 630, alt: "Estimator" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Estimator — Penawaran PDF untuk jasa proyek",
    description: "Dari ukur di lokasi ke PDF penawaran dalam hitungan menit.",
    images: [brand.assets.ogImage],
  },
};

export const viewport: Viewport = {
  themeColor: brand.themeColor,
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <meta name="apple-mobile-web-app-title" content="Estimator" />
      </head>
      <body
        className="font-sans antialiased bg-[var(--bg)] text-[var(--ink)]"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
