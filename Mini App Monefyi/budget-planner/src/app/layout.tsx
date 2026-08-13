import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import { MonefyiAppLayout } from "@/components/monefyi/MonefyiAppLayout";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Budget Planner Auto Mode — Monefyi",
  description:
    "Masukkan penghasilan Anda. Kami atur alokasi terbaik berdasarkan metode budgeting yang telah terbukti.",
  keywords: ["budget planner", "budgeting", "keuangan", "monefyi", "50/30/20"],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" className={inter.variable}>
      <body className="bg-slate-950 text-slate-100 antialiased font-sans">
        <MonefyiAppLayout>{children}</MonefyiAppLayout>
      </body>
    </html>
  );
}
