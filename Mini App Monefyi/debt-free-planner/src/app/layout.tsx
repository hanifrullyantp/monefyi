// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { MonefyiAppLayout } from "@/components/monefyi/MonefyiAppLayout";

export const metadata: Metadata = {
  title: "Debt Freedom Planner — Bonus Lite Monefyi",
  description:
    "Rencana bebas hutang dengan strategi Snowball atau Avalanche. Versi Lite — login akun Monefyi wajib.",
  keywords: [
    "bebas hutang", "pelunasan hutang", "snowball", "avalanche", "keuangan pribadi",
    "cicilan", "bunga", "financial planning", "debt free", "monefyi",
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
        <MonefyiAppLayout>{children}</MonefyiAppLayout>
      </body>
    </html>
  );
}
