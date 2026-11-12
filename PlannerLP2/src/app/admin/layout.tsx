import type { Metadata } from "next";
import { AdminLayoutClient } from "@/components/admin/AdminLayoutClient";

export const metadata: Metadata = {
  title: "Admin & CRM - Monefyi",
  description: "Panel Admin & CRM Monefyi untuk kelola leads, transaksi Mayar, dan landing page langsung dari HP.",
  manifest: "/admin-manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Admin CRM",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/brand/admin/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/brand/admin/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/brand/admin/apple-touch-icon.png",
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
