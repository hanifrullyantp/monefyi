import type { Metadata } from "next";
import "./globals.css";
import { MonefyiAppLayout } from "@/components/monefyi/MonefyiAppLayout";

export const metadata: Metadata = {
  title: "Kalkulator Gaji & PPh21 — Bonus Lite Monefyi",
  description:
    "Hitung take-home pay dan PPh21 TER dengan slip gaji otomatis. Login akun Monefyi wajib.",
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
      <body className="bg-slate-950 text-white antialiased">
        <MonefyiAppLayout>{children}</MonefyiAppLayout>
      </body>
    </html>
  );
}
