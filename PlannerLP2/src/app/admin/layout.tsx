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
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
