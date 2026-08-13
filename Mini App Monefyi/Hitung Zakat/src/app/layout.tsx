import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Kalkulator Zakat Lengkap 2026 | Zakat Penghasilan, Maal, Emas, Fitrah - Monefyi",
  description: "Hitung zakat dengan mudah dan akurat. 7 jenis zakat: penghasilan, maal, emas, perdagangan, pertanian, fitrah, investasi. Sesuai fatwa MUI. GRATIS.",
  keywords: ["zakat", "kalkulator zakat", "zakat penghasilan", "zakat maal", "zakat fitrah", "zakat emas", "nisab", "BAZNAS", "Indonesia"],
  authors: [{ name: "Monefyi" }],
  openGraph: {
    title: "Kalkulator Zakat Lengkap 2026 - Monefyi",
    description: "Hitung 7 jenis zakat dengan mudah dan akurat. Sesuai fatwa MUI. GRATIS.",
    type: "website",
    locale: "id_ID",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen flex flex-col bg-slate-950 text-white antialiased">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
