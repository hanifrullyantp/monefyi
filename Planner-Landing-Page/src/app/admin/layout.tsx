"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { isAuthenticated } from "@/lib/utils/auth";
import { Sidebar } from "@/components/admin/Sidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { useContentStore } from "@/lib/store/contentStore";
import { useLeadsStore } from "@/lib/store/leadsStore";

const pageTitles: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/global": "Global & Merek",
  "/admin/kontak": "Kontak & Sosial",
  "/admin/form": "Form Builder",
  "/admin/seo": "SEO & Tracking",
  "/admin/toast": "Notifikasi Toast",
  "/admin/faq": "FAQ",
  "/admin/footer": "Footer & Privasi",
  "/admin/konten": "Konten Landing Page",
  "/admin/konten-json": "Konten (JSON Editor)",
  "/admin/media": "Media Library",
  "/admin/crm": "CRM & Leads",
  "/admin/crm-template": "Template WhatsApp",
  "/admin/testimonial": "Testimonial",
  "/admin/pricing": "Pricing",
  "/admin/analytics": "Analytics",
  "/admin/settings": "Settings",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { load: loadContent } = useContentStore();
  const { load: loadLeads } = useLeadsStore();

  useEffect(() => {
    if (pathname === "/admin/login") {
      setChecked(true);
      return;
    }
    if (!isAuthenticated()) {
      router.replace("/admin/login");
      return;
    }
    loadContent();
    loadLeads();
    setChecked(true);
  }, [pathname, router, loadContent, loadLeads]);

  if (!checked) return null;
  if (pathname === "/admin/login") return <>{children}</>;

  const title = Object.entries(pageTitles).find(([key]) => pathname === key || pathname.startsWith(key + "/"))?.[1] ?? "Admin";

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader title={title} />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
