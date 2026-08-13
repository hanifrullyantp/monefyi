import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kalkulator Bagi Hasil Islami — Monefyi",
  description:
    "Tentukan nisbah yang adil, berkah, dan sesuai syari'ah untuk kemitraan usaha Anda. Mudharabah, Musyarakah, Muzara'ah, Mukhabarah, dan Musaqah.",
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
      <body className="bg-slate-950 text-slate-300 antialiased font-inter">
        {children}
      </body>
    </html>
  );
}
