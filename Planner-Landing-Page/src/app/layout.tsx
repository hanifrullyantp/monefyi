import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Monefyi Estimator — Sistem Closing Profesional untuk Jasa Proyek",
  description:
    "Generate PDF penawaran profesional secara instan. Saring lead WA, beri penawaran saat survei, dan tingkatkan kepercayaan klien.",
  openGraph: {
    title: "Monefyi Planner",
    description: "Sistem closing dan project management untuk pelaku jasa proyek Indonesia.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400;1,500;1,600;1,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
