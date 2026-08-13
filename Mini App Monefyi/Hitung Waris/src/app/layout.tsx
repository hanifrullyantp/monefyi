import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hitung Waris — Monefyi | Pembagian Warisan Sesuai Al-Qur'an & Sunnah",
  description:
    "Hitung pembagian harta warisan sesuai syari'ah Islam dengan dalil yang lengkap dan penjelasan yang mudah dipahami. Berdasarkan Ilmu Faraid.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400;1,700&family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-slate-950 text-slate-300 antialiased">{children}</body>
    </html>
  );
}
