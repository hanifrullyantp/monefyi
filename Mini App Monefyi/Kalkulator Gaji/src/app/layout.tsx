import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kalkulator Gaji & PPh21 — Bonus Lite Monefyi",
  description:
    "Hitung take-home pay dan PPh21 TER dengan slip gaji otomatis. Versi Lite gratis — versi FULL terintegrasi termasuk paket Lifetime Monefyi (Rp 99.000).",
  keywords: [
    "kalkulator gaji",
    "pph21",
    "TER",
    "take home pay",
    "slip gaji",
    "bpjs",
    "monefyi",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="scroll-smooth">
      <body className="bg-slate-950 text-white antialiased">{children}</body>
    </html>
  );
}
