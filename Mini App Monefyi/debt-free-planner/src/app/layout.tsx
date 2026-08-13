// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Debt Freedom Planner — Bonus Lite Monefyi",
  description:
    "Rencana bebas hutang dengan strategi Snowball atau Avalanche. Versi Lite gratis — versi FULL terintegrasi termasuk paket Lifetime Monefyi (Rp 99.000).",
  keywords: [
    "bebas hutang", "pelunasan hutang", "snowball", "avalanche", "keuangan pribadi",
    "cicilan", "bunga", "financial planning", "debt free",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="scroll-smooth">
      <body className="bg-slate-950 text-white antialiased">
        {children}
      </body>
    </html>
  );
}
