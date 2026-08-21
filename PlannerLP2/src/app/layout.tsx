import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Monefyi Estimator — Sistem Closing & Proyek untuk Jasa Proyek",
  description:
    "Saring lead WA, closing di tempat saat survei, dan kelola proyek sampai selesai. Sistem all-in-one untuk kontraktor, interior designer, kitchen set & furniture custom.",
  keywords:
    "sistem closing proyek, manajemen proyek kontraktor, interior designer app, kitchen set software, penawaran proyek",
  openGraph: {
    title: "Monefyi Estimator — Sistem Closing & Proyek",
    description: "All-in-one sistem untuk pelaku jasa proyek Indonesia",
    type: "website",
  },
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
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400;1,600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
